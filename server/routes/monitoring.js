const express = require('express');
const { apiKeyAuth } = require('../middleware/auth');
const MonitoringService = require('../services/monitoring-service');

const router = express.Router();
const monitoringService = new MonitoringService();

// 启动监控服务
monitoringService.start();

/**
 * 获取系统概览
 * GET /api/monitoring/overview
 */
router.get('/overview', apiKeyAuth, async (req, res) => {
  try {
    const overview = monitoringService.getSystemOverview();
    
    if (!overview) {
      return res.status(503).json({
        success: false,
        error: '监控服务未就绪',
        code: 'MONITORING_NOT_READY'
      });
    }

    res.json({
      success: true,
      message: '获取系统概览成功',
      data: overview
    });

  } catch (error) {
    console.error('获取系统概览失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统概览失败',
      code: 'OVERVIEW_ERROR'
    });
  }
});

/**
 * 获取详细系统指标
 * GET /api/monitoring/metrics
 */
router.get('/metrics', apiKeyAuth, async (req, res) => {
  try {
    const { hours = 24, type } = req.query;
    const hoursNum = Math.min(168, Math.max(1, parseInt(hours))); // 限制1-168小时
    
    let metrics;
    if (type === 'trends') {
      metrics = monitoringService.getPerformanceTrends(hoursNum);
    } else {
      metrics = monitoringService.getAllMetrics();
    }

    res.json({
      success: true,
      message: '获取系统指标成功',
      data: {
        metrics,
        hours: hoursNum,
        count: metrics.length
      }
    });

  } catch (error) {
    console.error('获取系统指标失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统指标失败',
      code: 'METRICS_ERROR'
    });
  }
});

/**
 * 获取系统告警
 * GET /api/monitoring/alerts
 */
router.get('/alerts', apiKeyAuth, async (req, res) => {
  try {
    const { severity, limit = 50 } = req.query;
    let alerts = monitoringService.getAlerts();
    
    // 按严重程度过滤
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity.toUpperCase());
    }
    
    // 限制数量
    alerts = alerts.slice(-parseInt(limit));

    res.json({
      success: true,
      message: '获取系统告警成功',
      data: {
        alerts,
        count: alerts.length,
        total: monitoringService.getAlerts().length
      }
    });

  } catch (error) {
    console.error('获取系统告警失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统告警失败',
      code: 'ALERTS_ERROR'
    });
  }
});

/**
 * 清除告警
 * POST /api/monitoring/alerts/clear
 */
router.post('/alerts/clear', apiKeyAuth, async (req, res) => {
  try {
    monitoringService.clearAlerts();
    
    res.json({
      success: true,
      message: '告警已清除',
      data: {
        cleared: true,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('清除告警失败:', error);
    res.status(500).json({
      success: false,
      error: '清除告警失败',
      code: 'CLEAR_ALERTS_ERROR'
    });
  }
});

/**
 * 获取实时性能数据
 * GET /api/monitoring/realtime
 */
router.get('/realtime', apiKeyAuth, async (req, res) => {
  try {
    // 强制收集一次最新指标
    await monitoringService.collectMetrics();
    
    const realTimeMetrics = monitoringService.getRealTimeMetrics();
    
    res.json({
      success: true,
      message: '获取实时性能数据成功',
      data: realTimeMetrics
    });

  } catch (error) {
    console.error('获取实时性能数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取实时性能数据失败',
      code: 'REALTIME_ERROR'
    });
  }
});

/**
 * 获取服务状态
 * GET /api/monitoring/services
 */
router.get('/services', apiKeyAuth, async (req, res) => {
  try {
    const services = monitoringService.getServiceStatus();
    
    res.json({
      success: true,
      message: '获取服务状态成功',
      data: {
        services,
        count: services.length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('获取服务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取服务状态失败',
      code: 'SERVICES_ERROR'
    });
  }
});

/**
 * 获取系统健康状态
 * GET /api/monitoring/health
 */
router.get('/health', apiKeyAuth, async (req, res) => {
  try {
    const overview = monitoringService.getSystemOverview();
    const alerts = monitoringService.getAlerts();
    
    const healthStatus = {
      overall: overview?.status || 'UNKNOWN',
      system: {
        cpu: overview?.system?.cpu || 0,
        memory: overview?.system?.memory || 0,
        disk: overview?.system?.disk || 0
      },
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        warning: alerts.filter(a => a.severity === 'WARNING').length
      },
      timestamp: new Date()
    };

    res.json({
      success: true,
      message: '获取系统健康状态成功',
      data: healthStatus
    });

  } catch (error) {
    console.error('获取系统健康状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统健康状态失败',
      code: 'HEALTH_ERROR'
    });
  }
});

/**
 * 获取性能报告
 * GET /api/monitoring/report
 */
router.get('/report', apiKeyAuth, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    let hours = 24;
    
    switch (period) {
      case '1h': hours = 1; break;
      case '6h': hours = 6; break;
      case '12h': hours = 12; break;
      case '24h': hours = 24; break;
      case '7d': hours = 168; break;
      default: hours = 24;
    }

    const trends = monitoringService.getPerformanceTrends(hours);
    const alerts = monitoringService.getAlerts();
    const overview = monitoringService.getSystemOverview();

    // 计算统计信息
    const cpuValues = trends.map(t => t.cpu);
    const memoryValues = trends.map(t => t.memory);
    const diskValues = trends.map(t => t.disk);

    const report = {
      period,
      hours,
      summary: {
        status: overview?.status || 'UNKNOWN',
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length
      },
      performance: {
        cpu: {
          current: overview?.system?.cpu || 0,
          average: cpuValues.length > 0 ? (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2) : 0,
          max: Math.max(...cpuValues, 0),
          min: Math.min(...cpuValues, 0)
        },
        memory: {
          current: overview?.system?.memory || 0,
          average: memoryValues.length > 0 ? (memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length).toFixed(2) : 0,
          max: Math.max(...memoryValues, 0),
          min: Math.min(...memoryValues, 0)
        },
        disk: {
          current: overview?.system?.disk || 0,
          average: diskValues.length > 0 ? (diskValues.reduce((a, b) => a + b, 0) / diskValues.length).toFixed(2) : 0,
          max: Math.max(...diskValues, 0),
          min: Math.min(...diskValues, 0)
        }
      },
      trends: trends.slice(-20), // 最近20个数据点
      alerts: alerts.slice(-10), // 最近10条告警
      generatedAt: new Date()
    };

    res.json({
      success: true,
      message: '获取性能报告成功',
      data: report
    });

  } catch (error) {
    console.error('获取性能报告失败:', error);
    res.status(500).json({
      success: false,
      error: '获取性能报告失败',
      code: 'REPORT_ERROR'
    });
  }
});

