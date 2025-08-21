const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const { errorHandler } = require('../middleware/error-handler');

/**
 * 获取异常统计信息
 */
router.get('/stats', apiKeyAuth, async (req, res) => {
  try {
    const stats = errorHandler.getErrorStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('获取异常统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取异常统计信息失败'
    });
  }
});

/**
 * 获取系统健康状态
 */
router.get('/health', apiKeyAuth, async (req, res) => {
  try {
    const healthStatus = errorHandler.getHealthStatus();
    
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('获取系统健康状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统健康状态失败'
    });
  }
});

/**
 * 重置错误计数
 */
router.post('/reset', apiKeyAuth, async (req, res) => {
  try {
    errorHandler.resetErrorCounts();
    
    res.json({
      success: true,
      message: '错误计数已重置',
      data: {
        timestamp: new Date().toISOString(),
        resetBy: req.user?.id || 'unknown'
      }
    });
  } catch (error) {
    console.error('重置错误计数失败:', error);
    res.status(500).json({
      success: false,
      error: '重置错误计数失败'
    });
  }
});

/**
 * 手动触发恢复策略
 */
router.post('/recover', apiKeyAuth, async (req, res) => {
  try {
    const { errorType, context } = req.body;
    
    if (!errorType) {
      return res.status(400).json({
        success: false,
        error: '必须提供错误类型'
      });
    }

    // 创建模拟错误对象
    const mockError = new Error('Manual recovery trigger');
    mockError.name = errorType;
    
    // 执行恢复策略
    const recoveryResult = await errorHandler.handleError(
      mockError,
      context || {},
      errorType,
      'MEDIUM'
    );

    res.json({
      success: true,
      message: '恢复策略已执行',
      data: {
        recoveryResult,
        timestamp: new Date().toISOString(),
        triggeredBy: req.user?.id || 'unknown'
      }
    });
  } catch (error) {
    console.error('执行恢复策略失败:', error);
    res.status(500).json({
      success: false,
      error: '执行恢复策略失败'
    });
  }
});

/**
 * 获取恢复策略配置
 */
router.get('/recovery-strategies', apiKeyAuth, async (req, res) => {
  try {
    const strategies = errorHandler.recoveryStrategies;
    const alertThresholds = errorHandler.alertThresholds;
    
    res.json({
      success: true,
      data: {
        strategies: Object.fromEntries(strategies),
        alertThresholds: Object.fromEntries(alertThresholds),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取恢复策略配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取恢复策略配置失败'
    });
  }
});

/**
 * 更新恢复策略配置
 */
router.put('/recovery-strategies', apiKeyAuth, async (req, res) => {
  try {
    const { strategies, alertThresholds } = req.body;
    
    // 更新恢复策略
    if (strategies) {
      for (const [key, strategy] of Object.entries(strategies)) {
        errorHandler.recoveryStrategies.set(key, strategy);
      }
    }
    
    // 更新告警阈值
    if (alertThresholds) {
      for (const [severity, threshold] of Object.entries(alertThresholds)) {
        errorHandler.alertThresholds.set(severity, threshold);
      }
    }
    
    res.json({
      success: true,
      message: '恢复策略配置已更新',
      data: {
        updatedStrategies: strategies ? Object.keys(strategies) : [],
        updatedThresholds: alertThresholds ? Object.keys(alertThresholds) : [],
        timestamp: new Date().toISOString(),
        updatedBy: req.user?.id || 'unknown'
      }
    });
  } catch (error) {
    console.error('更新恢复策略配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新恢复策略配置失败'
    });
  }
});

/**
 * 获取异常趋势分析
 */
router.get('/trends', apiKeyAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const trends = [];
    
    // 模拟趋势数据（实际实现中可以从日志文件或数据库获取）
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 模拟每日错误数量
      const dailyErrors = Math.floor(Math.random() * 20);
      
      trends.push({
        date: dateStr,
        totalErrors: dailyErrors,
        errorsByType: {
          SYSTEM: Math.floor(dailyErrors * 0.3),
          DATABASE: Math.floor(dailyErrors * 0.2),
          NETWORK: Math.floor(dailyErrors * 0.2),
          PAYMENT: Math.floor(dailyErrors * 0.15),
          VALIDATION: Math.floor(dailyErrors * 0.15)
        },
        errorsBySeverity: {
          LOW: Math.floor(dailyErrors * 0.5),
          MEDIUM: Math.floor(dailyErrors * 0.3),
          HIGH: Math.floor(dailyErrors * 0.15),
          CRITICAL: Math.floor(dailyErrors * 0.05)
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        trends,
        period: `${days} days`,
        summary: {
          totalDays: trends.length,
          averageErrorsPerDay: Math.round(trends.reduce((sum, day) => sum + day.totalErrors, 0) / trends.length),
          maxErrorsInDay: Math.max(...trends.map(day => day.totalErrors)),
          minErrorsInDay: Math.min(...trends.map(day => day.totalErrors))
        }
      }
    });
  } catch (error) {
    console.error('获取异常趋势分析失败:', error);
    res.status(500).json({
      success: false,
      error: '获取异常趋势分析失败'
    });
  }
});

/**
 * 导出异常报告
 */
