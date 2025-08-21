const mongoose = require('mongoose');
const winston = require('winston');

class DatabaseOptimizer {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/database-optimizer.log' }),
        new winston.transports.Console()
      ]
    });
  }

  /**
   * 创建和优化索引
   */
  async optimizeIndexes() {
    try {
      this.logger.info('开始优化数据库索引...');
      
      // 获取所有模型
      const models = mongoose.models;
      const results = {};

      // 优化订单模型索引
      if (models.Order) {
        results.Order = await this.optimizeOrderIndexes();
      }

      // 优化交易模型索引
      if (models.Transaction) {
        results.Transaction = await this.optimizeTransactionIndexes();
      }

      // 优化商户模型索引
      if (models.Merchant) {
        results.Merchant = await this.optimizeMerchantIndexes();
      }

      // 优化用户模型索引
      if (models.User) {
        results.User = await this.optimizeUserIndexes();
      }

      this.logger.info('数据库索引优化完成', { results });
      return results;
    } catch (error) {
      this.logger.error('数据库索引优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 优化订单模型索引
   */
  async optimizeOrderIndexes() {
    try {
      const Order = mongoose.models.Order;
      const collection = Order.collection;
      
      // 删除旧索引（如果存在）
      await collection.dropIndexes();
      
      // 创建复合索引
      const indexes = [
        // 商户查询优化
        { merchantId: 1, createdAt: -1 },
        { merchantId: 1, status: 1, createdAt: -1 },
        
        // 状态查询优化
        { status: 1, createdAt: -1 },
        { status: 1, updatedAt: -1 },
        
        // 时间范围查询优化
        { createdAt: -1 },
        { updatedAt: -1 },
        { paidAt: -1 },
        { completedAt: -1 },
        
        // 支付提供者查询优化
        { 'provider.name': 1, createdAt: -1 },
        { 'provider.transactionId': 1 },
        
        // 客户查询优化
        { 'customer.email': 1 },
        { 'customer.phone': 1 },
        { 'customer.userId': 1 },
        
        // 金额查询优化
        { amount: 1, createdAt: -1 },
        
        // 复合查询优化
        { merchantId: 1, type: 1, status: 1, createdAt: -1 },
        { status: 1, type: 1, createdAt: -1 },
        
        // 风控查询优化
        { 'riskInfo.riskLevel': 1, createdAt: -1 },
        { 'riskInfo.reviewedBy': 1, createdAt: -1 }
      ];

      for (const index of indexes) {
        await collection.createIndex(index);
      }

      this.logger.info('订单模型索引优化完成', { indexesCount: indexes.length });
      return { indexesCount: indexes.length, indexes };
    } catch (error) {
      this.logger.error('订单模型索引优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 优化交易模型索引
   */
  async optimizeTransactionIndexes() {
    try {
      const Transaction = mongoose.models.Transaction;
      const collection = Transaction.collection;
      
      // 删除旧索引（如果存在）
      await collection.dropIndexes();
      
      // 创建复合索引
      const indexes = [
        // 基础查询优化
        { transactionId: 1 },
        { orderId: 1 },
        { merchantId: 1, createdAt: -1 },
        
        // 状态查询优化
        { status: 1, createdAt: -1 },
        { status: 1, type: 1, createdAt: -1 },
        
        // 时间查询优化
        { createdAt: -1 },
        { createdAt: 1, amount: 1 },
        
        // 金额查询优化
        { amount: 1, createdAt: -1 },
        { balanceChange: 1, createdAt: -1 },
        
        // 复合查询优化
        { merchantId: 1, type: 1, status: 1, createdAt: -1 },
        { type: 1, status: 1, createdAt: -1 }
      ];

      for (const index of indexes) {
        await collection.createIndex(index);
      }

      this.logger.info('交易模型索引优化完成', { indexesCount: indexes.length });
      return { indexesCount: indexes.length, indexes };
    } catch (error) {
      this.logger.error('交易模型索引优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 优化商户模型索引
   */
  async optimizeMerchantIndexes() {
    try {
      const Merchant = mongoose.models.Merchant;
      const collection = Merchant.collection;
      
      // 删除旧索引（如果存在）
      await collection.dropIndexes();
      
      // 创建复合索引
      const indexes = [
        { merchantId: 1 },
        { apiKey: 1 },
        { email: 1 },
        { phone: 1 },
        { status: 1, createdAt: -1 },
        { createdAt: -1 },
        { updatedAt: -1 }
      ];

      for (const index of indexes) {
        await collection.createIndex(index);
      }

      this.logger.info('商户模型索引优化完成', { indexesCount: indexes.length });
      return { indexesCount: indexes.length, indexes };
    } catch (error) {
      this.logger.error('商户模型索引优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 优化用户模型索引
   */
  async optimizeUserIndexes() {
    try {
      const User = mongoose.models.User;
      const collection = User.collection;
      
      // 删除旧索引（如果存在）
      await collection.dropIndexes();
      
      // 创建复合索引
      const indexes = [
        { email: 1 },
        { username: 1 },
        { role: 1, createdAt: -1 },
        { status: 1, createdAt: -1 },
        { createdAt: -1 },
        { lastLoginAt: -1 }
      ];

      for (const index of indexes) {
        await collection.createIndex(index);
      }

      this.logger.info('用户模型索引优化完成', { indexesCount: indexes.length });
      return { indexesCount: indexes.length, indexes };
    } catch (error) {
      this.logger.error('用户模型索引优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 分析查询性能
   */
  async analyzeQueryPerformance() {
    try {
      this.logger.info('开始分析查询性能...');
      
      const db = mongoose.connection.db;
      const results = {};

      // 分析订单集合
      if (mongoose.models.Order) {
        results.Order = await this.analyzeCollectionPerformance(db, 'orders');
      }

      // 分析交易集合
      if (mongoose.models.Transaction) {
        results.Transaction = await this.analyzeCollectionPerformance(db, 'transactions');
      }

      // 分析商户集合
      if (mongoose.models.Merchant) {
        results.Merchant = await this.analyzeCollectionPerformance(db, 'merchants');
      }

      this.logger.info('查询性能分析完成', { results });
      return results;
    } catch (error) {
      this.logger.error('查询性能分析失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 分析集合性能
   */
  async analyzeCollectionPerformance(db, collectionName) {
    try {
      const collection = db.collection(collectionName);
      
      // 获取集合统计信息
      const stats = await collection.stats();
      
      // 获取索引信息
      const indexes = await collection.indexes();
      
      // 分析查询计划
      const sampleQueries = [
        { merchantId: 'TEST001' },
        { status: 'SUCCESS' },
        { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ];

      const queryPlans = {};
      for (const query of sampleQueries) {
        try {
          const explain = await collection.find(query).explain('executionStats');
          queryPlans[JSON.stringify(query)] = {
            executionTime: explain.executionStats.executionTimeMillis,
            totalDocsExamined: explain.executionStats.totalDocsExamined,
            totalKeysExamined: explain.executionStats.totalKeysExamined,
            indexUsed: explain.queryPlanner.winningPlan.inputStage?.indexName || 'COLLSCAN'
          };
        } catch (error) {
          queryPlans[JSON.stringify(query)] = { error: error.message };
        }
      }

      return {
        stats: {
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexes: stats.nindexes
        },
        indexes: indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique,
          sparse: idx.sparse
        })),
        queryPlans
      };
    } catch (error) {
      this.logger.error(`集合性能分析失败: ${collectionName}`, { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * 优化连接池配置
   */
  async optimizeConnectionPool() {
    try {
      this.logger.info('开始优化连接池配置...');
      
      const connection = mongoose.connection;
      let currentConfig = {};
      
      // 安全地获取当前配置
      try {
        if (connection.db && connection.db.serverConfig && connection.db.serverConfig.s) {
          currentConfig = connection.db.serverConfig.s.options || {};
        }
      } catch (configError) {
        this.logger.warn('无法获取当前连接池配置', { error: configError.message });
      }
      
      // 建议的连接池配置
      const recommendedConfig = {
        maxPoolSize: 50,           // 最大连接数
        minPoolSize: 10,           // 最小连接数
        maxIdleTimeMS: 30000,      // 最大空闲时间
        waitQueueTimeoutMS: 5000,  // 等待队列超时
        maxConnecting: 2,          // 最大连接中数量
        serverSelectionTimeoutMS: 30000,  // 服务器选择超时
        heartbeatFrequencyMS: 10000,      // 心跳频率
        retryWrites: true,         // 重试写入
        retryReads: true           // 重试读取
      };

      this.logger.info('连接池配置优化完成', { 
        oldConfig: currentConfig,
        newConfig: recommendedConfig 
      });

      // 注意：在生产环境中，不建议断开连接重新连接
      // 这里只是记录建议的配置
      return { oldConfig: currentConfig, newConfig: recommendedConfig };
    } catch (error) {
      this.logger.error('连接池配置优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取数据库性能报告
   */
  async getPerformanceReport() {
    try {
      this.logger.info('生成数据库性能报告...');
      
      const report = {
        timestamp: new Date(),
        indexes: await this.optimizeIndexes(),
        performance: await this.analyzeQueryPerformance(),
        connectionPool: await this.getConnectionPoolStatus()
      };

      this.logger.info('数据库性能报告生成完成');
      return report;
    } catch (error) {
      this.logger.error('数据库性能报告生成失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取连接池状态
   */
  async getConnectionPoolStatus() {
    try {
      const connection = mongoose.connection;
      
      // 安全地获取连接池信息
      let poolInfo = {
        maxPoolSize: 'N/A',
        minPoolSize: 'N/A',
        currentConnections: 'N/A',
        availableConnections: 'N/A',
        pendingConnections: 'N/A'
      };
      
      try {
        // 尝试获取连接池配置
        if (connection.db && connection.db.serverConfig && connection.db.serverConfig.s) {
          const pool = connection.db.serverConfig.s.options;
          poolInfo.maxPoolSize = pool.maxPoolSize || 'N/A';
          poolInfo.minPoolSize = pool.minPoolSize || 'N/A';
        }
        
        // 尝试获取连接池状态
        if (connection.db && connection.db.serverConfig && connection.db.serverConfig.s && connection.db.serverConfig.s.pool) {
          const pool = connection.db.serverConfig.s.pool;
          poolInfo.currentConnections = typeof pool.size === 'function' ? pool.size() : 'N/A';
          poolInfo.availableConnections = typeof pool.available === 'function' ? pool.available() : 'N/A';
          poolInfo.pendingConnections = typeof pool.pending === 'function' ? pool.pending() : 'N/A';
        }
      } catch (poolError) {
        this.logger.warn('无法获取详细连接池信息', { error: poolError.message });
      }
      
      return poolInfo;
    } catch (error) {
      this.logger.error('获取连接池状态失败', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData() {
    try {
      this.logger.info('开始清理过期数据...');
      
      const results = {};
      
      // 清理过期的订单（超过30天）
      if (mongoose.models.Order) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const expiredOrders = await mongoose.models.Order.deleteMany({
          createdAt: { $lt: thirtyDaysAgo },
          status: { $in: ['EXPIRED', 'CANCELLED', 'FAILED'] }
        });
        results.expiredOrders = expiredOrders.deletedCount;
      }

      // 清理过期的日志（超过90天）
      if (mongoose.models.PaymentStats) {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const expiredStats = await mongoose.models.PaymentStats.deleteMany({
          createdAt: { $lt: ninetyDaysAgo }
        });
        results.expiredStats = expiredStats.deletedCount;
      }

      this.logger.info('过期数据清理完成', { results });
      return results;
    } catch (error) {
      this.logger.error('过期数据清理失败', { error: error.message });
      throw error;
    }
  }
}

module.exports = DatabaseOptimizer;