/**
 * 更新监控阈值
 * PUT /api/monitoring/thresholds
 */
router.put('/thresholds', apiKeyAuth, async (req, res) => {
  try {
    const { cpu, memory, disk, responseTime, errorRate, activeConnections } = req.body;
    
    // 更新阈值
    if (cpu !== undefined) monitoringService.thresholds.cpu = Math.max(0, Math.min(100, cpu));
    if (memory !== undefined) monitoringService.thresholds.memory = Math.max(0, Math.min(100, memory));
    if (disk !== undefined) monitoringService.thresholds.disk = Math.max(0, Math.min(100, disk));
    if (responseTime !== undefined) monitoringService.thresholds.responseTime = Math.max(0, responseTime);
    if (errorRate !== undefined) monitoringService.thresholds.errorRate = Math.max(0, Math.min(100, errorRate));
    if (activeConnections !== undefined) monitoringService.thresholds.activeConnections = Math.max(0, activeConnections);

    res.json({
      success: true,
      message: '监控阈值更新成功',
      data: {
        thresholds: monitoringService.thresholds,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('更新监控阈值失败:', error);
    res.status(500).json({
      success: false,
      error: '更新监控阈值失败',
      code: 'THRESHOLDS_ERROR'
    });
  }
});

/**
 * 获取监控配置
 * GET /api/monitoring/config
 */
router.get('/config', apiKeyAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: '获取监控配置成功',
      data: {
        thresholds: monitoringService.thresholds,
        isRunning: monitoringService.isRunning,
        monitoringInterval: 30000, // 30秒
        dataRetention: '24h'
      }
    });

  } catch (error) {
    console.error('获取监控配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取监控配置失败',
      code: 'CONFIG_ERROR'
    });
  }
});

/**
 * 控制监控服务
 * POST /api/monitoring/control
 */
router.post('/control', apiKeyAuth, async (req, res) => {
  try {
    const { action } = req.body;
    
    switch (action) {
      case 'start':
        monitoringService.start();
        break;
      case 'stop':
        monitoringService.stop();
        break;
      case 'restart':
        monitoringService.stop();
        setTimeout(() => monitoringService.start(), 1000);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '无效的操作',
          code: 'INVALID_ACTION',
          allowed: ['start', 'stop', 'restart']
        });
    }

    res.json({
      success: true,
      message: `监控服务${action === 'start' ? '启动' : action === 'stop' ? '停止' : '重启'}成功`,
      data: {
        action,
        isRunning: monitoringService.isRunning,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('控制监控服务失败:', error);
    res.status(500).json({
      success: false,
      error: '控制监控服务失败',
      code: 'CONTROL_ERROR'
    });
  }
});

module.exports = router;
