const mongoose = require('mongoose');

// 简化的测试脚本，减少内存使用
const runSimpleTest = async () => {
  console.log('🚀 开始简化数据库优化测试...\n');
  
  try {
    // 连接数据库
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';
    await mongoose.connect(mongoURI, {
      maxPoolSize: 5,  // 减少连接池大小
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ MongoDB连接成功');
    
    // 测试基本功能
    console.log('\n🔧 测试基本功能...');
    
    // 1. 检查连接状态
    const connection = mongoose.connection;
    console.log('  连接状态:', connection.readyState === 1 ? '已连接' : '未连接');
    
    // 2. 检查模型
    const models = Object.keys(mongoose.models);
    console.log('  可用模型:', models.length > 0 ? models.join(', ') : '无');
    
    // 3. 简单的性能测试
    if (models.length > 0) {
      console.log('\n📊 简单性能测试...');
      
      // 测试查询性能
      const startTime = Date.now();
      try {
        // 尝试一个简单的查询
        const firstModel = mongoose.models[models[0]];
        const count = await firstModel.countDocuments().limit(1);
        const queryTime = Date.now() - startTime;
        console.log(`  查询 ${models[0]} 集合耗时: ${queryTime}ms`);
      } catch (error) {
        console.log(`  查询测试失败: ${error.message}`);
      }
    }
    
    console.log('\n✅ 简化测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 关闭连接
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行测试
if (require.main === module) {
  runSimpleTest();
}

module.exports = { runSimpleTest };
