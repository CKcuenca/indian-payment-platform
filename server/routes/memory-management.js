const express = require('express');
const router = express.Router();
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

// 内存管理服务实例
let memoryManager = null;
let connectionPoolOptimizer = null;

// 初始化服务
function initializeServices() {
  try {
    if (!memoryManager) {
      const MemoryManager = require('../services/memory-manager');
      memoryManager = new MemoryManager();
    }
    
    if (!connectionPoolOptimizer) {
      const ConnectionPoolOptimizer = require('../services/connection-pool-optimizer');
      connectionPoolOptimizer = new ConnectionPoolOptimizer();
    }
  } catch (error) {
    console.error('❌ 初始化内存管理服务失败:', error);
  }
}

// 获取内存状态
router.get('/status', async (req, res) => {
  try {
    initializeServices();
    
    if (!memoryManager) {
      return res.status(500).json({
        success: false,
        error: '内存管理服务未初始化'
      });
    }

    const report = memoryManager.getMemoryReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取连接池状态
router.get('/connection-pool', async (req, res) => {
  try {
    initializeServices();
    
    if (!connectionPoolOptimizer) {
      return res.status(500).json({
        success: false,
        error: '连接池优化服务未初始化'
      });
    }

    const report = connectionPoolOptimizer.getOptimizationReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 强制垃圾回收
router.post('/force-gc', async (req, res) => {
  try {
    initializeServices();
    
    if (!memoryManager) {
      return res.status(500).json({
        success: false,
        error: '内存管理服务未初始化'
      });
    }

    const result = memoryManager.forceGarbageCollection();
    
    if (result) {
      res.json({
        success: true,
        data: result,
        message: '垃圾回收完成'
      });
    } else {
      res.status(400).json({
        success: false,
        error: '垃圾回收不可用，请使用 --expose-gc 启动参数'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 清理大对象
router.post('/cleanup-large-objects', async (req, res) => {
  try {
    initializeServices();
    
    if (!memoryManager) {
      return res.status(500).json({
        success: false,
        error: '内存管理服务未初始化'
      });
    }

    // 触发大对象清理
    memoryManager.cleanupLargeObjects();
    
    const stats = memoryManager.getLargeObjectsStats();
    
    res.json({
      success: true,
      data: stats,
      message: '大对象清理完成'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 优化连接池
router.post('/optimize-connection-pool', async (req, res) => {
  try {
    initializeServices();
    
    if (!connectionPoolOptimizer) {
      return res.status(500).json({
        success: false,
        error: '连接池优化服务未初始化'
      });
    }

    const result = await connectionPoolOptimizer.optimizeConnectionPool();
    
    res.json({
      success: true,
      data: result,
      message: '连接池优化完成'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取内存优化建议
router.get('/optimization-suggestions', async (req, res) => {
  try {
    initializeServices();
    
    let suggestions = [];
    
    if (memoryManager) {
      const memSuggestions = memoryManager.getMemoryOptimizationSuggestions();
      suggestions = suggestions.concat(memSuggestions);
    }
    
    if (connectionPoolOptimizer) {
      const poolSuggestions = connectionPoolOptimizer.getOptimizationSuggestions();
      suggestions = suggestions.concat(poolSuggestions);
    }
    
    res.json({
      success: true,
      data: {
        total: suggestions.length,
        suggestions: suggestions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 记录大对象
router.post('/record-large-object', [
  body('key').notEmpty().withMessage('对象键不能为空'),
  body('size').isInt({ min: 1 }).withMessage('对象大小必须是正整数'),
  body('type').optional().isString().withMessage('对象类型必须是字符串')
], validateRequest, async (req, res) => {
  try {
    initializeServices();
    
    if (!memoryManager) {
      return res.status(500).json({
        success: false,
        error: '内存管理服务未初始化'
      });
    }

    const { key, size, type = 'unknown' } = req.body;
    
    memoryManager.recordLargeObject(key, size, type);
    
    res.json({
      success: true,
      data: {
        key,
        size,
        type,
        message: '大对象记录成功'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取大对象统计
router.get('/large-objects-stats', async (req, res) => {
  try {
    initializeServices();
    
    if (!memoryManager) {
      return res.status(500).json({
        success: false,
        error: '内存管理服务未初始化'
      });
    }

    const stats = memoryManager.getLargeObjectsStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取完整的内存管理报告
router.get('/full-report', async (req, res) => {
  try {
    initializeServices();
    
    let report = {
      timestamp: new Date().toISOString(),
      services: {
        memoryManager: false,
        connectionPoolOptimizer: false
      }
    };
    
    if (memoryManager) {
      report.services.memoryManager = true;
      report.memory = memoryManager.getMemoryReport();
    }
    
    if (connectionPoolOptimizer) {
      report.services.connectionPoolOptimizer = true;
      report.connectionPool = connectionPoolOptimizer.getOptimizationReport();
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 重启内存管理服务
router.post('/restart', async (req, res) => {
  try {
    // 停止现有服务
    if (memoryManager) {
      memoryManager.stop();
      memoryManager = null;
    }
    
    if (connectionPoolOptimizer) {
      connectionPoolOptimizer.stop();
      connectionPoolOptimizer = null;
    }
    
    // 重新初始化
    initializeServices();
    
    res.json({
      success: true,
      message: '内存管理服务重启成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
