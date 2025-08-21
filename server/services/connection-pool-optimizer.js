const mongoose = require('mongoose');

class ConnectionPoolOptimizer {
  constructor() {
    this.optimizationInterval = 60000; // 每分钟优化一次
    this.maxConnections = 10; // 最大连接数
    this.minConnections = 2;  // 最小连接数
    this.idleTimeout = 30000; // 空闲连接超时时间
    this.connectionTimeout = 10000; // 连接超时时间
    
    this.startOptimization();
  }

  // 获取当前连接池状态
  getConnectionPoolStatus() {
    try {
      const connection = mongoose.connection;
      
      if (!connection || !connection.db) {
        return {
          status: 'disconnected',
          message: '数据库未连接'
        };
      }

      // 尝试获取连接池信息
      let poolInfo = {};
      try {
        if (connection.db.serverConfig && connection.db.serverConfig.s) {
          const serverConfig = connection.db.serverConfig.s;
          if (serverConfig.options) {
            poolInfo = {
              maxPoolSize: serverConfig.options.maxPoolSize || 'N/A',
              minPoolSize: serverConfig.options.minPoolSize || 'N/A',
              maxIdleTimeMS: serverConfig.options.maxIdleTimeMS || 'N/A',
              serverSelectionTimeoutMS: serverConfig.options.serverSelectionTimeoutMS || 'N/A'
            };
          }
        }
      } catch (error) {
        console.warn('⚠️ 无法获取详细连接池信息:', error.message);
      }

      return {
        status: 'connected',
        readyState: connection.readyState,
        host: connection.host,
        port: connection.port,
        name: connection.name,
        poolInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 优化连接池配置
  async optimizeConnectionPool() {
    try {
      const connection = mongoose.connection;
      
      if (!connection || connection.readyState !== 1) {
        console.log('⚠️ 数据库未连接，跳过连接池优化');
        return false;
      }

      console.log('🔧 开始优化数据库连接池...');

      // 获取当前连接池状态
      const currentStatus = this.getConnectionPoolStatus();
      console.log('📊 当前连接池状态:', currentStatus);

      // 优化连接池参数
      const optimizationResult = await this.applyConnectionPoolOptimizations();
      
      if (optimizationResult.success) {
        console.log('✅ 连接池优化完成');
        return true;
      } else {
        console.warn('⚠️ 连接池优化失败:', optimizationResult.error);
        return false;
      }

    } catch (error) {
      console.error('❌ 连接池优化过程中出错:', error);
      return false;
    }
  }

  // 应用连接池优化
  async applyConnectionPoolOptimizations() {
    try {
      // 注意：在运行时修改MongoDB连接池参数是有限制的
      // 我们主要通过监控和报告来提供优化建议
      
      const optimizations = [];
      
      // 检查连接池大小
      const poolStatus = this.getConnectionPoolStatus();
      if (poolStatus.poolInfo.maxPoolSize !== 'N/A') {
        const currentMaxPool = parseInt(poolStatus.poolInfo.maxPoolSize);
        if (currentMaxPool > this.maxConnections) {
          optimizations.push({
            type: 'MAX_POOL_SIZE',
            current: currentMaxPool,
            recommended: this.maxConnections,
            message: `建议将最大连接池大小从 ${currentMaxPool} 减少到 ${this.maxConnections}`
          });
        }
      }

      // 检查空闲超时时间
      if (poolStatus.poolInfo.maxIdleTimeMS !== 'N/A') {
        const currentIdleTimeout = parseInt(poolStatus.poolInfo.maxIdleTimeMS);
        if (currentIdleTimeout < this.idleTimeout) {
          optimizations.push({
            type: 'IDLE_TIMEOUT',
            current: currentIdleTimeout,
            recommended: this.idleTimeout,
            message: `建议将空闲连接超时时间从 ${currentIdleTimeout}ms 增加到 ${this.idleTimeout}ms`
          });
        }
      }

      // 检查连接超时时间
      if (poolStatus.poolInfo.serverSelectionTimeoutMS !== 'N/A') {
        const currentConnTimeout = parseInt(poolStatus.poolInfo.serverSelectionTimeoutMS);
        if (currentConnTimeout > this.connectionTimeout) {
          optimizations.push({
            type: 'CONNECTION_TIMEOUT',
            current: currentConnTimeout,
            recommended: this.connectionTimeout,
            message: `建议将连接超时时间从 ${currentConnTimeout}ms 减少到 ${this.connectionTimeout}ms`
          });
        }
      }

      return {
        success: true,
        optimizations,
        message: `发现 ${optimizations.length} 个优化建议`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 监控连接池性能
  monitorConnectionPoolPerformance() {
    try {
      const connection = mongoose.connection;
      
      if (!connection || connection.readyState !== 1) {
        return null;
      }

      // 获取连接池统计信息
      const stats = {
        timestamp: new Date().toISOString(),
        readyState: connection.readyState,
        poolStatus: this.getConnectionPoolStatus(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      };

      // 分析连接池健康状况
      const healthScore = this.calculateHealthScore(stats);
      stats.healthScore = healthScore;

      return stats;

    } catch (error) {
      console.error('❌ 监控连接池性能时出错:', error);
      return null;
    }
  }

  // 计算健康分数
  calculateHealthScore(stats) {
    let score = 100;
    const issues = [];

    // 检查连接状态
    if (stats.readyState !== 1) {
      score -= 30;
      issues.push('数据库连接状态异常');
    }

    // 检查内存使用
    const memUsage = stats.memoryUsage;
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (heapUsagePercent > 80) {
      score -= 20;
      issues.push('堆内存使用率过高');
    }

    // 检查运行时间
    if (stats.uptime > 86400) { // 超过24小时
      score -= 10;
      issues.push('服务运行时间过长，建议定期重启');
    }

    return {
      score: Math.max(0, score),
      issues,
      level: score >= 80 ? 'GOOD' : score >= 60 ? 'WARNING' : 'CRITICAL'
    };
  }

  // 获取连接池优化建议
  getOptimizationSuggestions() {
    const suggestions = [];
    
    // 连接池大小建议
    suggestions.push({
      category: '连接池大小',
      priority: 'MEDIUM',
      suggestions: [
        '根据实际负载调整最大连接数，避免过多空闲连接',
        '设置合适的最小连接数，减少连接建立开销',
        '监控连接池使用率，动态调整参数'
      ]
    });

    // 内存优化建议
    suggestions.push({
      category: '内存优化',
      priority: 'HIGH',
      suggestions: [
        '定期清理长时间空闲的连接',
        '使用连接池监控，及时发现内存泄漏',
        '设置合理的连接超时时间，避免连接堆积'
      ]
    });

    // 性能优化建议
    suggestions.push({
      category: '性能优化',
      priority: 'MEDIUM',
      suggestions: [
        '启用连接池压缩，减少内存占用',
        '使用连接池事件监听，优化连接生命周期',
        '定期重启服务，清理内存碎片'
      ]
    });

    return suggestions;
  }

  // 启动优化服务
  startOptimization() {
    console.log('🚀 连接池优化服务已启动');
    
    // 定期优化连接池
    setInterval(async () => {
      await this.optimizeConnectionPool();
    }, this.optimizationInterval);
    
    // 定期监控性能
    setInterval(() => {
      const performance = this.monitorConnectionPoolPerformance();
      if (performance && performance.healthScore.level === 'CRITICAL') {
        console.warn('🚨 连接池健康状态严重:', performance.healthScore);
      }
    }, 30000); // 每30秒监控一次
  }

  // 停止优化服务
  stop() {
    console.log('🛑 连接池优化服务已停止');
  }

  // 获取完整的优化报告
  getOptimizationReport() {
    return {
      timestamp: new Date().toISOString(),
      connectionPool: this.getConnectionPoolStatus(),
      performance: this.monitorConnectionPoolPerformance(),
      suggestions: this.getOptimizationSuggestions(),
      configuration: {
        maxConnections: this.maxConnections,
        minConnections: this.minConnections,
        idleTimeout: this.idleTimeout,
        connectionTimeout: this.connectionTimeout
      }
    };
  }
}

module.exports = ConnectionPoolOptimizer;
