const express = require('express');
const router = express.Router();
const MemoryLeakDetector = require('../services/memory-leak-detector');
const V8Optimizer = require('../services/v8-optimizer');

let memoryLeakDetector = null;
let v8Optimizer = null;

// 初始化服务
const initializeServices = () => {
  if (!memoryLeakDetector) {
    try {
      memoryLeakDetector = new MemoryLeakDetector();
      console.log('✅ 内存泄漏检测器初始化成功');
    } catch (error) {
      console.error('❌ 内存泄漏检测器初始化失败:', error);
    }
  }
  
  if (!v8Optimizer) {
    try {
      v8Optimizer = new V8Optimizer();
      console.log('✅ V8优化器初始化成功');
    } catch (error) {
      console.error('❌ V8优化器初始化失败:', error);
    }
  }
  
  return { memoryLeakDetector, v8Optimizer };
};

// 获取综合内存优化报告
router.get('/comprehensive-report', (req, res) => {
  try {
    const services = initializeServices();
    if (!services.memoryLeakDetector || !services.v8Optimizer) {
      return res.status(500).json({
        success: false,
        error: '服务初始化失败'
      });
    }

    const leakReport = services.memoryLeakDetector.getLeakReport();
    const v8Report = services.v8Optimizer.getOptimizationReport();
    
    const comprehensiveReport = {
      timestamp: new Date(),
      memoryLeaks: leakReport,
      v8Optimization: v8Report,
      summary: {
        totalLeaks: leakReport.leaks.total,
        criticalAdvice: v8Report.summary.criticalAdvice,
        highPriorityAdvice: v8Report.summary.highPriorityAdvice,
        overallHealth: leakReport.leaks.total === 0 && v8Report.summary.criticalAdvice === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
      }
    };

    res.json({
      success: true,
      data: comprehensiveReport
    });
  } catch (error) {
    console.error('获取综合报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 执行综合内存优化
router.post('/comprehensive-optimization', async (req, res) => {
  try {
    const services = initializeServices();
    if (!services.memoryLeakDetector || !services.v8Optimizer) {
      return res.status(500).json({
        success: false,
        error: '服务初始化失败'
      });
    }

    const startTime = Date.now();
    
    // 1. 执行内存泄漏清理
    const leakCleanup = await services.memoryLeakDetector.autoCleanupLeaks();
    
    // 2. 执行V8优化
    const v8Optimization = await services.v8Optimizer.performV8Optimization();
    
    // 3. 等待优化生效
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. 获取优化后的状态
    const endTime = Date.now();
    const finalLeakReport = services.memoryLeakDetector.getLeakReport();
    const finalV8Report = services.v8Optimizer.getOptimizationReport();
    
    const result = {
      success: true,
      duration: endTime - startTime,
      leakCleanup,
      v8Optimization,
      finalState: {
        leaks: finalLeakReport.leaks,
        v8Stats: finalV8Report.v8Stats
      },
      summary: {
        leaksCleaned: leakCleanup.timers + leakCleanup.eventListeners + leakCleanup.dbSessions + leakCleanup.largeObjects,
        v8Optimized: v8Optimization.success,
        overallImprovement: finalLeakReport.leaks.total < leakCleanup.total || v8Optimization.success
      }
    };

    res.json(result);
  } catch (error) {
    console.error('执行综合优化失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  try {
    const services = initializeServices();
    const isHealthy = services.memoryLeakDetector && services.v8Optimizer;
    
    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        services: {
          memoryLeakDetector: !!services.memoryLeakDetector,
          v8Optimizer: !!services.v8Optimizer
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
