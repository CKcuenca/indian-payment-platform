const mongoose = require('mongoose');

const telegramGroupSchema = new mongoose.Schema({
  // 群组基本信息
  chatId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  chatTitle: {
    type: String,
    required: true
  },
  chatType: {
    type: String,
    enum: ['group', 'supergroup', 'private'],
    required: true
  },
  
  // 绑定商户信息
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  
  // 绑定状态
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  
  // 绑定操作信息
  bindInfo: {
    operatorId: String,        // 操作员Telegram用户ID
    operatorUsername: String,  // 操作员Telegram用户名
    bindTime: {
      type: Date,
      default: Date.now
    },
    bindReason: String         // 绑定原因/备注
  },
  
  // 群组设置
  settings: {
    // 允许的功能
    allowedCommands: {
      type: [String],
      default: ['balance', 'statistics', 'deposit_query', 'withdrawal_query', 'payout_proof', 'upi_query', 'utr_query', 'utr_fix']
    },
    
    // 是否允许所有群成员使用
    allowAllMembers: {
      type: Boolean,
      default: false
    },
    
    // 授权用户列表 (如果不允许所有成员)
    authorizedUsers: [String], // Telegram用户ID列表
    
    // 通知设置
    notifications: {
      welcomeMessage: {
        type: Boolean,
        default: true
      },
      dailyReport: {
        type: Boolean,
        default: false
      },
      alertThreshold: {
        type: Number,
        default: 0 // 余额告警阈值
      }
    }
  },
  
  // 使用统计
  usage: {
    totalCommands: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    commandStats: {
      balance: { type: Number, default: 0 },
      statistics: { type: Number, default: 0 },
      deposit_query: { type: Number, default: 0 },
      withdrawal_query: { type: Number, default: 0 },
      payout_proof: { type: Number, default: 0 },
      upi_query: { type: Number, default: 0 },
      utr_query: { type: Number, default: 0 },
      utr_fix: { type: Number, default: 0 }
    }
  },
  
  // 群组成员信息 (可选)
  members: [{
    userId: String,
    username: String,
    firstName: String,
    joinedAt: Date,
    role: {
      type: String,
      enum: ['creator', 'administrator', 'member', 'restricted', 'left', 'kicked'],
      default: 'member'
    }
  }],
  
  // 时间信息
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
telegramGroupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 索引
telegramGroupSchema.index({ merchantId: 1, status: 1 });
telegramGroupSchema.index({ chatId: 1, status: 1 });
telegramGroupSchema.index({ 'bindInfo.operatorId': 1 });

// 实例方法：检查用户权限
telegramGroupSchema.methods.checkUserPermission = function(userId) {
  // 如果允许所有成员使用
  if (this.settings.allowAllMembers) {
    return true;
  }
  
  // 检查是否在授权用户列表中
  return this.settings.authorizedUsers.includes(userId.toString());
};

// 实例方法：检查命令权限
telegramGroupSchema.methods.checkCommandPermission = function(command) {
  return this.settings.allowedCommands.includes(command);
};

// 实例方法：更新使用统计
telegramGroupSchema.methods.updateUsage = function(command) {
  this.usage.totalCommands += 1;
  this.usage.lastUsed = new Date();
  this.lastActivity = new Date();
  
  if (this.usage.commandStats[command] !== undefined) {
    this.usage.commandStats[command] += 1;
  }
  
  return this.save();
};

// 静态方法：根据chatId查找群组
telegramGroupSchema.statics.findByChatId = function(chatId) {
  return this.findOne({ chatId: chatId.toString(), status: 'ACTIVE' });
};

// 静态方法：根据商户ID查找群组
telegramGroupSchema.statics.findByMerchantId = function(merchantId) {
  return this.find({ merchantId, status: 'ACTIVE' });
};

// 静态方法：绑定群组到商户
telegramGroupSchema.statics.bindGroup = async function(chatInfo, merchantId, operatorInfo) {
  const existingGroup = await this.findOne({ chatId: chatInfo.id.toString() });
  
  if (existingGroup) {
    // 更新现有绑定
    existingGroup.merchantId = merchantId;
    existingGroup.chatTitle = chatInfo.title || chatInfo.first_name || 'Unknown';
    existingGroup.chatType = chatInfo.type;
    existingGroup.bindInfo = {
      operatorId: operatorInfo.id.toString(),
      operatorUsername: operatorInfo.username,
      bindTime: new Date(),
      bindReason: '重新绑定商户'
    };
    existingGroup.status = 'ACTIVE';
    
    return await existingGroup.save();
  } else {
    // 创建新的绑定
    const newGroup = new this({
      chatId: chatInfo.id.toString(),
      chatTitle: chatInfo.title || chatInfo.first_name || 'Unknown',
      chatType: chatInfo.type,
      merchantId,
      bindInfo: {
        operatorId: operatorInfo.id.toString(),
        operatorUsername: operatorInfo.username,
        bindTime: new Date(),
        bindReason: '初始绑定商户'
      }
    });
    
    return await newGroup.save();
  }
};

module.exports = mongoose.models.TelegramGroup || mongoose.model('TelegramGroup', telegramGroupSchema);