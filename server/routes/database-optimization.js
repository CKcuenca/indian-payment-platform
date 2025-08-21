const express = require('express');
const { body, query, validationResult } = require('express-validator');
const DatabaseOptimizer = require('../services/database-optimizer');
const QueryOptimizer = require('../services/query-optimizer');
const { apiKeyAuth } = require('../middleware/auth');

const router = express.Router();
const databaseOptimizer = new DatabaseOptimizer();
const queryOptimizer = new QueryOptimizer();

// 应用API密钥认证中间件
router.use(apiKeyAuth);

/**
 * @route GET /api/database-optimization/status
 * @desc 获取数据库优化状态
 * @access Private
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date(),
      connectionStatus: 'connected',
      indexes: await databaseOptimizer.getConnectionPoolStatus(),
      cache: queryOptimizer.getCacheStats()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/database-optimization/optimize-indexes
 * @desc 优化数据库索引
 * @access Private
 */
router.post('/optimize-indexes', async (req, res) => {
  try {
    const results = await databaseOptimizer.optimizeIndexes();
    
    res.json({
      success: true,
      message: '数据库索引优化完成',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/database-optimization/optimize-connection-pool
 * @desc 优化连接池配置
 * @access Private
 */
router.post('/optimize-connection-pool', async (req, res) => {
  try {
    const results = await databaseOptimizer.optimizeConnectionPool();
    
    res.json({
      success: true,
      message: '连接池配置优化完成',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/database-optimization/performance-report
 * @desc 获取数据库性能报告
 * @access Private
 */
router.get('/performance-report', async (req, res) => {
  try {
    const report = await databaseOptimizer.getPerformanceReport();
    
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

/**
 * @route POST /api/database-optimization/cleanup-expired-data
 * @desc 清理过期数据
 * @access Private
 */
router.post('/cleanup-expired-data', async (req, res) => {
  try {
    const results = await databaseOptimizer.cleanupExpiredData();
    
    res.json({
      success: true,
      message: '过期数据清理完成',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/database-optimization/query-performance
 * @desc 分析查询性能
 * @access Private
 */
router.get('/query-performance', async (req, res) => {
  try {
    const results = await databaseOptimizer.analyzeQueryPerformance();
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/database-optimization/orders-optimized
 * @desc 使用优化查询获取订单
 * @access Private
 */
router.post('/orders-optimized', [
  body('filters').optional().isObject(),
  body('options').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const { filters = {}, options = {} } = req.body;
    
    const result = await queryOptimizer.getOrdersOptimized(filters, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/database-optimization/order-stats-optimized
 * @desc 使用优化聚合查询获取订单统计
 * @access Private
 */
router.post('/order-stats-optimized', [
  body('filters').optional().isObject(),
  body('groupBy').optional().isIn(['hour', 'day', 'month'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const { filters = {} } = req.body;
    
    const result = await queryOptimizer.getOrderStatsOptimized(filters);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/database-optimization/batch-query
 * @desc 批量查询优化
 * @access Private
 */
router.post('/batch-query', [
  body('queries').isArray().notEmpty(),
  body('queries.*.key').isString().notEmpty(),
  body('queries.*.queryFn').isString().notEmpty(),
  body('queries.*.ttl').optional().isInt({ min: 1000, max: 3600000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const { queries } = req.body;
    
    // 将字符串查询函数转换为实际函数
    const processedQueries = queries.map(query => ({
      ...query,
      queryFn: eval(query.queryFn) // 注意：在生产环境中应该使用更安全的方法
    }));
    
    const result = await queryOptimizer.batchQueryOptimized(processedQueries);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/database-optimization/cache-stats
 * @desc 获取缓存统计信息
 * @access Private
 */
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = queryOptimizer.getCacheStats();
    
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

/**
 * @route POST /api/database-optimization/clear-cache
 * @desc 清理缓存
 * @access Private
 */
router.post('/clear-cache', [
  body('pattern').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const { pattern } = req.body;
    
    queryOptimizer.clearCache(pattern);
    
    res.json({
      success: true,
      message: pattern ? `按模式清理缓存完成: ${pattern}` : '所有缓存清理完成'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/database-optimization/optimization-suggestions
 * @desc 获取优化建议
 * @access Private
 */
router.get('/optimization-suggestions', async (req, res) => {
  try {
    const suggestions = queryOptimizer.getQueryOptimizationSuggestions();
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/database-optimization/monitor-query
 * @desc 监控查询性能
 * @access Private
 */
router.post('/monitor-query', [
  body('queryName').isString().notEmpty(),
  body('queryFn').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        details: errors.array()
      });
    }

    const { queryName, queryFn } = req.body;
    
    // 将字符串查询函数转换为实际函数
    const actualQueryFn = eval(queryFn); // 注意：在生产环境中应该使用更安全的方法
    
    const result = await queryOptimizer.monitorQueryPerformance(queryName, actualQueryFn);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
