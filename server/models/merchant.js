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
  
  // API密钥对
  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  secretKey: {
    type: String,
    required: true
  },
  
  // 商户状态
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  
  // 余额
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
  
  // 默认支付商
  defaultProvider: {
    type: String,
    default: 'AirPay'
  },
  
  // 用户绑定字段
  userId: {
    type: String,
    required: false,
    index: true
  },
  username: {
    type: String,
    required: false
  },
  userFullName: {
    type: String,
    required: false
  },
  
  // 代收（充值）配置
  deposit: {
    fee: {
      percentage: {
        type: Number,
        default: 5.0
      },
      fixedAmount: {
        type: Number,
        default: 0
      }
    },
    limits: {
      minAmount: {
        type: Number,
        default: 100
      },
      maxAmount: {
        type: Number,
        default: 100000
      },
      dailyLimit: {
        type: Number,
        default: 100000000
      },
      monthlyLimit: {
        type: Number,
        default: 1000000000
      },
      singleTransactionLimit: {
        type: Number,
        default: 10000000
      }
    },
    usage: {
      dailyUsed: {
        type: Number,
        default: 0
      },
      monthlyUsed: {
        type: Number,
        default: 0
      },
      lastResetDate: {
        type: Date,
        default: Date.now
      }
    }
  },
  
  // 代付（提现）配置
  withdrawal: {
    fee: {
      percentage: {
        type: Number,
        default: 3.0
      },
      fixedAmount: {
        type: Number,
        default: 6
      }
    },
    limits: {
      minAmount: {
        type: Number,
        default: 500
      },
      maxAmount: {
        type: Number,
        default: 50000
      },
      dailyLimit: {
        type: Number,
        default: 100000000
      },
      monthlyLimit: {
        type: Number,
        default: 1000000000
      },
      singleTransactionLimit: {
        type: Number,
        default: 10000000
      }
    },
    usage: {
      dailyUsed: {
        type: Number,
        default: 0
      },
      monthlyUsed: {
        type: Number,
        default: 0
      },
      lastResetDate: {
        type: Date,
        default: Date.now
      }
    }
  },
  
  // 支付配置关联
  paymentConfigs: [{
    type: String
  }],
  
  // 安全管理
  security: {
    keyStatus: {
      type: String,
      enum: ['ACTIVE', 'DISABLED', 'EXPIRED'],
      default: 'ACTIVE'
    },
    lastKeyUpdate: {
      type: Date,
      default: Date.now
    },
    keyUpdateBy: {
      type: String,
      required: false
    },
    keyHistory: [{
      apiKey: String,
      secretKey: String,
      deprecatedAt: Date,
      reason: String
    }],
    usage: {
      dailyCount: {
        type: Number,
        default: 0
      },
      monthlyCount: {
        type: Number,
        default: 0
      },
      lastUsed: {
        type: Date,
        default: Date.now
      },
      lastResetDate: {
        type: Date,
        default: Date.now
      }
    }
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

// 虚拟字段：总余额
merchantSchema.virtual('totalBalance').get(function() {
  return this.balance.available + this.balance.frozen;
});

// 虚拟字段：可用余额
merchantSchema.virtual('availableBalance').get(function() {
  return this.balance.available;
});

// 虚拟字段：冻结余额
merchantSchema.virtual('frozenBalance').get(function() {
  return this.balance.frozen;
});

// 方法：冻结余额
merchantSchema.methods.freezeBalance = function(amount) {
  if (this.balance.available >= amount) {
    this.balance.available -= amount;
    this.balance.frozen += amount;
    return true;
  }
  return false;
};

// 方法：解冻余额
merchantSchema.methods.unfreezeBalance = function(amount) {
  if (this.balance.frozen >= amount) {
    this.balance.frozen -= amount;
    this.balance.available += amount;
    return true;
  }
  return false;
};

// 方法：增加可用余额
merchantSchema.methods.addAvailableBalance = function(amount) {
  this.balance.available += amount;
  return this.save();
};

// 方法：减少可用余额
merchantSchema.methods.reduceAvailableBalance = function(amount) {
  if (this.balance.available >= amount) {
    this.balance.available -= amount;
    return this.save();
  }
  return false;
};

// 生成商户ID的静态方法
merchantSchema.statics.generateMerchantId = function() {
  return 'MERCHANT_' + Date.now().toString(36).toUpperCase();
};

module.exports = mongoose.models.Merchant || mongoose.model('Merchant', merchantSchema);