router.get('/export', apiKeyAuth, async (req, res) => {
  try {
    const { format = 'json', days = 7 } = req.query;
    
    const stats = errorHandler.getErrorStats();
    const healthStatus = errorHandler.getHealthStatus();
    
    const report = {
      exportInfo: {
        timestamp: new Date().toISOString(),
        exportedBy: req.user?.id || 'unknown',
        period: `${days} days`,
        format
      },
      systemInfo: {
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.version
      },
      errorStats: stats,
      healthStatus: healthStatus
    };
    
    if (format === 'csv') {
      // 生成CSV格式
      const csvData = generateCSVReport(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="error-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      // 默认JSON格式
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="error-report-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(report);
    }
  } catch (error) {
    console.error('导出异常报告失败:', error);
    res.status(500).json({
      success: false,
      error: '导出异常报告失败'
    });
  }
});

/**
 * 生成CSV报告
 * @param {Object} report - 报告数据
 * @returns {string} CSV格式的报告
 */
function generateCSVReport(report) {
  let csv = 'Category,Field,Value\n';
  
  // 系统信息
  csv += 'System,Environment,' + (report.systemInfo.environment || 'N/A') + '\n';
  csv += 'System,Uptime,' + (report.systemInfo.uptime || 'N/A') + '\n';
  csv += 'System,NodeVersion,' + (report.systemInfo.version || 'N/A') + '\n';
  
  // 健康状态
  csv += 'Health,Status,' + (report.healthStatus.status || 'N/A') + '\n';
  csv += 'Health,TotalErrors,' + (report.errorStats.totalErrors || 0) + '\n';
  
  // 错误统计
  if (report.errorStats.errorCounts) {
    for (const [errorType, severities] of Object.entries(report.errorStats.errorCounts)) {
      for (const [severity, count] of Object.entries(severities)) {
        csv += `Errors,${errorType}_${severity},${count}\n`;
      }
    }
  }
  
  return csv;
}

/**
 * 系统诊断
 */
router.post('/diagnose', apiKeyAuth, async (req, res) => {
  try {
    const { diagnosticType = 'full' } = req.body;
    
    const diagnosis = await performSystemDiagnosis(diagnosticType);
    
    res.json({
      success: true,
      message: '系统诊断完成',
      data: {
        diagnosticType,
        diagnosis,
        timestamp: new Date().toISOString(),
        performedBy: req.user?.id || 'unknown'
      }
    });
  } catch (error) {
    console.error('执行系统诊断失败:', error);
    res.status(500).json({
      success: false,
      error: '执行系统诊断失败'
    });
  }
});

/**
 * 执行系统诊断
 * @param {string} diagnosticType - 诊断类型
 * @returns {Object} 诊断结果
 */
async function performSystemDiagnosis(diagnosticType) {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    type: diagnosticType,
    results: {}
  };
  
  try {
    // 内存诊断
    const memoryUsage = process.memoryUsage();
    diagnosis.results.memory = {
      status: memoryUsage.heapUsed > 500 * 1024 * 1024 ? 'WARNING' : 'OK',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
    };
    
    // 进程诊断
    diagnosis.results.process = {
      status: 'OK',
      pid: process.pid,
      uptime: Math.round(process.uptime()) + 's',
      version: process.version,
      platform: process.platform
    };
    
    // 环境诊断
    diagnosis.results.environment = {
      status: 'OK',
      nodeEnv: process.env.NODE_ENV || 'development',
      timezone: process.env.TZ || 'UTC',
      memoryLimit: process.env.NODE_OPTIONS || 'Not set'
    };
    
    // 错误统计诊断
    const errorStats = errorHandler.getErrorStats();
    diagnosis.results.errors = {
      status: errorStats.totalErrors > 100 ? 'WARNING' : 'OK',
      totalErrors: errorStats.totalErrors,
      isRecoveryMode: errorStats.isRecoveryMode,
      criticalErrors: errorStats.errorCounts.SYSTEM?.[ErrorSeverity.CRITICAL] || 0
    };
    
    // 总体状态
    const hasWarnings = Object.values(diagnosis.results).some(result => result.status === 'WARNING');
    const hasErrors = Object.values(diagnosis.results).some(result => result.status === 'ERROR');
    
    if (hasErrors) {
      diagnosis.overallStatus = 'ERROR';
    } else if (hasWarnings) {
      diagnosis.overallStatus = 'WARNING';
    } else {
      diagnosis.overallStatus = 'OK';
    }
    
    // 建议
    diagnosis.recommendations = generateDiagnosticRecommendations(diagnosis.results);
    
  } catch (error) {
    diagnosis.overallStatus = 'ERROR';
    diagnosis.error = error.message;
  }
  
  return diagnosis;
}

/**
 * 生成诊断建议
 * @param {Object} results - 诊断结果
 * @returns {Array} 建议列表
 */
function generateDiagnosticRecommendations(results) {
  const recommendations = [];
  
  if (results.memory?.status === 'WARNING') {
    recommendations.push('内存使用较高，建议检查内存泄漏或增加内存限制');
  }
  
  if (results.errors?.status === 'WARNING') {
    recommendations.push('错误数量较多，建议检查错误日志和系统稳定性');
  }
  
  if (results.errors?.isRecoveryMode) {
    recommendations.push('系统处于恢复模式，建议等待恢复完成或手动干预');
  }
  
  if (results.errors?.criticalErrors > 0) {
    recommendations.push('存在严重错误，建议立即检查系统状态');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('系统状态良好，建议继续保持');
  }
  
  return recommendations;
}

module.exports = router;
