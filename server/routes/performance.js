const express = require('express');
const router = express.Router();
const performanceMonitor = require('../services/performance-monitor');
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取系统性能报告
 */
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const report = await performanceMonitor.getPerformanceReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance report'
    });
  }
});

/**
 * 获取系统健康状态
 */
router.get('/health', async (req, res) => {
  try {
    const health = await performanceMonitor.healthCheck();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error getting health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health check'
    });
  }
});

/**
 * 获取系统指标
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const systemMetrics = performanceMonitor.getSystemMetrics();
    const dbMetrics = await performanceMonitor.getDatabaseMetrics();
    
    res.json({
      success: true,
      data: {
        system: systemMetrics,
        database: dbMetrics
      }
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

/**
 * 获取API性能统计
 */
router.get('/api-stats', authenticateToken, (req, res) => {
  try {
    const apiStats = performanceMonitor.calculateApiStats();
    res.json({
      success: true,
      data: apiStats
    });
  } catch (error) {
    console.error('Error getting API stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API stats'
    });
  }
});

module.exports = router;
