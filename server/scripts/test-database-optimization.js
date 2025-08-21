const mongoose = require('mongoose');
const DatabaseOptimizer = require('../services/database-optimizer');
const QueryOptimizer = require('../services/query-optimizer');

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';
    await mongoose.connect(mongoURI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 5000,
      maxConnecting: 2,
      serverSelectionTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true
    });
    console.log('✅ MongoDB连接成功');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    process.exit(1);
  }
};

// 测试数据库优化器
const testDatabaseOptimizer = async () => {
  console.log('\n🔧 测试数据库优化器...');
  
  try {
    const optimizer = new DatabaseOptimizer();
    
    // 测试连接池状态
    console.log('📊 获取连接池状态...');
    const poolStatus = await optimizer.getConnectionPoolStatus();
    console.log('连接池状态:', poolStatus);
    
    // 测试查询性能分析
    console.log('📈 分析查询性能...');
    const performance = await optimizer.analyzeQueryPerformance();
    console.log('查询性能分析:', JSON.stringify(performance, null, 2));
    
    // 测试过期数据清理
    console.log('🧹 清理过期数据...');
    const cleanup = await optimizer.cleanupExpiredData();
    console.log('过期数据清理结果:', cleanup);
    
    console.log('✅ 数据库优化器测试完成');
    return true;
  } catch (error) {
    console.error('❌ 数据库优化器测试失败:', error.message);
    return false;
  }
};

// 测试查询优化器
const testQueryOptimizer = async () => {
  console.log('\n🚀 测试查询优化器...');
  
  try {
    const optimizer = new QueryOptimizer();
    
    // 测试缓存功能
    console.log('💾 测试缓存功能...');
    const cacheKey = 'test:orders:recent';
    const testData = { orders: [], total: 0 };
    
    // 第一次查询（缓存未命中）
    const result1 = await optimizer.cachedQuery(cacheKey, async () => {
      console.log('  执行查询函数...');
      return testData;
    });
    console.log('  第一次查询结果:', result1);
    
    // 第二次查询（缓存命中）
    const result2 = await optimizer.cachedQuery(cacheKey, async () => {
      console.log('  执行查询函数...');
      return { orders: [], total: 0, cached: true };
    });
    console.log('  第二次查询结果:', result2);
    
    // 测试缓存统计
    const cacheStats = optimizer.getCacheStats();
    console.log('  缓存统计:', cacheStats);
    
    // 测试优化订单查询
    console.log('📋 测试优化订单查询...');
    const ordersResult = await optimizer.getOrdersOptimized({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: -1
    });
    console.log('  优化订单查询结果:', {
      ordersCount: ordersResult.orders.length,
      pagination: ordersResult.pagination
    });
    
    // 测试优化聚合查询
    console.log('📊 测试优化聚合查询...');
    const statsResult = await optimizer.getOrderStatsOptimized({
      groupBy: 'day'
    });
    console.log('  优化聚合查询结果:', {
      statsCount: statsResult.length,
      sampleData: statsResult[0]
    });
    
    // 测试批量查询
    console.log('🔄 测试批量查询...');
    const batchQueries = [
      {
        key: 'batch:orders:recent',
        queryFn: async () => ({ type: 'recent', count: 100 }),
        ttl: 60000
      },
      {
        key: 'batch:orders:success',
        queryFn: async () => ({ type: 'success', count: 85 }),
        ttl: 60000
      }
    ];
    
    const batchResult = await optimizer.batchQueryOptimized(batchQueries);
    console.log('  批量查询结果:', batchResult);
    
    // 测试查询性能监控
    console.log('⏱️ 测试查询性能监控...');
    const monitoredResult = await optimizer.monitorQueryPerformance(
      'test:performance:query',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 模拟查询延迟
        return { data: 'test result' };
      }
    );
    console.log('  性能监控结果:', {
      result: monitoredResult.result,
      performance: monitoredResult.performance
    });
    
    // 测试优化建议
    console.log('💡 获取优化建议...');
    const suggestions = optimizer.getQueryOptimizationSuggestions();
    console.log('  优化建议:', suggestions);
    
    console.log('✅ 查询优化器测试完成');
    return true;
  } catch (error) {
    console.error('❌ 查询优化器测试失败:', error.message);
    return false;
  }
};

// 测试索引优化
const testIndexOptimization = async () => {
  console.log('\n🔍 测试索引优化...');
  
  try {
    const optimizer = new DatabaseOptimizer();
    
    // 测试索引优化
    console.log('📚 优化数据库索引...');
    const indexResults = await optimizer.optimizeIndexes();
    console.log('  索引优化结果:', {
      Order: indexResults.Order ? `${indexResults.Order.indexesCount} 个索引` : '未找到模型',
      Transaction: indexResults.Transaction ? `${indexResults.Transaction.indexesCount} 个索引` : '未找到模型',
      Merchant: indexResults.Merchant ? `${indexResults.Merchant.indexesCount} 个索引` : '未找到模型',
      User: indexResults.User ? `${indexResults.User.indexesCount} 个索引` : '未找到模型'
    });
    
    console.log('✅ 索引优化测试完成');
    return true;
  } catch (error) {
    console.error('❌ 索引优化测试失败:', error.message);
    return false;
  }
};

// 测试连接池优化
const testConnectionPoolOptimization = async () => {
  console.log('\n🔌 测试连接池优化...');
  
  try {
    const optimizer = new DatabaseOptimizer();
    
    // 测试连接池优化
    console.log('⚙️ 优化连接池配置...');
    const poolResults = await optimizer.optimizeConnectionPool();
    console.log('  连接池优化结果:', {
      oldConfig: poolResults.oldConfig,
      newConfig: poolResults.newConfig
    });
    
    console.log('✅ 连接池优化测试完成');
    return true;
  } catch (error) {
    console.error('❌ 连接池优化测试失败:', error.message);
    return false;
  }
};

// 主测试函数
const runTests = async () => {
  console.log('🚀 开始数据库优化功能测试...\n');
  
  try {
    // 连接数据库
    await connectDB();
    
    // 运行各项测试
    const results = {
      databaseOptimizer: await testDatabaseOptimizer(),
      queryOptimizer: await testQueryOptimizer(),
      indexOptimization: await testIndexOptimization(),
      connectionPoolOptimization: await testConnectionPoolOptimization()
    };
    
    // 输出测试结果摘要
    console.log('\n📋 测试结果摘要:');
    console.log('=====================================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? '通过' : '失败'}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log('=====================================');
    console.log(`总计: ${passedTests}/${totalTests} 项测试通过`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试都通过了！');
    } else {
      console.log('⚠️ 部分测试失败，请检查错误信息');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
