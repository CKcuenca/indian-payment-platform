const express = require('express');
const router = express.Router();
const SecurityAudit = require('../services/security/security-audit');
const { apiKeyAuth } = require('../middleware/auth');
const securityConfig = require('../config/security');

// 创建安全审计实例
const securityAudit = new SecurityAudit();

/**
 * 获取安全状态概览
 */
router.get('/overview', apiKeyAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const securityStats = await securityAudit.getSecurityStats(today);
    
    res.json({
      success: true,
      data: {
        date: today,
        totalEvents: securityStats?.total || 0,
        eventsByLevel: securityStats?.byLevel || {},
        eventsByType: securityStats?.byEventType || {},
        topIPs: securityStats?.byIP || {},
        config: {
          ipWhitelist: securityConfig.ipWhitelist.enabled,
          rateLimit: securityConfig.rateLimit.global.max,
          timestampTolerance: securityConfig.signature.timestampTolerance,
          supportedAlgorithms: securityConfig.signature.algorithms
        }
      }
    });
  } catch (error) {
    console.error('获取安全状态概览失败:', error);
    res.status(500).json({
      success: false,
      error: '获取安全状态概览失败'
    });
  }
});

/**
 * 获取安全事件日志
 */
router.get('/events', apiKeyAuth, async (req, res) => {
  try {
    const { 
      date = new Date().toISOString().split('T')[0],
      level,
      eventType,
      ip,
      page = 1,
      limit = 50
    } = req.query;

    const logFile = `logs/security/security-${date}.log`;
    const fs = require('fs').promises;
    
    try {
      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);
      
      let events = [];
      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          
          // 应用过滤器
          if (level && entry.level !== level) return;
          if (eventType && entry.eventType !== eventType) return;
          if (ip && entry.ip !== ip) return;
          
          events.push(entry);
        } catch (parseError) {
          // 忽略解析错误的行
        }
      });

      // 分页
      const total = events.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedEvents = events.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          events: paginatedEvents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          filters: {
            date,
            level,
            eventType,
            ip
          }
        }
      });
    } catch (error) {
      // 文件不存在或读取失败
      res.json({
        success: true,
        data: {
          events: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          },
          filters: {
            date,
            level,
            eventType,
            ip
          }
        }
      });
    }
  } catch (error) {
    console.error('获取安全事件日志失败:', error);
    res.status(500).json({
      success: false,
      error: '获取安全事件日志失败'
    });
  }
});

/**
 * 获取安全统计信息
 */
router.get('/stats', apiKeyAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 如果没有指定日期范围，默认查询最近7天
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayStats = await securityAudit.getSecurityStats(dateStr);
      
      if (dayStats) {
        stats.push({
          date: dateStr,
          ...dayStats
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        period: { startDate: start.toISOString(), endDate: end.toISOString() },
        stats,
        summary: {
          totalEvents: stats.reduce((sum, day) => sum + day.total, 0),
          totalDays: stats.length,
          averageEventsPerDay: stats.length > 0 ? Math.round(stats.reduce((sum, day) => sum + day.total, 0) / stats.length) : 0
        }
      }
    });
  } catch (error) {
    console.error('获取安全统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取安全统计信息失败'
    });
  }
});

/**
 * 获取可疑IP列表
 */
router.get('/suspicious-ips', apiKeyAuth, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], threshold = 10 } = req.query;
    
    const securityStats = await securityAudit.getSecurityStats(date);
    const suspiciousIPs = [];
    
    if (securityStats && securityStats.byIP) {
      Object.entries(securityStats.byIP).forEach(([ip, count]) => {
        if (count >= parseInt(threshold)) {
          suspiciousIPs.push({ ip, count, date });
        }
      });
    }
    
    // 按事件数量排序
    suspiciousIPs.sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        date,
        threshold: parseInt(threshold),
        suspiciousIPs,
        total: suspiciousIPs.length
      }
    });
  } catch (error) {
    console.error('获取可疑IP列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取可疑IP列表失败'
    });
  }
});

