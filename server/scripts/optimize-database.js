const mongoose = require('mongoose');
require('dotenv').config();

/**
 * 数据库优化脚本
 * 创建必要的索引以提升查询性能
 */
async function optimizeDatabase() {
  try {
    console.log('开始数据库优化...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('数据库连接成功');

    // 1. 优化订单集合索引
    console.log('优化订单集合索引...');
    await createIndexSafely('orders', { merchantId: 1, createdAt: -1 });
    await createIndexSafely('orders', { orderId: 1 }, { unique: true });
    await createIndexSafely('orders', { status: 1, createdAt: -1 });
    await createIndexSafely('orders', { provider: 1, status: 1 });

    // 2. 优化交易集合索引
    console.log('优化交易集合索引...');
    await createIndexSafely('transactions', { merchantId: 1, createdAt: -1 });
    await createIndexSafely('transactions', { transactionId: 1 }, { unique: true });
    await createIndexSafely('transactions', { orderId: 1 });
    await createIndexSafely('transactions', { type: 1, status: 1, createdAt: -1 });

    // 3. 优化商户集合索引
    console.log('优化商户集合索引...');
    await createIndexSafely('merchants', { merchantId: 1 }, { unique: true });
    await createIndexSafely('merchants', { status: 1 });
    await createIndexSafely('merchants', { 'paymentConfig.provider': 1 });

    // 4. 优化用户集合索引 - 处理空值问题
    console.log('优化用户集合索引...');
    
    // 先清理空值数据
    await mongoose.connection.db.collection('users').updateMany(
      { email: null },
      { $unset: { email: "" } }
    );
    
    await createIndexSafely('users', { username: 1 }, { unique: true, sparse: true });
    await createIndexSafely('users', { email: 1 }, { unique: true, sparse: true });
    await createIndexSafely('users', { merchantId: 1, role: 1 });

    // 5. 优化日志集合索引
    console.log('优化日志集合索引...');
    await createIndexSafely('logs', { timestamp: -1 });
    await createIndexSafely('logs', { level: 1, timestamp: -1 });
    await createIndexSafely('logs', { merchantId: 1, timestamp: -1 });

    // 6. 创建TTL索引用于自动清理过期数据
    console.log('创建TTL索引...');
    
    // 清理30天前的日志
    await createIndexSafely('logs', { timestamp: 1 }, { 
      expireAfterSeconds: 30 * 24 * 60 * 60 // 30天
    });
    
    // 清理90天前的失败订单
    await createIndexSafely('orders', { 
      status: 1, 
      updatedAt: 1 
    }, { 
      partialFilterExpression: { status: { $in: ['FAILED', 'CANCELLED'] } },
      expireAfterSeconds: 90 * 24 * 60 * 60 // 90天
    });

    // 7. 获取索引信息
    console.log('获取索引信息...');
    const collections = ['orders', 'transactions', 'merchants', 'users', 'logs'];
    
    for (const collectionName of collections) {
      try {
        const indexes = await mongoose.connection.db.collection(collectionName).indexes();
        console.log(`\n${collectionName} 集合索引:`);
        indexes.forEach((index, i) => {
          console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } catch (error) {
        console.log(`\n${collectionName} 集合不存在或无法访问索引`);
      }
    }

    // 8. 分析集合统计信息
    console.log('\n分析集合统计信息...');
    for (const collectionName of collections) {
      try {
        const stats = await mongoose.connection.db.collection(collectionName).stats();
        console.log(`\n${collectionName}:`);
        console.log(`  文档数量: ${stats.count}`);
        console.log(`  存储大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  索引大小: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  平均文档大小: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
      } catch (error) {
        console.log(`\n${collectionName}: 集合不存在或无法访问统计信息`);
      }
    }

    // 9. 性能优化建议
    console.log('\n性能优化建议:');
    console.log('  - 定期运行此脚本以保持索引优化');
    console.log('  - 监控慢查询日志');
    console.log('  - 考虑添加复合索引以支持复杂查询');
    console.log('  - 定期清理过期数据以节省存储空间');

    console.log('\n数据库优化完成！');
    
  } catch (error) {
    console.error('数据库优化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

/**
 * 安全创建索引，处理重复键错误
 */
async function createIndexSafely(collectionName, indexSpec, options = {}) {
  try {
    await mongoose.connection.db.collection(collectionName).createIndex(
      indexSpec,
      { background: true, ...options }
    );
    console.log(`  ✓ 创建索引成功: ${collectionName} - ${JSON.stringify(indexSpec)}`);
  } catch (error) {
    if (error.code === 11000) {
      console.log(`  ⚠ 索引已存在: ${collectionName} - ${JSON.stringify(indexSpec)}`);
    } else {
      console.log(`  ✗ 创建索引失败: ${collectionName} - ${JSON.stringify(indexSpec)} - ${error.message}`);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  optimizeDatabase();
}

module.exports = optimizeDatabase; que dingquefu wdengwoa本地hueyjian c