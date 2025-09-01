const mongoose = require('mongoose');

const paymentConfigSchema = new mongoose.Schema({
  // 关联的商户ID（可选，用于系统级配置）
  merchantId: {
    type: String,
    required: false,
    index: true,
    default: 'system'  // 系统级配置默认值
  },
  
  // 支付账户基本信息
  accountName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // 支付提供商信息
  provider: {
    name: {
      type: String,
      required: true,
      enum: ['airpay', 'cashfree', 'razorpay', 'paytm', 'mock', 'passpay', 'wakeup', 'unispay', 'dhpay']
    },
    type: {
      type: String,
      enum: ['native', 'wakeup'],
      default: 'native'
    },
    accountId: {
      type: String,
      required: true
    },
    apiKey: {
      type: String,
      required: function() {
        return !['dhpay', 'unispay'].includes(this.provider.name);
      }
    },
    secretKey: {
      type: String,
      required: true
    },
    environment: {
      type: String,
      enum: ['sandbox', 'production', 'test'],
      default: 'sandbox'
    }
  },
  
  // 额度设置
  limits: {
    // 日限额
    dailyLimit: {
      type: Number,
      required: true,
      default: 1000000, // 100万卢比
      min: 0
    },
    // 月限额
    monthlyLimit: {
      type: Number,
      required: true,
      default: 10000000, // 1000万卢比
      min: 0
    },
    // 单笔限额
    singleTransactionLimit: {
      type: Number,
      required: true,
      default: 100000, // 10万卢比
      min: 0
    },
    // 最小交易金额
    minTransactionAmount: {
      type: Number,
      required: true,
      default: 100, // 100卢比
      min: 0
    },
    // 最大交易金额
    maxTransactionAmount: {
      type: Number,
      required: true,
      default: 5000000, // 50万卢比
      min: 0
    },
    // 大额交易阈值
    largeAmountThreshold: {
      type: Number,
      default: 100000000, // 1000万卢比
      min: 0
    },
    // 大额交易频率限制
    maxLargeTransactionsPerDay: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    }
  },
  
  // 使用统计
  usage: {
    // 今日使用额度
    dailyUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    // 本月使用额度
    monthlyUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    // 最后重置日期
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // 状态
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  
  // 优先级（用于负载均衡）
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // 费率设置
  fees: {
    // 手续费率（百分比）
    transactionFee: {
      type: Number,
      default: 0.5, // 0.5%
      min: 0,
      max: 10
    },
    // 固定手续费（卢比）
    fixedFee: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // 备注
  description: {
    type: String,
    trim: true
  },
  
  // 创建和更新时间
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

// 索引
paymentConfigSchema.index({ 'provider.name': 1, status: 1 });
paymentConfigSchema.index({ priority: 1, status: 1 });
paymentConfigSchema.index({ createdAt: -1 });

// 虚拟字段：剩余额度
paymentConfigSchema.virtual('remainingDailyLimit').get(function() {
  return Math.max(0, this.limits.dailyLimit - this.usage.dailyUsed);
});

paymentConfigSchema.virtual('remainingMonthlyLimit').get(function() {
  return Math.max(0, this.limits.monthlyLimit - this.usage.monthlyUsed);
});

// 方法：检查额度是否足够
paymentConfigSchema.methods.checkLimit = function(amount) {
  if (amount > this.limits.singleTransactionLimit) {
    return { valid: false, reason: 'SINGLE_TRANSACTION_LIMIT_EXCEEDED' };
  }
  
  if (amount < this.limits.minTransactionAmount) {
    return { valid: false, reason: 'MIN_TRANSACTION_AMOUNT_NOT_MET' };
  }
  
  if (this.usage.dailyUsed + amount > this.limits.dailyLimit) {
    return { valid: false, reason: 'DAILY_LIMIT_EXCEEDED' };
  }
  
  if (this.usage.monthlyUsed + amount > this.limits.monthlyLimit) {
    return { valid: false, reason: 'MONTHLY_LIMIT_EXCEEDED' };
  }
  
  return { valid: true };
};

// 方法：更新使用额度
paymentConfigSchema.methods.updateUsage = function(amount) {
  this.usage.dailyUsed += amount;
  this.usage.monthlyUsed += amount;
  return this.save();
};

// 中间件：保存前更新时间
paymentConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 静态方法：重置每日额度
paymentConfigSchema.statics.resetDailyLimits = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await this.updateMany(
    { 'usage.lastResetDate': { $lt: today } },
    { 
      $set: { 
        'usage.dailyUsed': 0,
        'usage.lastResetDate': today
      }
    }
  );
  
  return result;
};

// 静态方法：重置每月额度
paymentConfigSchema.statics.resetMonthlyLimits = async function() {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);
  
  const result = await this.updateMany(
    { 'usage.lastResetDate': { $lt: firstDayOfMonth } },
    { 
      $set: { 
        'usage.monthlyUsed': 0,
        'usage.lastResetDate': firstDayOfMonth
      }
    }
  );
  
  return result;
};

module.exports = mongoose.model('PaymentConfig', paymentConfigSchema);