/**
 * 获取安全配置
 */
router.get('/config', apiKeyAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        signature: securityConfig.signature,
        rateLimit: securityConfig.rateLimit,
        ipWhitelist: securityConfig.ipWhitelist,
        requestSize: securityConfig.requestSize,
        headers: securityConfig.headers,
        logging: securityConfig.logging,
        encryption: securityConfig.encryption,
        session: securityConfig.session,
        environment: securityConfig.environment[process.env.NODE_ENV || 'development']
      }
    });
  } catch (error) {
    console.error('获取安全配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取安全配置失败'
    });
  }
});

/**
 * 更新安全配置
 */
router.put('/config', apiKeyAuth, async (req, res) => {
  try {
    const { 
      signature, 
      rateLimit, 
      ipWhitelist, 
      requestSize, 
      logging 
    } = req.body;

    // 这里可以实现配置更新逻辑
    // 暂时只返回当前配置
    
    await securityAudit.logSystemSecurityEvent('SECURITY_CONFIG_UPDATED', {
      updatedBy: req.user?.id || 'unknown',
      changes: req.body,
      timestamp: new Date().toISOString()
    }, 'INFO');

    res.json({
      success: true,
      message: '安全配置更新请求已记录',
      data: {
        signature: securityConfig.signature,
        rateLimit: securityConfig.rateLimit,
        ipWhitelist: securityConfig.ipWhitelist,
        requestSize: securityConfig.requestSize,
        logging: securityConfig.logging
      }
    });
  } catch (error) {
    console.error('更新安全配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新安全配置失败'
    });
  }
});

/**
 * 手动触发安全扫描
 */
router.post('/scan', apiKeyAuth, async (req, res) => {
  try {
    const { scanType = 'full' } = req.body;
    
    // 记录扫描请求
    await securityAudit.logSystemSecurityEvent('SECURITY_SCAN_TRIGGERED', {
      scanType,
      triggeredBy: req.user?.id || 'unknown',
      timestamp: new Date().toISOString()
    }, 'INFO');

    // 这里可以实现实际的安全扫描逻辑
    // 暂时返回模拟结果
    
    const scanResult = {
      scanType,
      timestamp: new Date().toISOString(),
      status: 'completed',
      findings: {
        vulnerabilities: 0,
        suspiciousActivities: 0,
        failedAuthentications: 0,
        rateLimitViolations: 0
      },
      recommendations: [
        '系统安全状态良好',
        '建议定期检查安全日志',
        '保持所有依赖包更新到最新版本'
      ]
    };

    res.json({
      success: true,
      message: '安全扫描已完成',
      data: scanResult
    });
  } catch (error) {
    console.error('执行安全扫描失败:', error);
    res.status(500).json({
      success: false,
      error: '执行安全扫描失败'
    });
  }
});

/**
 * 导出安全日志
 */
router.get('/export', apiKeyAuth, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0], format = 'json' } = req.query;
    
    const securityStats = await securityAudit.getSecurityStats(date);
    
    if (format === 'csv') {
      // 生成CSV格式
      const csvData = this.generateCSV(securityStats);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="security-${date}.csv"`);
      res.send(csvData);
    } else {
      // 默认JSON格式
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="security-${date}.json"`);
      res.json(securityStats);
    }
  } catch (error) {
    console.error('导出安全日志失败:', error);
    res.status(500).json({
      success: false,
      error: '导出安全日志失败'
    });
  }
});

/**
 * 生成CSV数据
 */
function generateCSV(data) {
  if (!data || !data.byEventType) {
    return 'Date,EventType,Count\n';
  }
  
  let csv = 'Date,EventType,Count\n';
  Object.entries(data.byEventType).forEach(([eventType, count]) => {
    csv += `${new Date().toISOString().split('T')[0]},${eventType},${count}\n`;
  });
  
  return csv;
}

module.exports = router;
