const v8 = require('v8');
const os = require('os');

class MemoryLeakDetector {
  constructor() {
    this.timers = new Map();
    this.eventListeners = new Map();
    this.dbSessions = new Map();
    this.largeObjects = new Map();
    this.leakThreshold = 5 * 60 * 1000; // 5分钟
    this.cleanupInterval = 60000; // 1分钟
    this.detectionInterval = 30000; // 30秒
    
    this.startDetection();
  }

  // 注册定时器
  registerTimer(id, interval, callback) {
    const timerId = setInterval(callback, interval);
    this.timers.set(id, {
      timerId,
      interval,
      callback: callback.toString(),
      createdAt: Date.now(),
      lastAccess: Date.now()
    });
    return timerId;
  }

  // 清理定时器
  clearTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer.timerId);
      this.timers.delete(id);
      return true;
    }
    return false;
  }

  // 注册事件监听器
  registerEventListener(id, event, listener) {
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, []);
    }
    this.eventListeners.get(id).push({
      event,
      listener: listener.toString(),
      createdAt: Date.now(),
      lastAccess: Date.now()
    });
  }

  // 清理事件监听器
  clearEventListener(id) {
    return this.eventListeners.delete(id);
  }

  // 注册数据库会话
  registerDbSession(id, session) {
    this.dbSessions.set(id, {
      session,
      createdAt: Date.now(),
      lastAccess: Date.now()
    });
  }

  // 清理数据库会话
  clearDbSession(id) {
    const sessionInfo = this.dbSessions.get(id);
    if (sessionInfo) {
      try {
        if (sessionInfo.session && typeof sessionInfo.session.endSession === 'function') {
          sessionInfo.session.endSession();
        }
        this.dbSessions.delete(id);
        return true;
      } catch (error) {
        console.error('清理数据库会话失败:', error);
        return false;
      }
    }
    return false;
  }

  // 注册大对象
  registerLargeObject(id, size, type, metadata = {}) {
    this.largeObjects.set(id, {
      size,
      type,
      metadata,
      createdAt: Date.now(),
      lastAccess: Date.now()
    });
  }

  // 清理大对象
  clearLargeObject(id) {
    return this.largeObjects.delete(id);
  }

  // 检测内存泄漏
  detectMemoryLeaks() {
    const now = Date.now();
    const leaks = {
      timers: [],
      eventListeners: [],
      dbSessions: [],
      largeObjects: []
    };

    // 检测长时间运行的定时器
    for (const [id, timer] of this.timers.entries()) {
      const age = now - timer.createdAt;
      const lastAccessAge = now - timer.lastAccess;
      
      if (age > this.leakThreshold || lastAccessAge > this.leakThreshold) {
        leaks.timers.push({
          id,
          age: age,
          lastAccessAge: lastAccessAge,
          interval: timer.interval,
          callback: timer.callback.substring(0, 100) + '...'
        });
      }
    }

    // 检测长时间未清理的事件监听器
    for (const [id, listeners] of this.eventListeners.entries()) {
      for (const listener of listeners) {
        const age = now - listener.createdAt;
        const lastAccessAge = now - listener.lastAccess;
        
        if (age > this.leakThreshold || lastAccessAge > this.leakThreshold) {
          leaks.eventListeners.push({
            id,
            event: listener.event,
            age: age,
            lastAccessAge: lastAccessAge,
            listener: listener.listener.substring(0, 100) + '...'
          });
        }
      }
    }

    // 检测长时间未关闭的数据库会话
    for (const [id, sessionInfo] of this.dbSessions.entries()) {
      const age = now - sessionInfo.createdAt;
      const lastAccessAge = now - sessionInfo.lastAccess;
      
      if (age > this.leakThreshold || lastAccessAge > this.leakThreshold) {
        leaks.dbSessions.push({
          id,
          age: age,
          lastAccessAge: lastAccessAge
        });
      }
    }

    // 检测长时间未清理的大对象
    for (const [id, obj] of this.largeObjects.entries()) {
      const age = now - obj.createdAt;
      const lastAccessAge = now - obj.lastAccess;
      
      if (age > this.leakThreshold || lastAccessAge > this.leakThreshold) {
        leaks.largeObjects.push({
          id,
          type: obj.type,
          size: obj.size,
          age: age,
          lastAccessAge: lastAccessAge
        });
      }
    }

    return leaks;
  }

  // 自动清理泄漏
  async autoCleanupLeaks() {
    const leaks = this.detectMemoryLeaks();
    const cleanupResults = {
      timers: 0,
      eventListeners: 0,
      dbSessions: 0,
      largeObjects: 0,
      errors: []
    };

    try {
      // 清理泄漏的定时器
      for (const leak of leaks.timers) {
        if (this.clearTimer(leak.id)) {
          cleanupResults.timers++;
        }
      }

      // 清理泄漏的事件监听器
      for (const leak of leaks.eventListeners) {
        if (this.clearEventListener(leak.id)) {
          cleanupResults.eventListeners++;
        }
      }

      // 清理泄漏的数据库会话
      for (const leak of leaks.dbSessions) {
        if (this.clearDbSession(leak.id)) {
          cleanupResults.dbSessions++;
        }
      }

      // 清理泄漏的大对象
      for (const leak of leaks.largeObjects) {
        if (this.clearLargeObject(leak.id)) {
          cleanupResults.largeObjects++;
        }
      }

    } catch (error) {
      cleanupResults.errors.push(error.message);
    }

    return cleanupResults;
  }

  // 获取内存使用统计
  getMemoryStats() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    return {
      process: {
        rss: this.formatBytes(memUsage.rss),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        external: this.formatBytes(memUsage.external),
        heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100
      },
      v8: {
        heapSizeLimit: this.formatBytes(heapStats.heap_size_limit),
        totalAvailableSize: this.formatBytes(heapStats.total_available_size),
        usedHeapSize: this.formatBytes(heapStats.used_heap_size),
        heapUsedPercent: Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 10000) / 100
      },
      tracking: {
        timers: this.timers.size,
        eventListeners: this.eventListeners.size,
        dbSessions: this.dbSessions.size,
        largeObjects: this.largeObjects.size
      }
    };
  }

  // 获取泄漏报告
  getLeakReport() {
    const leaks = this.detectMemoryLeaks();
    const stats = this.getMemoryStats();
    
    return {
      timestamp: new Date(),
      memoryStats: stats,
      leaks: {
        total: leaks.timers.length + leaks.eventListeners.length + leaks.dbSessions.length + leaks.largeObjects.length,
        timers: leaks.timers.length,
        eventListeners: leaks.eventListeners.length,
        dbSessions: leaks.dbSessions.length,
        largeObjects: leaks.largeObjects.length
      },
      details: leaks,
      recommendations: this.getRecommendations(leaks)
    };
  }

  // 获取优化建议
  getRecommendations(leaks) {
    const recommendations = [];

    if (leaks.timers.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'TIMER_LEAK',
        message: `发现 ${leaks.timers.length} 个长时间运行的定时器`,
        action: '清理泄漏的定时器'
      });
    }

    if (leaks.dbSessions.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        type: 'DB_SESSION_LEAK',
        message: `发现 ${leaks.dbSessions.length} 个未关闭的数据库会话`,
        action: '立即关闭数据库会话'
      });
    }

    if (leaks.largeObjects.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'LARGE_OBJECT_LEAK',
        message: `发现 ${leaks.largeObjects.length} 个大对象未清理`,
        action: '清理大对象缓存'
      });
    }

    return recommendations;
  }

  // 启动检测服务
  startDetection() {
    console.log('🔍 内存泄漏检测服务已启动');
    
    // 定期检测内存泄漏
    setInterval(() => {
      const leaks = this.detectMemoryLeaks();
      const totalLeaks = leaks.timers.length + leaks.eventListeners.length + 
                        leaks.dbSessions.length + leaks.largeObjects.length;
      
      if (totalLeaks > 0) {
        console.warn(`🚨 检测到 ${totalLeaks} 个潜在内存泄漏`);
        this.autoCleanupLeaks().then(results => {
          if (results.timers > 0 || results.eventListeners > 0 || 
              results.dbSessions > 0 || results.largeObjects > 0) {
            console.log(`🧹 自动清理完成: 定时器${results.timers}, 事件${results.eventListeners}, 会话${results.dbSessions}, 对象${results.largeObjects}`);
          }
        });
      }
    }, this.detectionInterval);

    // 定期清理
    setInterval(() => {
      this.autoCleanupLeaks();
    }, this.cleanupInterval);
  }

  // 停止检测服务
  stop() {
    console.log('🛑 内存泄漏检测服务已停止');
    
    // 清理所有定时器
    for (const [id, timer] of this.timers.entries()) {
      clearInterval(timer.timerId);
    }
    this.timers.clear();
    
    // 清理所有数据库会话
    for (const [id, sessionInfo] of this.dbSessions.entries()) {
      this.clearDbSession(id);
    }
    
    // 清理所有大对象
    this.largeObjects.clear();
  }

  // 工具函数：格式化字节
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = MemoryLeakDetector;
