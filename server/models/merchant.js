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
    // IP白名单配置
    ipWhitelist: {
      enabled: {
        type: Boolean,
        default: false
      },
      strictMode: {
        type: Boolean,
        default: false // 严格模式：必须IP验证通过
      },
      allowedIPs: [{
        ip: {
          type: String,
          required: true
        },
        mask: {
          type: Number,
          default: 32 // CIDR掩码，默认32（单个IP）
        },
        description: {
          type: String,
          default: ''
        },
        addedAt: {
          type: Date,
          default: Date.now
        },
        addedBy: {
          type: String,
          required: false
        },
        status: {
          type: String,
          enum: ['ACTIVE', 'INACTIVE'],
          default: 'ACTIVE'
        },
        lastUsed: {
          type: Date,
          required: false
        },
        usageCount: {
          type: Number,
          default: 0
        }
      }],
      // IP访问规则
      accessRules: {
        blockUnknownIPs: {
          type: Boolean,
          default: true // 是否阻止未知IP
        },
        maxFailedAttempts: {
          type: Number,
          default: 5 // 最大失败尝试次数
        },
        lockoutDuration: {
          type: Number,
          default: 300 // 锁定时间（秒）
        }
      }
    },
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

// IP白名单相关方法
merchantSchema.methods.addAllowedIP = function(ip, mask = 32, description = '', addedBy = 'system') {
  if (!this.security.ipWhitelist) {
    this.security.ipWhitelist = {
      enabled: false,
      strictMode: false,
      allowedIPs: [],
      accessRules: {
        blockUnknownIPs: true,
        maxFailedAttempts: 5,
        lockoutDuration: 300
      }
    };
  }
  
  // 检查IP是否已存在
  const existingIP = this.security.ipWhitelist.allowedIPs.find(
    item => item.ip === ip && item.mask === mask
  );
  
  if (existingIP) {
    return { success: false, message: 'IP already exists in whitelist' };
  }
  
  this.security.ipWhitelist.allowedIPs.push({
    ip,
    mask,
    description,
    addedBy,
    status: 'ACTIVE'
  });
  
  return { success: true, message: 'IP added to whitelist successfully' };
};

merchantSchema.methods.removeAllowedIP = function(ipId) {
  if (!this.security.ipWhitelist || !this.security.ipWhitelist.allowedIPs) {
    return { success: false, message: 'IP whitelist not configured' };
  }
  
  const index = this.security.ipWhitelist.allowedIPs.findIndex(
    item => item._id.toString() === ipId
  );
  
  if (index === -1) {
    return { success: false, message: 'IP not found in whitelist' };
  }
  
  this.security.ipWhitelist.allowedIPs.splice(index, 1);
  return { success: true, message: 'IP removed from whitelist successfully' };
};

merchantSchema.methods.updateIPStatus = function(ipId, status) {
  if (!this.security.ipWhitelist || !this.security.ipWhitelist.allowedIPs) {
    return { success: false, message: 'IP whitelist not configured' };
  }
  
  const ipEntry = this.security.ipWhitelist.allowedIPs.find(
    item => item._id.toString() === ipId
  );
  
  if (!ipEntry) {
    return { success: false, message: 'IP not found in whitelist' };
  }
  
  ipEntry.status = status;
  return { success: true, message: 'IP status updated successfully' };
};

merchantSchema.methods.isIPAllowed = function(clientIP) {
  if (!this.security.ipWhitelist || !this.security.ipWhitelist.enabled) {
    return { allowed: true, reason: 'IP whitelist not enabled' };
  }
  
  if (!this.security.ipWhitelist.allowedIPs || this.security.ipWhitelist.allowedIPs.length === 0) {
    return { 
      allowed: !this.security.ipWhitelist.strictMode, 
      reason: this.security.ipWhitelist.strictMode ? 'No IPs in whitelist (strict mode)' : 'No IPs configured but not in strict mode'
    };
  }
  
  // 检查IP是否在白名单中
  for (const ipEntry of this.security.ipWhitelist.allowedIPs) {
    if (ipEntry.status !== 'ACTIVE') continue;
    
    if (this.isIPInRange(clientIP, ipEntry.ip, ipEntry.mask)) {
      // 更新使用统计
      ipEntry.lastUsed = new Date();
      ipEntry.usageCount = (ipEntry.usageCount || 0) + 1;
      
      return { 
        allowed: true, 
        reason: 'IP found in whitelist',
        matchedEntry: ipEntry
      };
    }
  }
  
  return { 
    allowed: false, 
    reason: 'IP not found in whitelist' 
  };
};

merchantSchema.methods.isIPInRange = function(clientIP, allowedIP, mask) {
  if (mask === 32) {
    return clientIP === allowedIP;
  }
  
  // CIDR计算逻辑
  try {
    const clientIPNum = this.ipToNumber(clientIP);
    const allowedIPNum = this.ipToNumber(allowedIP);
    const maskNum = (0xFFFFFFFF << (32 - mask)) >>> 0;
    
    return (clientIPNum & maskNum) === (allowedIPNum & maskNum);
  } catch (error) {
    console.error('IP range calculation error:', error);
    return false;
  }
};

merchantSchema.methods.ipToNumber = function(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};

// 生成商户ID的静态方法
merchantSchema.statics.generateMerchantId = function() {
  return 'MERCHANT_' + Date.now().toString(36).toUpperCase();
};

// 生成API密钥的静态方法
merchantSchema.statics.generateApiKey = function() {
  const crypto = require('crypto');
  return 'API_' + crypto.randomBytes(16).toString('hex').toUpperCase();
};

// 生成Secret密钥的静态方法
merchantSchema.statics.generateSecretKey = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.models.Merchant || mongoose.model('Merchant', merchantSchema);
