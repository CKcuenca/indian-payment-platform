const express = require('express');
const router = express.Router();
const HeapOptimizer = require('../services/heap-optimizer');

let heapOptimizer = null;

// 初始化堆内存优化器
const initializeHeapOptimizer = () => {
  if (!heapOptimizer) {
    try {
      heapOptimizer = new HeapOptimizer();
      console.log('✅ 堆内存优化器初始化成功');
    } catch (error) {
      console.error('❌ 堆内存优化器初始化失败:', error);
    }
  }
  return heapOptimizer;
};

// 获取详细的堆内存报告
router.get('/report', (req, res) => {
  try {
    const optimizer = initializeHeapOptimizer();
    if (!optimizer) {
      return res.status(500).json({
        success: false,
        error: '堆内存优化器未初始化'
      });
    }

    const report = optimizer.getHeapReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('获取堆内存报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 执行堆内存优化
router.post('/optimize', async (req, res) => {
  try {
    const optimizer = initializeHeapOptimizer();
    if (!optimizer) {
      return res.status(500).json({
        success: false,
        error: '堆内存优化器未初始化'
      });
    }

    const result = await optimizer.performHeapOptimization();
    res.json({
      success: result.success,
      data: result,
      message: result.success ? '堆内存优化完成' : '堆内存优化失败'
    });
  } catch (error) {
    console.error('执行堆内存优化失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取优化建议
router.get('/suggestions', (req, res) => {
  try {
    const optimizer = initializeHeapOptimizer();
    if (!optimizer) {
      return res.status(500).json({
        success: false,
        error: '堆内存优化器未初始化'
      });
    }

    const suggestions = optimizer.getOptimizationSuggestions();
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('获取优化建议失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取对象跟踪信息
router.get('/object-tracking', (req, res) => {
  try {
    const optimizer = initializeHeapOptimizer();
    if (!optimizer) {
      return res.status(500).json({
        success: false,
        error: '堆内存优化器未初始化'
      });
    }

    const suspiciousObjects = optimizer.detectHeapLeakPatterns();
    const objectStats = {
      totalTracked: optimizer.objectTracker.size,
      suspiciousCount: suspiciousObjects.length,
      suspiciousObjects: suspiciousObjects.slice(0, 20) // 限制返回数量
    };

    res.json({
      success: true,
      data: objectStats
    });
  } catch (error) {
    console.error('获取对象跟踪信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 手动记录大对象
router.post('/track-object', (req, res) => {
  try {
    const { objectId, type, size, stack } = req.body;
    
    if (!objectId || !type || !size) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: objectId, type, size'
      });
    }

    const optimizer = initializeHeapOptimizer();
    if (!optimizer) {
      return res.status(500).json({
        success: false,
        error: '堆内存优化器未初始化'
      });
    }

    optimizer.trackObjectCreation(objectId, type, size, stack);
    
    res.json({
      success: true,
      message: '对象跟踪已记录'
    });
  } catch (error) {
    console.error('记录对象跟踪失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取堆内存趋势分析
router.get('/trends', (req, res) => {
  try {
    const optimizer = initializeHeapOptimizer();
    if (!optimizer) {
      return res.status(500).json({
        success: false,
        error: '堆内存优化器未初始化'
      });
    }

    const trends = optimizer.analyzeHeapTrends();
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('获取堆内存趋势失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取V8堆内存统计
router.get('/v8-stats', (req, res) => {
  try {
    const optimizer = initializeHeapOptimizer();
    if (!optimizer) {
      return res.status(500).json({
        success: false,
        error: '堆内存优化器未初始化'
      });
    }

    const heapInfo = optimizer.getDetailedHeapInfo();
    res.json({
      success: true,
      data: {
        v8: heapInfo.v8,
        spaces: heapInfo.spaces
      }
    });
  } catch (error) {
    console.error('获取V8堆内存统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 重置堆内存优化器
router.post('/reset', (req, res) => {
  try {
    heapOptimizer = null;
    const optimizer = initializeHeapOptimizer();
    
    res.json({
      success: true,
      message: '堆内存优化器已重置'
    });
  } catch (error) {
    console.error('重置堆内存优化器失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查
router.get('/health', (req, res) => {
  try {
    const optimizer = initializeHeapOptimizer();
    const isHealthy = optimizer && optimizer.optimizationStats;
    
    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        uptime: process.uptime()
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
