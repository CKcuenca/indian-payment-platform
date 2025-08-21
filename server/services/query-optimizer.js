const mongoose = require('mongoose');
const winston = require('winston');

class QueryOptimizer {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/query-optimizer.log' }),
        new winston.transports.Console()
      ]
    });

    // 简单的内存缓存
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 带缓存的查询
   */
  async cachedQuery(key, queryFn, ttl = this.cacheTimeout) {
    try {
      const now = Date.now();
      const cached = this.cache.get(key);
      
      if (cached && (now - cached.timestamp) < ttl) {
        this.logger.info('查询缓存命中', { key, cacheAge: now - cached.timestamp });
        return cached.data;
      }

      const result = await queryFn();
      
      this.cache.set(key, {
        data: result,
        timestamp: now
      });

      this.logger.info('查询缓存更新', { key });
      return result;
    } catch (error) {
      this.logger.error('缓存查询失败', { key, error: error.message });
      throw error;
    }
  }

  /**
   * 优化订单查询
   */
  async getOrdersOptimized(filters = {}, options = {}) {
    try {
      // 检查Order模型是否存在
      if (!mongoose.models.Order) {
        this.logger.warn('Order模型不存在，返回空结果');
        return {
          orders: [],
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: 0,
            pages: 0
          }
        };
      }

      const {
        merchantId,
        status,
        type,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = -1
      } = filters;

      // 构建查询条件
      const query = {};
      
      if (merchantId) query.merchantId = merchantId;
      if (status) query.status = status;
      if (type) query.type = type;
      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = minAmount;
        if (maxAmount) query.amount.$lte = maxAmount;
      }
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // 构建排序
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // 分页
      const skip = (page - 1) * limit;

      // 执行查询
      const [orders, total] = await Promise.all([
        mongoose.models.Order
          .find(query)
          .select('-operations -statusHistory') // 排除大字段
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(), // 使用lean()提高性能
        mongoose.models.Order.countDocuments(query)
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('优化订单查询失败', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * 优化聚合查询
   */
  async getOrderStatsOptimized(filters = {}) {
    try {
      // 检查Order模型是否存在
      if (!mongoose.models.Order) {
        this.logger.warn('Order模型不存在，返回空结果');
        return [];
      }

      const {
        merchantId,
        startDate,
        endDate,
        groupBy = 'day' // day, hour, month
      } = filters;

      // 构建匹配条件
      const matchStage = {};
      
      if (merchantId) matchStage.merchantId = merchantId;
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      // 构建分组条件
      let groupStage;
      switch (groupBy) {
        case 'hour':
          groupStage = {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
              hour: { $hour: '$createdAt' }
            }
          };
          break;
        case 'month':
          groupStage = {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            }
          };
          break;
        default: // day
          groupStage = {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            }
          };
      }

      // 聚合管道
      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            ...groupStage,
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] }
            },
            successAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] }
            },
            failedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
            }
          }
        },
        {
          $addFields: {
            successRate: {
              $cond: [
                { $gt: ['$totalOrders', 0] },
                { $multiply: [{ $divide: ['$successOrders', '$totalOrders'] }, 100] },
                0
              ]
            },
            avgAmount: {
              $cond: [
                { $gt: ['$totalOrders', 0] },
                { $divide: ['$totalAmount', '$totalOrders'] },
                0
              ]
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ];

      const results = await mongoose.models.Order.aggregate(pipeline);
      
      return results.map(item => ({
        date: this.formatGroupDate(item._id, groupBy),
        ...item
      }));
    } catch (error) {
      this.logger.error('优化聚合查询失败', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * 格式化分组日期
   */
  formatGroupDate(id, groupBy) {
    const { year, month, day, hour } = id;
    
    switch (groupBy) {
      case 'hour':
        return new Date(year, month - 1, day, hour);
      case 'month':
        return new Date(year, month - 1);
      default:
        return new Date(year, month - 1, day);
    }
  }

  /**
   * 批量查询优化
   */
  async batchQueryOptimized(queries) {
    try {
      this.logger.info('开始批量查询优化', { queryCount: queries.length });
      
      const results = {};
      const batchSize = 10; // 每批处理10个查询
      
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (query) => {
          try {
            const { key, queryFn, ttl } = query;
            const result = await this.cachedQuery(key, queryFn, ttl);
            return { key, success: true, result };
          } catch (error) {
            this.logger.error('批量查询失败', { key: query.key, error: error.message });
            return { key: query.key, success: false, error: error.message };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { key, success, result: data, error } = result.value;
            results[key] = { success, data, error };
          } else {
            const { key } = batch[index];
            results[key] = { success: false, error: result.reason };
          }
        });

        // 批次间延迟，避免过载
        if (i + batchSize < queries.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.info('批量查询优化完成', { 
        totalQueries: queries.length,
        successfulQueries: Object.values(results).filter(r => r.success).length
      });

      return results;
    } catch (error) {
      this.logger.error('批量查询优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 查询性能监控
   */
  async monitorQueryPerformance(queryName, queryFn) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await queryFn();
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      
      const performance = {
        queryName,
        executionTime: endTime - startTime,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        },
        timestamp: new Date()
      };

      this.logger.info('查询性能监控', performance);
      
      // 如果查询时间过长，记录警告
      if (performance.executionTime > 1000) {
        this.logger.warn('查询执行时间过长', performance);
      }

      return { result, performance };
    } catch (error) {
      const endTime = Date.now();
      const performance = {
        queryName,
        executionTime: endTime - startTime,
        error: error.message,
        timestamp: new Date()
      };

      this.logger.error('查询执行失败', performance);
      throw error;
    }
  }

  /**
   * 清理缓存
   */
  clearCache(pattern = null) {
    try {
      if (pattern) {
        // 按模式清理缓存
        const regex = new RegExp(pattern);
        for (const [key] of this.cache) {
          if (regex.test(key)) {
            this.cache.delete(key);
          }
        }
        this.logger.info('按模式清理缓存', { pattern, remainingKeys: this.cache.size });
      } else {
        // 清理所有缓存
        const size = this.cache.size;
        this.cache.clear();
        this.logger.info('清理所有缓存', { clearedKeys: size });
      }
    } catch (error) {
      this.logger.error('清理缓存失败', { error: error.message });
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const [key, value] of this.cache) {
      if (now - value.timestamp < this.cacheTimeout) {
        validEntries++;
        totalSize += JSON.stringify(value.data).length;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      cacheTimeout: `${this.cacheTimeout / 1000}s`
    };
  }

  /**
   * 优化查询建议
   */
  getQueryOptimizationSuggestions() {
    return [
      {
        category: '索引优化',
        suggestions: [
          '为常用查询字段添加复合索引',
          '为时间范围查询添加降序索引',
          '为状态查询添加复合索引'
        ]
      },
      {
        category: '查询优化',
        suggestions: [
          '使用lean()查询减少内存使用',
          '只选择需要的字段',
          '使用聚合管道优化复杂查询',
          '实现查询缓存减少数据库压力'
        ]
      },
      {
        category: '分页优化',
        suggestions: [
          '使用skip/limit进行分页',
          '考虑使用游标分页提高性能',
          '限制每页数据量'
        ]
      },
      {
        category: '连接池优化',
        suggestions: [
          '优化连接池大小配置',
          '监控连接池状态',
          '实现连接重试机制'
        ]
      }
    ];
  }
}

module.exports = QueryOptimizer;
