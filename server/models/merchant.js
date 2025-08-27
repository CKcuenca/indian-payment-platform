const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  // 商户基本信息
  merchantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false,
    unique: false
  },
  phone: {
    type: String,
    required: false
  },
  
  // 商户状态
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  
  // API密钥
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  secretKey: {
    type: String,
    required: true
  },
  
  // 支付配置
  paymentConfig: {
    defaultProvider: {
      type: String,
      default: 'airpay'
    },
    providers: [{
      name: String,
      enabled: {
        type: Boolean,
        default: true
      },
      config: mongoose.Schema.Types.Mixed
    }],
    // 费率配置
    fees: {
      deposit: {
        type: Number,
        default: 0.01 // 1%
      },
      withdrawal: {
        type: Number,
        default: 0.01 // 1%
      }
    },
    // 限额配置
    limits: {
      minDeposit: {
        type: Number,
        default: 100 // 1卢比
      },
      maxDeposit: {
        type: Number,
        default: 5000000 // 5万卢比
      },
      minWithdrawal: {
        type: Number,
        default: 100 // 1卢比
      },
      maxWithdrawal: {
        type: Number,
        default: 5000000 // 5万卢比
      },
      dailyLimit: {
        type: Number,
        default: 50000000 // 50万卢比
      },
      monthlyLimit: {
        type: Number,
        default: 500000000 // 500万卢比
      },
      allowLargeTransactions: {
        type: Boolean,
        default: false
      },
      maxLargeTransactionsPerDay: {
        type: Number,
        default: 3
      }
    }
  },
  
  // 余额信息
  balance: {
    available: {
      type: Number,
      default: 0
    },
    frozen: {
      type: Number,
      default: 0
    }
  },
  
  // 回调URL配置
  callbackUrls: {
    paymentSuccess: String,
    paymentFailed: String,
    withdrawalSuccess: String,
    withdrawalFailed: String
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
});

// 更新时间中间件
merchantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 生成API密钥的静态方法
merchantSchema.statics.generateApiKey = function() {
  return 'pk_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// 生成密钥的静态方法
merchantSchema.statics.generateSecretKey = function() {
  return 'sk_' + Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
};

module.exports = mongoose.models.Merchant || mongoose.model('Merchant', merchantSchema);
