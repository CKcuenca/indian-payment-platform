const mongoose = require('mongoose');
const HeapOptimizer = require('../services/heap-optimizer');

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB连接成功');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
};

// 测试堆内存优化器
const testHeapOptimizer = async () => {
  console.log('\n🧪 开始测试堆内存优化器...');
  
  try {
    // 创建堆内存优化器实例
    const heapOptimizer = new HeapOptimizer();
    console.log('✅ 堆内存优化器创建成功');
    
    // 等待一段时间让优化器初始化
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 1. 测试获取详细堆内存信息
    console.log('\n📊 测试获取详细堆内存信息...');
    const heapInfo = heapOptimizer.getDetailedHeapInfo();
    console.log('堆内存信息:', {
      '堆使用率': `${heapInfo.basic.heapUsedPercent}%`,
      '堆已用': heapInfo.basic.heapUsed,
      '堆总量': heapInfo.basic.heapTotal,
      '外部内存': heapInfo.basic.external
    });
    
    // 2. 测试对象跟踪
    console.log('\n🎯 测试对象跟踪...');
    const testObjectId = 'test-obj-' + Date.now();
    heapOptimizer.trackObjectCreation(testObjectId, 'test', 1024, ['test-stack-1', 'test-stack-2']);
    console.log('✅ 测试对象跟踪创建成功');
    
    // 模拟对象访问
    heapOptimizer.trackObjectAccess(testObjectId);
    console.log('✅ 测试对象访问跟踪成功');
    
    // 3. 测试获取优化建议
    console.log('\n💡 测试获取优化建议...');
    const suggestions = heapOptimizer.getOptimizationSuggestions();
    console.log('优化建议数量:', suggestions.length);
    suggestions.forEach((suggestion, index) => {
      console.log(`建议 ${index + 1}: [${suggestion.priority}] ${suggestion.message}`);
    });
    
    // 4. 测试堆内存趋势分析
    console.log('\n📈 测试堆内存趋势分析...');
    // 等待一段时间让历史数据积累
    await new Promise(resolve => setTimeout(resolve, 5000));
    const trends = heapOptimizer.analyzeHeapTrends();
    if (trends) {
      console.log('堆内存趋势:', {
        '增长率': `${trends.growth.toFixed(2)}%`,
        '波动性': trends.volatility,
        '峰值使用': trends.peakUsage,
        '平均使用': trends.avgUsage
      });
    } else {
      console.log('⚠️ 趋势数据不足，需要更多时间积累');
    }
    
    // 5. 测试检测泄漏模式
    console.log('\n🔍 测试检测泄漏模式...');
    const suspiciousObjects = heapOptimizer.detectHeapLeakPatterns();
    console.log('可疑对象数量:', suspiciousObjects.length);
    
    // 6. 测试执行堆内存优化
    console.log('\n🔄 测试执行堆内存优化...');
    const optimizationResult = await heapOptimizer.performHeapOptimization();
    console.log('优化结果:', {
      '成功': optimizationResult.success,
      '优化项': optimizationResult.optimizations,
      '释放内存': optimizationResult.freedMemory,
      '耗时': optimizationResult.duration
    });
    
    // 7. 测试获取完整报告
    console.log('\n📋 测试获取完整报告...');
    const report = heapOptimizer.getHeapReport();
    console.log('报告生成成功:', {
      '时间戳': report.timestamp,
      '当前堆使用率': `${report.current.heapUsedPercent}%`,
      '跟踪对象数': report.objectTracking.totalTracked,
      '可疑对象数': report.objectTracking.suspiciousCount,
      '优化次数': report.optimization.stats.totalOptimizations
    });
    
    // 8. 测试记录更多对象以观察模式
    console.log('\n📝 测试记录更多对象...');
    for (let i = 0; i < 5; i++) {
      const objId = `test-obj-${i}-${Date.now()}`;
      const size = Math.floor(Math.random() * 10000) + 1000; // 1KB - 10KB
      heapOptimizer.trackObjectCreation(objId, `type-${i % 3}`, size, [`stack-${i}`]);
    }
    console.log('✅ 记录了5个测试对象');
    
    // 等待一段时间观察
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 再次检查报告
    const finalReport = heapOptimizer.getHeapReport();
    console.log('\n📊 最终报告:', {
      '跟踪对象数': finalReport.objectTracking.totalTracked,
      '泄漏模式数': Object.keys(finalReport.objectTracking.leakPatterns).length
    });
    
    console.log('\n🎉 堆内存优化器测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
};

// 主函数
const main = async () => {
  try {
    await connectDB();
    await testHeapOptimizer();
    
    // 等待一段时间观察自动优化
    console.log('\n⏳ 等待观察自动优化...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n✅ 所有测试完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 主函数执行失败:', error);
    process.exit(1);
  }
};

// 运行测试
main();
