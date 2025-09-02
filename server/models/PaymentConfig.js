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
    subType: {
      type: String,
      enum: ['third_party', 'fourth_party', 'wakeup'],
      default: function() {
        // 根据支付商类型智能设置默认值，使用安全访问
        const providerName = this.provider?.name;
        if (providerName && ['dhpay', 'unispay'].includes(providerName)) {
          return 'wakeup';
        }
        return 'third_party';
      }
    },
    accountId: {
      type: String,
      required: true
    },
    apiKey: {
      type: String,
      required: function() {
        // 使用this.provider?.name来安全访问，避免undefined错误
        const providerName = this.provider?.name;
        return providerName && !['dhpay', 'unispay'].includes(providerName);
      },
      // 对于dhpay和unispay，允许空字符串或undefined
      validate: {
        validator: function(value) {
          const providerName = this.provider?.name;
          console.log(`🔍 API Key验证 - provider: ${providerName}, value: "${value}"`);
          if (providerName && ['dhpay', 'unispay'].includes(providerName)) {
            console.log(`✅ dhpay/unispay提供商，允许空值`);
            return true; // 对于这些提供商，任何值都有效
          }
          const isValid = value && value.trim().length > 0;
          console.log(`❌ 其他提供商，验证结果: ${isValid}`);
          return isValid; // 其他提供商必须有值
        },
        message: 'API Key is required for this provider'
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
    },
    mchNo: {
      type: String,
      required: function() {
        // 只有UniSpay需要mchNo，使用安全访问
        const providerName = this.provider?.name;
        return providerName === 'unispay';
      },
      validate: {
        validator: function(value) {
          const providerName = this.provider?.name;
          if (providerName === 'unispay') {
            return value && value.trim().length > 0; // UniSpay需要mchNo
          }
          return true; // 其他提供商不需要mchNo
        },
        message: 'Merchant Number is required for UniSpay'
      },
      default: undefined
    }
  },
  
  // 额度设置
  limits: {
    // 代收限额
    collection: {
      dailyLimit: {
        type: Number,
        required: true,
        default: 1000000, // 100万卢比
        min: 0
      },
      monthlyLimit: {
        type: Number,
        required: true,
        default: 10000000, // 1000万卢比
        min: 0
      },
      singleTransactionLimit: {
        type: Number,
        required: true,
        default: 100000, // 10万卢比
        min: 0
      },
      minTransactionAmount: {
        type: Number,
        required: true,
        default: 100, // 100卢比
        min: 0
      }
    },
    // 代付限额
    payout: {
      dailyLimit: {
        type: Number,
        required: true,
        default: 1000000, // 100万卢比
        min: 0
      },
      monthlyLimit: {
        type: Number,
        required: true,
        default: 10000000, // 1000万卢比
        min: 0
      },
      singleTransactionLimit: {
        type: Number,
        required: true,
        default: 100000, // 10万卢比
        min: 0
      },
      minTransactionAmount: {
        type: Number,
        required: true,
        default: 100, // 100卢比
        min: 0
      }
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
    // 代收费率
    collection: {
      transactionFee: {
        type: Number,
        default: 0.5, // 0.5%
        min: 0,
        max: 10
      },
      fixedFee: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    // 代付费率
    payout: {
      transactionFee: {
        type: Number,
        default: 0.3, // 0.3%
        min: 0,
        max: 10
      },
      fixedFee: {
        type: Number,
        default: 5,
        min: 0
      }
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
  return Math.max(0, this.limits.collection.dailyLimit - this.usage.dailyUsed);
});

paymentConfigSchema.virtual('remainingMonthlyLimit').get(function() {
  return Math.max(0, this.limits.collection.monthlyLimit - this.usage.monthlyUsed);
});

// 方法：检查额度是否足够
paymentConfigSchema.methods.checkLimit = function(amount) {
  if (amount > this.limits.collection.singleTransactionLimit) {
    return { valid: false, reason: 'SINGLE_TRANSACTION_LIMIT_EXCEEDED' };
  }
  
  if (amount < this.limits.collection.minTransactionAmount) {
    return { valid: false, reason: 'MIN_TRANSACTION_AMOUNT_NOT_MET' };
  }
  
  if (this.usage.dailyUsed + amount > this.limits.collection.dailyLimit) {
    return { valid: false, reason: 'DAILY_LIMIT_EXCEEDED' };
  }
  
  if (this.usage.monthlyUsed + amount > this.limits.collection.monthlyLimit) {
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
