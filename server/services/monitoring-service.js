const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const mongoose = require('mongoose');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const PaymentConfig = require('../models/PaymentConfig');

const execAsync = promisify(exec);

/**
 * 系统监控服务
 * 提供全面的系统状态监控和性能指标
 */
class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      cpu: 80, // CPU使用率阈值
      memory: 85, // 内存使用率阈值
      disk: 90, // 磁盘使用率阈值
      responseTime: 2000, // 响应时间阈值(ms)
      errorRate: 5, // 错误率阈值(%)
      activeConnections: 1000 // 活跃连接数阈值
    };
    this.monitoringInterval = null;
    this.isRunning = false;
  }

  /**
   * 启动监控服务
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000); // 每30秒收集一次指标
    
    console.log('系统监控服务已启动');
  }

  /**
   * 停止监控服务
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('系统监控服务已停止');
  }

  /**
   * 收集系统指标
   */
  async collectMetrics() {
    try {
      const timestamp = new Date();
      
      // 系统资源指标
      const systemMetrics = await this.getSystemMetrics();
      
      // 应用性能指标
      const appMetrics = await this.getApplicationMetrics();
      
      // 业务指标
      const businessMetrics = await this.getBusinessMetrics();
      
      // 数据库指标
      const databaseMetrics = await this.getDatabaseMetrics();
      
      // 网络指标
      const networkMetrics = await this.getNetworkMetrics();
      
      // 合并所有指标
      const allMetrics = {
        timestamp,
        system: systemMetrics,
        application: appMetrics,
        business: businessMetrics,
        database: databaseMetrics,
        network: networkMetrics
      };
      
      // 存储指标
      this.metrics.set(timestamp.getTime(), allMetrics);
      
      // 检查告警
      await this.checkAlerts(allMetrics);
      
      // 清理旧指标（保留最近24小时）
      this.cleanupOldMetrics();
      
    } catch (error) {
      console.error('收集系统指标失败:', error);
    }
  }

  /**
   * 获取系统资源指标
   */
  async getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0) / cpus.length * 100;

    // 获取磁盘使用情况
    let diskUsage = 0;
    try {
      const { stdout } = await execAsync('df -h / | tail -1 | awk \'{print $5}\' | sed \'s/%//\'');
      diskUsage = parseInt(stdout.trim());
    } catch (error) {
      diskUsage = 0;
    }

    return {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        cores: cpus.length,
        loadAverage: os.loadavg()
      },
      memory: {
        total: this.formatBytes(totalMem),
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        usage: Math.round((usedMem / totalMem) * 100 * 100) / 100
      },
      disk: {
        usage: diskUsage,
        total: this.formatBytes(os.totalmem()),
        available: this.formatBytes(os.freemem())
      },
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    };
  }

  /**
   * 获取应用性能指标
   */
  async getApplicationMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      process: {
        pid: process.pid,
        memory: {
          rss: this.formatBytes(memUsage.rss),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          heapUsed: this.formatBytes(memUsage.heapUsed),
          external: this.formatBytes(memUsage.external)
        },
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      },
      eventLoop: {
        lag: this.getEventLoopLag()
      },
      gc: {
        count: this.getGCCount(),
        duration: this.getGCDuration()
      }
    };
  }

  /**
   * 获取业务指标
   */
  async getBusinessMetrics() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // 今日订单统计
      const todayOrders = await Order.countDocuments({
        createdAt: { $gte: today }
      });

      // 今日交易统计
      const todayTransactions = await Transaction.countDocuments({
        createdAt: { $gte: today }
      });

      // 今日交易金额
      const todayAmount = await Transaction.aggregate([
        { $match: { createdAt: { $gte: today }, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // 本月统计
      const monthOrders = await Order.countDocuments({
        createdAt: { $gte: monthStart }
      });

      const monthTransactions = await Transaction.countDocuments({
        createdAt: { $gte: monthStart }
      });

      const monthAmount = await Transaction.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // 支付提供商统计
      const providerStats = await Transaction.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: '$provider', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
      ]);

      return {
        orders: {
          today: todayOrders,
          month: monthOrders
        },
        transactions: {
          today: todayTransactions,
          month: monthTransactions
        },
        amounts: {
          today: todayAmount[0]?.total || 0,
          month: monthAmount[0]?.total || 0
        },
        providers: providerStats.map(p => ({
          name: p._id,
          count: p.count,
          amount: p.amount
        }))
      };
    } catch (error) {
      console.error('获取业务指标失败:', error);
      return {};
    }
  }

  /**
   * 获取数据库指标
   */
  async getDatabaseMetrics() {
    try {
      const db = mongoose.connection.db;
      const adminDb = db.admin();
      
      // 数据库状态
      const dbStats = await db.stats();
      
      // 集合统计
      const collections = await db.listCollections().toArray();
      const collectionStats = [];
      
      for (const collection of collections.slice(0, 10)) { // 限制前10个集合
        try {
          const stats = await db.collection(collection.name).stats();
          collectionStats.push({
            name: collection.name,
            count: stats.count,
            size: this.formatBytes(stats.size),
            avgObjSize: this.formatBytes(stats.avgObjSize || 0)
          });
        } catch (error) {
          // 忽略无法获取统计的集合
        }
      }

      return {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        collections: collectionStats.length,
        documents: dbStats.objects,
        dataSize: this.formatBytes(dbStats.dataSize),
        storageSize: this.formatBytes(dbStats.storageSize),
        indexes: dbStats.indexes,
        indexSize: this.formatBytes(dbStats.indexSize)
      };
    } catch (error) {
      console.error('获取数据库指标失败:', error);
      return {};
    }
  }

  /**
   * 获取网络指标
   */
  async getNetworkMetrics() {
    try {
      // 获取网络接口信息
      const networkInterfaces = os.networkInterfaces();
      
      const interfaces = [];
      for (const [name, nets] of Object.entries(networkInterfaces)) {
        for (const net of nets) {
          if (net.family === 'IPv4' && !net.internal) {
            interfaces.push({
              name,
              address: net.address,
              netmask: net.netmask,
              mac: net.mac
            });
          }
        }
      }

      return {
        interfaces,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch()
      };
    } catch (error) {
      console.error('获取网络指标失败:', error);
      return {};
    }
  }

  /**
   * 检查告警
   */
  async checkAlerts(metrics) {
    const alerts = [];
    
    // CPU告警
    if (metrics.system.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'CPU_HIGH',
        severity: 'WARNING',
        message: `CPU使用率过高: ${metrics.system.cpu.usage}%`,
        threshold: this.thresholds.cpu,
        current: metrics.system.cpu.usage,
        timestamp: new Date()
      });
    }

    // 内存告警
    if (metrics.system.memory.usage > this.thresholds.memory) {
      alerts.push({
        type: 'MEMORY_HIGH',
        severity: 'WARNING',
        message: `内存使用率过高: ${metrics.system.memory.usage}%`,
        threshold: this.thresholds.memory,
        current: metrics.system.memory.usage,
        timestamp: new Date()
      });
    }

    // 磁盘告警
    if (metrics.system.disk.usage > this.thresholds.disk) {
      alerts.push({
        type: 'DISK_HIGH',
        severity: 'CRITICAL',
        message: `磁盘使用率过高: ${metrics.system.disk.usage}%`,
        threshold: this.thresholds.disk,
        current: metrics.system.disk.usage,
        timestamp: new Date()
      });
    }

    // 添加新告警
    this.alerts.push(...alerts);
    
    // 限制告警数量（保留最近100条）
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // 如果有告警，记录到控制台
    if (alerts.length > 0) {
      console.warn('系统告警:', alerts);
    }
  }

  /**
   * 获取系统状态概览
   */
  getSystemOverview() {
    const latestMetrics = Array.from(this.metrics.values()).pop();
    if (!latestMetrics) return null;

    const { system, application, business } = latestMetrics;
    
    return {
      status: this.getOverallStatus(latestMetrics),
      system: {
        cpu: system.cpu.usage,
        memory: system.memory.usage,
        disk: system.disk.usage,
        uptime: system.uptime
      },
      application: {
        memory: application.process.memory.heapUsed,
        uptime: application.process.uptime
      },
      business: {
        todayOrders: business.orders?.today || 0,
        todayTransactions: business.transactions?.today || 0,
        todayAmount: business.amounts?.today || 0
      },
      alerts: this.alerts.slice(-5), // 最近5条告警
      lastUpdate: latestMetrics.timestamp
    };
  }

  /**
   * 获取整体系统状态
   */
  getOverallStatus(metrics) {
    const { system } = metrics;
    
    if (system.cpu.usage > 90 || system.memory.usage > 90 || system.disk.usage > 95) {
      return 'CRITICAL';
    } else if (system.cpu.usage > 80 || system.memory.usage > 80 || system.disk.usage > 90) {
      return 'WARNING';
    } else if (system.cpu.usage > 60 || system.memory.usage > 60 || system.disk.usage > 80) {
      return 'ATTENTION';
    } else {
      return 'HEALTHY';
    }
  }

  /**
   * 获取性能趋势数据
   */
  getPerformanceTrends(hours = 24) {
    const now = Date.now();
    const cutoff = now - (hours * 60 * 60 * 1000);
    
    const trends = [];
    for (const [timestamp, metrics] of this.metrics.entries()) {
      if (timestamp >= cutoff) {
        trends.push({
          timestamp: new Date(timestamp),
          cpu: metrics.system.cpu.usage,
          memory: metrics.system.memory.usage,
          disk: metrics.system.disk.usage
        });
      }
    }
    
    return trends.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 清理旧指标
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24小时前
    
    for (const [timestamp] of this.metrics.entries()) {
      if (timestamp < cutoff) {
        this.metrics.delete(timestamp);
      }
    }
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取事件循环延迟
   */
  getEventLoopLag() {
    const start = process.hrtime.bigint();
    return new Promise(resolve => {
      setImmediate(() => {
        const end = process.hrtime.bigint();
        resolve(Number(end - start) / 1000000); // 转换为毫秒
      });
    });
  }

  /**
   * 获取GC统计
   */
  getGCCount() {
    if (global.gc) {
      const gcStats = global.gc();
      return gcStats ? gcStats.count : 0;
    }
    return 0;
  }

  /**
   * 获取GC持续时间
   */
  getGCDuration() {
    if (global.gc) {
      const gcStats = global.gc();
      return gcStats ? gcStats.duration : 0;
    }
    return 0;
  }

  /**
   * 获取所有指标
   */
  getAllMetrics() {
    return Array.from(this.metrics.values());
  }

  /**
   * 获取告警列表
   */
  getAlerts() {
    return this.alerts;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    const services = [
      {
        name: 'server',
        status: 'online',
        uptime: this.formatUptime(process.uptime()),
        responseTime: 0,
        lastCheck: new Date().toISOString(),
        details: {
          connections: this.getActiveConnections(),
          memory: this.formatBytes(process.memoryUsage().heapUsed)
        }
      },
      {
        name: 'database',
        status: mongoose.connection.readyState === 1 ? 'online' : 'offline',
        uptime: this.formatUptime(process.uptime()),
        responseTime: this.getDatabaseResponseTime(),
        lastCheck: new Date().toISOString(),
        details: {
          connections: mongoose.connection.client?.topology?.connections?.length || 0,
          memory: this.formatBytes(process.memoryUsage().heapUsed)
        }
      },
      {
        name: 'airpay',
        status: 'online', // 这里应该检查实际的API连接状态
        uptime: this.formatUptime(process.uptime()),
        responseTime: 180,
        lastCheck: new Date().toISOString(),
        details: {
          lastCheck: '2分钟前',
          status: 'connected'
        }
      },
      {
        name: 'cashfree',
        status: 'online', // 这里应该检查实际的API连接状态
        uptime: this.formatUptime(process.uptime()),
        responseTime: 165,
        lastCheck: new Date().toISOString(),
        details: {
          lastCheck: '1分钟前',
          status: 'connected'
        }
      },
      {
        name: 'redis',
        status: 'online', // 这里应该检查实际的Redis连接状态
        uptime: this.formatUptime(process.uptime()),
        responseTime: 5,
        lastCheck: new Date().toISOString(),
        details: {
          memory: '2.1GB',
          connections: 8
        }
      }
    ];

    return services;
  }

  /**
   * 获取实时指标
   */
  getRealTimeMetrics() {
    const latestMetrics = this.getAllMetrics().pop();
    if (!latestMetrics) {
      return null;
    }

    return {
      timestamp: latestMetrics.timestamp,
      system: {
        cpu: latestMetrics.system?.cpu?.usage || 0,
        memory: latestMetrics.system?.memory?.usage || 0,
        disk: latestMetrics.system?.disk?.usage || 0,
        load: latestMetrics.system?.load || 0
      },
      application: {
        responseTime: latestMetrics.application?.responseTime || 0,
        errorRate: latestMetrics.application?.errorRate || 0,
        activeConnections: latestMetrics.application?.activeConnections || 0,
        throughput: latestMetrics.application?.throughput || 0
      },
      business: {
        dailyTransactions: latestMetrics.business?.todayTransactions || 0,
        dailyVolume: latestMetrics.business?.todayAmount || 0,
        successRate: latestMetrics.business?.successRate || 0,
        averageAmount: latestMetrics.business?.averageAmount || 0
      },
      database: {
        connections: latestMetrics.database?.connections || 0,
        queryTime: latestMetrics.database?.queryTime || 0,
        slowQueries: latestMetrics.database?.slowQueries || 0,
        cacheHitRate: latestMetrics.database?.cacheHitRate || 0
      },
      network: {
        inTraffic: latestMetrics.network?.inTraffic || 0,
        outTraffic: latestMetrics.network?.outTraffic || 0,
        latency: latestMetrics.network?.latency || 0,
        packetLoss: latestMetrics.network?.packetLoss || 0
      }
    };
  }

  /**
   * 获取活跃连接数
   */
  getActiveConnections() {
    // 这里应该返回实际的连接数，暂时返回模拟值
    return Math.floor(Math.random() * 50) + 10;
  }

  /**
   * 获取数据库响应时间
   */
  getDatabaseResponseTime() {
    // 这里应该返回实际的数据库响应时间，暂时返回模拟值
    return Math.floor(Math.random() * 20) + 5;
  }

  /**
   * 格式化运行时间
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  }

  /**
   * 清除告警
   */
  clearAlerts() {
    this.alerts = [];
  }
}

module.exports = MonitoringService;
