const mongoose = require('mongoose');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

/**
 * 性能优化服务
 * 提供缓存、连接池、查询优化等功能
 */
class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    this.queryStats = new Map();
    this.optimizationInterval = null;
    this.isRunning = false;
  }

  /**
   * 启动性能优化服务
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // 每5分钟执行一次优化
    this.optimizationInterval = setInterval(() => {
      this.performOptimization();
    }, 5 * 60 * 1000);
    
    console.log('性能优化服务已启动');
  }

  /**
   * 停止性能优化服务
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    
    console.log('性能优化服务已停止');
  }

  /**
   * 智能缓存系统
   */
  cache = {
    /**
     * 设置缓存
     */
    set: (key, value, ttl = 300000) => { // 默认5分钟TTL
      const expiry = Date.now() + ttl;
      this.cache.set(key, { value, expiry });
      this.cacheStats.sets++;
    },

    /**
     * 获取缓存
     */
    get: (key) => {
      const item = this.cache.get(key);
      if (!item) {
        this.cacheStats.misses++;
        return null;
      }
      
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        this.cacheStats.misses++;
        return null;
      }
      
      this.cacheStats.hits++;
      return item.value;
    },

    /**
     * 删除缓存
     */
    delete: (key) => {
      const deleted = this.cache.delete(key);
      if (deleted) this.cacheStats.deletes++;
      return deleted;
    },

    /**
     * 清空缓存
     */
    clear: () => {
      this.cache.clear();
      this.cacheStats.sets = 0;
      this.cacheStats.hits = 0;
      this.cacheStats.misses = 0;
      this.cacheStats.deletes = 0;
    },

    /**
     * 获取缓存统计
     */
    getStats: () => {
      const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
        ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
        : 0;
      
      return {
        ...this.cacheStats,
        hitRate: `${hitRate}%`,
        size: this.cache.size
      };
    }
  };

  /**
   * 查询优化器
   */
  queryOptimizer = {
    /**
     * 记录查询性能
     */
    recordQuery: (collection, operation, duration, success) => {
      const key = `${collection}:${operation}`;
      if (!this.queryStats.has(key)) {
        this.queryStats.set(key, {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          successCount: 0,
          errorCount: 0
        });
      }
      
      const stats = this.queryStats.get(key);
      stats.count++;
      stats.totalDuration += duration;
      stats.avgDuration = stats.totalDuration / stats.count;
      stats.minDuration = Math.min(stats.minDuration, duration);
      stats.maxDuration = Math.max(stats.maxDuration, duration);
      
      if (success) {
        stats.successCount++;
      } else {
        stats.errorCount++;
      }
    },

    /**
     * 获取查询统计
     */
    getQueryStats: () => {
      const stats = {};
      for (const [key, value] of this.queryStats.entries()) {
        stats[key] = { ...value };
      }
      return stats;
    },

    /**
     * 分析慢查询
     */
    getSlowQueries: (threshold = 1000) => {
      const slowQueries = [];
      for (const [key, stats] of this.queryStats.entries()) {
        if (stats.avgDuration > threshold) {
          slowQueries.push({
            query: key,
            avgDuration: stats.avgDuration,
            count: stats.count,
            successRate: (stats.successCount / stats.count * 100).toFixed(2)
          });
        }
      }
      return slowQueries.sort((a, b) => b.avgDuration - a.avgDuration);
    }
  };

  /**
   * 数据库连接优化
   */
  async optimizeDatabaseConnections() {
    try {
      const db = mongoose.connection.db;
      
      // 获取连接池状态
      const poolStatus = await db.admin().serverStatus();
      
      // 优化连接池配置
      if (poolStatus.connections && poolStatus.connections.current > 100) {
        console.log('数据库连接数较多，建议优化连接池配置');
      }
      
      // 检查索引使用情况
      await this.analyzeIndexUsage();
      
    } catch (error) {
      console.error('数据库连接优化失败:', error);
    }
  }

  /**
   * 分析索引使用情况
   */
  async analyzeIndexUsage() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections.slice(0, 5)) { // 限制分析前5个集合
        try {
          const stats = await db.collection(collection.name).stats();
          if (stats.indexSizes && Object.keys(stats.indexSizes).length > 5) {
            console.log(`集合 ${collection.name} 索引较多，建议检查索引使用情况`);
          }
        } catch (error) {
          // 忽略无法分析的集合
        }
      }
    } catch (error) {
      console.error('索引使用分析失败:', error);
    }
  }

  /**
   * 内存优化
   */
  async optimizeMemory() {
    try {
      const memUsage = process.memoryUsage();
      
      // 如果内存使用超过500MB，建议进行垃圾回收
      if (memUsage.heapUsed > 500 * 1024 * 1024) {
        if (global.gc) {
          console.log('执行垃圾回收...');
          global.gc();
          
          const newMemUsage = process.memoryUsage();
          const freed = memUsage.heapUsed - newMemUsage.heapUsed;
          console.log(`垃圾回收完成，释放内存: ${this.formatBytes(freed)}`);
        } else {
          console.log('建议启用垃圾回收: --expose-gc');
        }
      }
      
      // 清理过期缓存
      this.cleanupExpiredCache();
      
    } catch (error) {
      console.error('内存优化失败:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`清理过期缓存: ${cleanedCount} 项`);
    }
  }

  /**
   * 查询性能优化建议
   */
  getQueryOptimizationSuggestions() {
    const suggestions = [];
    const slowQueries = this.queryOptimizer.getSlowQueries();
    
    if (slowQueries.length > 0) {
      suggestions.push({
        type: 'SLOW_QUERIES',
        priority: 'HIGH',
        message: `发现 ${slowQueries.length} 个慢查询，建议优化`,
        details: slowQueries.slice(0, 3) // 显示前3个最慢的查询
      });
    }
    
    // 缓存命中率建议
    const cacheStats = this.cache.getStats();
    if (parseFloat(cacheStats.hitRate) < 50) {
      suggestions.push({
        type: 'CACHE_OPTIMIZATION',
        priority: 'MEDIUM',
        message: '缓存命中率较低，建议优化缓存策略',
        details: { currentHitRate: cacheStats.hitRate }
      });
    }
    
    return suggestions;
  }

  /**
   * 执行性能优化
   */
  async performOptimization() {
    try {
      console.log('开始执行性能优化...');
      
      // 数据库连接优化
      await this.optimizeDatabaseConnections();
      
      // 内存优化
      await this.optimizeMemory();
      
      // 清理过期缓存
      this.cleanupExpiredCache();
      
      console.log('性能优化完成');
      
    } catch (error) {
      console.error('性能优化失败:', error);
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const cacheStats = this.cache.getStats();
    const queryStats = this.queryOptimizer.getQueryStats();
    const suggestions = this.getQueryOptimizationSuggestions();
    
    return {
      cache: cacheStats,
      queries: {
        total: Object.keys(queryStats).length,
        slowQueries: this.queryOptimizer.getSlowQueries().length,
        stats: queryStats
      },
      suggestions,
      timestamp: new Date()
    };
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
   * 性能监控装饰器
   */
  monitorPerformance(collection, operation) {
    return (target, propertyName, descriptor) => {
      const method = descriptor.value;
      
      descriptor.value = async function(...args) {
        const start = Date.now();
        let success = false;
        
        try {
          const result = await method.apply(this, args);
          success = true;
          return result;
        } catch (error) {
          throw error;
        } finally {
          const duration = Date.now() - start;
          this.queryOptimizer.recordQuery(collection, operation, duration, success);
        }
      };
      
      return descriptor;
    };
  }

  /**
   * 缓存装饰器
   */
  withCache(key, ttl = 300000) {
    return (target, propertyName, descriptor) => {
      const method = descriptor.value;
      
      descriptor.value = async function(...args) {
        const cacheKey = `${key}:${JSON.stringify(args)}`;
        
        // 尝试从缓存获取
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return cached;
        }
        
        // 执行方法并缓存结果
        const result = await method.apply(this, args);
        this.cache.set(cacheKey, result, ttl);
        
        return result;
      };
      
      return descriptor;
    };
  }
}

module.exports = PerformanceOptimizer;
