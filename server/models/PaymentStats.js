const mongoose = require('mongoose');

const paymentStatsSchema = new mongoose.Schema({
  // 支付账户ID
  paymentAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentConfig',
    required: true
  },
  
  // 统计日期
  date: {
    type: Date,
    required: true
  },
  
  // 时间维度
  timeDimension: {
    type: String,
    enum: ['hourly', 'daily', 'monthly'],
    required: true
  },
  
  // 订单统计
  orders: {
    total: {
      type: Number,
      default: 0
    },
    success: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    cancelled: {
      type: Number,
      default: 0
    }
  },
  
  // 金额统计
  amounts: {
    total: {
      type: Number,
      default: 0
    },
    success: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    refunded: {
      type: Number,
      default: 0
    }
  },
  
  // 成功率
  successRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // 平均处理时间（毫秒）
  avgProcessingTime: {
    type: Number,
    default: 0
  },
  
  // 错误统计
  errorStats: {
    total: {
      type: Number,
      default: 0
    },
    byType: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 复合索引
paymentStatsSchema.index({ paymentAccountId: 1, date: 1, timeDimension: 1 }, { unique: true });
paymentStatsSchema.index({ date: 1, timeDimension: 1 });
paymentStatsSchema.index({ createdAt: -1 });

// 虚拟字段：失败率
paymentStatsSchema.virtual('failureRate').get(function() {
  return this.orders.total > 0 ? ((this.orders.failed / this.orders.total) * 100).toFixed(2) : 0;
});

// 虚拟字段：平均订单金额
paymentStatsSchema.virtual('avgOrderAmount').get(function() {
  return this.orders.total > 0 ? (this.amounts.total / this.orders.total).toFixed(2) : 0;
});

// 方法：更新统计
paymentStatsSchema.methods.updateStats = function(orderData) {
  this.orders.total += 1;
  this.amounts.total += orderData.amount || 0;
  
  switch (orderData.status) {
    case 'SUCCESS':
      this.orders.success += 1;
      this.amounts.success += orderData.amount || 0;
      break;
    case 'FAILED':
      this.orders.failed += 1;
      this.amounts.failed += orderData.amount || 0;
      break;
    case 'PENDING':
      this.orders.pending += 1;
      this.amounts.pending += orderData.amount || 0;
      break;
    case 'CANCELLED':
      this.orders.cancelled += 1;
      break;
  }
  
  // 计算成功率
  this.successRate = this.orders.total > 0 ? 
    ((this.orders.success / this.orders.total) * 100).toFixed(2) : 0;
  
  return this.save();
};

// 静态方法：获取时间范围内的统计
paymentStatsSchema.statics.getStatsByDateRange = async function(
  paymentAccountId, 
  startDate, 
  endDate, 
  timeDimension = 'daily'
) {
  return await this.find({
    paymentAccountId,
    date: { $gte: startDate, $lte: endDate },
    timeDimension
  }).sort({ date: 1 });
};

// 静态方法：聚合统计
paymentStatsSchema.statics.getAggregatedStats = async function(
  paymentAccountId,
  startDate,
  endDate,
  timeDimension = 'daily'
) {
  const pipeline = [
    {
      $match: {
        paymentAccountId: new mongoose.Types.ObjectId(paymentAccountId),
        date: { $gte: startDate, $lte: endDate },
        timeDimension
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: '$orders.total' },
        successOrders: { $sum: '$orders.success' },
        failedOrders: { $sum: '$orders.failed' },
        totalAmount: { $sum: '$amounts.total' },
        successAmount: { $sum: '$amounts.success' },
        avgSuccessRate: { $avg: '$successRate' },
        avgProcessingTime: { $avg: '$avgProcessingTime' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalOrders: 0,
    successOrders: 0,
    failedOrders: 0,
    totalAmount: 0,
    successAmount: 0,
    avgSuccessRate: 0,
    avgProcessingTime: 0
  };
};

module.exports = mongoose.model('PaymentStats', paymentStatsSchema);
