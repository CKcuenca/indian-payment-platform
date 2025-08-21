const mongoose = require('mongoose');
require('dotenv').config();

// 测试内存管理服务
async function testMemoryManagement() {
  try {
    console.log('🧪 开始测试内存管理服务...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');
    
    // 测试内存管理服务
    const MemoryManager = require('../services/memory-manager');
    const memoryManager = new MemoryManager();
    
    console.log('\n📊 内存状态报告:');
    const memReport = memoryManager.getMemoryReport();
    console.log(JSON.stringify(memReport, null, 2));
    
    // 测试连接池优化服务
    console.log('\n🔧 测试连接池优化服务...');
    const ConnectionPoolOptimizer = require('../services/connection-pool-optimizer');
    const poolOptimizer = new ConnectionPoolOptimizer();
    
    console.log('\n📊 连接池状态报告:');
    const poolReport = poolOptimizer.getOptimizationReport();
    console.log(JSON.stringify(poolReport, null, 2));
    
    // 测试大对象记录
    console.log('\n📝 测试大对象记录...');
    memoryManager.recordLargeObject('test-object-1', 1024 * 1024, 'test'); // 1MB
    memoryManager.recordLargeObject('test-object-2', 2048 * 1024, 'test'); // 2MB
    
    console.log('\n📊 大对象统计:');
    const largeObjStats = memoryManager.getLargeObjectsStats();
    console.log(JSON.stringify(largeObjStats, null, 2));
    
    // 测试垃圾回收（如果可用）
    console.log('\n🧹 测试垃圾回收...');
    const gcResult = memoryManager.forceGarbageCollection();
    if (gcResult) {
      console.log('✅ 垃圾回收成功:', gcResult);
    } else {
      console.log('⚠️ 垃圾回收不可用，请使用 --expose-gc 启动参数');
    }
    
    // 测试内存泄漏检测
    console.log('\n🔍 测试内存泄漏检测...');
    console.log('等待30秒进行内存泄漏检测...');
    
    // 模拟内存使用
    const testObjects = [];
    for (let i = 0; i < 1000; i++) {
      testObjects.push(new Array(1000).fill('test'));
    }
    
    // 等待一段时间让内存管理服务检测
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    console.log('\n📊 最终内存状态:');
    const finalReport = memoryManager.getMemoryReport();
    console.log(JSON.stringify(finalReport, null, 2));
    
    // 清理测试对象
    testObjects.length = 0;
    
    console.log('\n✅ 内存管理服务测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已断开');
  }
}

// 运行测试
if (require.main === module) {
  testMemoryManagement();
}

module.exports = { testMemoryManagement };
