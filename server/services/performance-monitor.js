const os = require('os');
const mongoose = require('mongoose');
const { getIndianTimeISO } = require('../utils/timeUtils');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      database: [],
      api: []
    };
    this.maxMetricsHistory = 100; // 保留最近100条记录
  }

  /**
   * 获取系统性能指标
   */
  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      timestamp: getIndianTimeISO(),
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: ((usedMem / totalMem) * 100).toFixed(2)
      },
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  /**
   * 获取数据库性能指标
   */
  async getDatabaseMetrics() {
    try {
      const db = mongoose.connection.db;
      const adminDb = db.admin();
      
      // 获取数据库状态
      const dbStats = await db.stats();
      const serverStatus = await adminDb.serverStatus();
      
      return {
        timestamp: getIndianTimeISO(),
        collections: dbStats.collections,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexes: dbStats.indexes,
        indexSize: dbStats.indexSize,
        connections: serverStatus.connections?.current || 0,
        activeConnections: serverStatus.connections?.active || 0,
        availableConnections: serverStatus.connections?.available || 0
      };
    } catch (error) {
      console.error('Error getting database metrics:', error);
      return {
        timestamp: getIndianTimeISO(),
        error: error.message
      };
    }
  }

  /**
   * 记录API性能指标
   */
  recordApiMetrics(endpoint, method, duration, statusCode, error = null) {
    const metric = {
      timestamp: getIndianTimeISO(),
      endpoint,
      method,
      duration,
      statusCode,
      error: error?.message || null
    };

    this.metrics.api.push(metric);
    
    // 保持历史记录在限制范围内
    if (this.metrics.api.length > this.maxMetricsHistory) {
      this.metrics.api.shift();
    }

    // 记录慢查询
    if (duration > 1000) { // 超过1秒的请求
      console.warn(`Slow API request: ${method} ${endpoint} took ${duration}ms`);
    }
  }

  /**
   * 获取性能报告
   */
  async getPerformanceReport() {
    const systemMetrics = this.getSystemMetrics();
    const dbMetrics = await this.getDatabaseMetrics();
    
    // 计算API统计
    const apiStats = this.calculateApiStats();
    
    return {
      timestamp: getIndianTimeISO(),
      system: systemMetrics,
      database: dbMetrics,
      api: apiStats,
      summary: {
        cpuUsage: systemMetrics.cpu.loadAverage[0],
        memoryUsage: systemMetrics.memory.usagePercent,
        avgResponseTime: apiStats.averageResponseTime,
        errorRate: apiStats.errorRate,
        totalRequests: apiStats.totalRequests
      }
    };
  }

  /**
   * 计算API统计信息
   */
  calculateApiStats() {
    const apiMetrics = this.metrics.api;
    
    if (apiMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0
      };
    }

    const totalRequests = apiMetrics.length;
    const totalDuration = apiMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    const errorCount = apiMetrics.filter(metric => metric.statusCode >= 400).length;
    const slowRequests = apiMetrics.filter(metric => metric.duration > 1000).length;

    return {
      totalRequests,
      averageResponseTime: Math.round(totalDuration / totalRequests),
      errorRate: ((errorCount / totalRequests) * 100).toFixed(2),
      slowRequests,
      recentRequests: apiMetrics.slice(-10) // 最近10个请求
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const systemMetrics = this.getSystemMetrics();
    const dbMetrics = await this.getDatabaseMetrics();
    
    const issues = [];
    
    // 检查CPU使用率
    if (systemMetrics.cpu.loadAverage[0] > 5) {
      issues.push('High CPU usage');
    }
    
    // 检查内存使用率
    if (parseFloat(systemMetrics.memory.usagePercent) > 90) {
      issues.push('High memory usage');
    }
    
    // 检查数据库连接
    if (dbMetrics.connections > 80) {
      issues.push('High database connections');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      metrics: {
        system: systemMetrics,
        database: dbMetrics
      }
    };
  }

  /**
   * 清理过期指标
   */
  cleanupOldMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    this.metrics.api = this.metrics.api.filter(
      metric => new Date(metric.timestamp) > oneHourAgo
    );
  }
}

// 创建单例实例
const performanceMonitor = new PerformanceMonitor();

// 定期清理过期指标
setInterval(() => {
  performanceMonitor.cleanupOldMetrics();
}, 60 * 60 * 1000); // 每小时清理一次

module.exports = performanceMonitor;
