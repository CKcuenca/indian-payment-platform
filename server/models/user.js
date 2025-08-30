const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  // 邮箱字段已移除
  phone: {
    type: String,
    trim: true,
    match: /^\+?[1-9]\d{1,14}$/
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // 认证信息
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // 角色和权限
  role: {
    type: String,
    enum: ['admin', 'operator', 'merchant'],
    default: 'operator'
  },
  permissions: [{
    type: String,
    enum: [
      'VIEW_ALL_MERCHANTS',
      'MANAGE_MERCHANTS',
      'VIEW_PAYMENT_CONFIG',
      'MANAGE_PAYMENT_CONFIG',
      'VIEW_ALL_ORDERS',
      'VIEW_OWN_ORDERS',
      'VIEW_ALL_TRANSACTIONS',
      'VIEW_OWN_TRANSACTIONS',
      'MANAGE_USERS',
      'SYSTEM_MONITORING',
      'VIEW_OWN_MERCHANT_DATA'
    ]
  }],
  
  // 商户关联
  merchantId: {
    type: String,
    required: function() {
      return this.role === 'merchant';
    }
  },
  
  // 状态管理
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  lastLoginAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // 审计信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.isLocked;
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // 检查密码是否已经是加密的（以$2b$开头）
  if (this.password.startsWith('$2b$')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 增加登录失败次数
userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 锁定2小时
  }
  
  return this.updateOne(updates);
};

// 重置登录失败次数
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// 静态方法：根据角色获取默认权限
userSchema.statics.getDefaultPermissions = function(role) {
  const permissions = {
    admin: [
      'VIEW_ALL_MERCHANTS',
      'MANAGE_MERCHANTS',
      'VIEW_PAYMENT_CONFIG',
      'MANAGE_PAYMENT_CONFIG',
      'VIEW_ALL_ORDERS',
      'VIEW_ALL_TRANSACTIONS',
      'MANAGE_USERS',
      'SYSTEM_MONITORING'
    ],
    operator: [
      'VIEW_ALL_MERCHANTS',
      'VIEW_ALL_ORDERS',
      'VIEW_ALL_TRANSACTIONS'
    ],
    merchant: [
      'VIEW_OWN_ORDERS',
      'VIEW_OWN_TRANSACTIONS',
      'VIEW_OWN_MERCHANT_DATA'
    ],
    user: []
  };
  
  return permissions[role] || [];
};

// 索引
userSchema.index({ username: 1 });
// 邮箱索引已移除
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ merchantId: 1 });

module.exports = mongoose.model('User', userSchema);
