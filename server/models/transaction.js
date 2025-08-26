const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // 交易基本信息
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  
  // 交易类型
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'REFUND', 'ADJUSTMENT', 'WAKE_UP'],
    required: true
  },
  
  // 金额信息
  amount: {
    type: Number,
    required: true // 以分为单位
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // 余额变化
  balanceChange: {
    type: Number,
    required: true // 正数表示增加，负数表示减少
  },
  
  // 余额快照
  balanceSnapshot: {
    before: {
      type: Number,
      required: true
    },
    after: {
      type: Number,
      required: true
    }
  },
  
  // 交易状态
  status: {
    type: String,
    enum: [
      // 基础状态
      'PENDING',           // 待处理
      'SUCCESS',           // 成功
      'FAILED',            // 失败
      
      // 高级状态
      'TIMEOUT',           // 超时
      'CANCELLED',         // 已取消
      'REFUNDED',          // 已退款
      'PARTIAL_REFUNDED',  // 部分退款
      'DISPUTED',          // 争议中
      'DISPUTE_RESOLVED',  // 争议已解决
      'RISK_BLOCKED',      // 风控拦截
      'MANUAL_REVIEW',     // 人工审核
      'REVERSED',          // 已冲正
      'EXPIRED'            // 已过期
    ],
    default: 'PENDING'
  },
  
  // 支付提供者信息
  provider: {
    name: String,
    transactionId: String,
    utrNumber: String    // UTR交易号
  },
  
  // 描述信息
  description: String,
  
  // 错误信息
  error: {
    code: String,
    message: String
  },
  
  // 时间信息
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// 生成交易ID的静态方法
transactionSchema.statics.generateTransactionId = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6);
  return `TXN${timestamp}${random}`.toUpperCase();
};

// 索引
transactionSchema.index({ merchantId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
