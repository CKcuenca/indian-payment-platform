const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // 订单基本信息
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  merchantId: {
    type: String,
    required: true,
    index: true
  },
  
  // 订单类型
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'WAKE_UP'],
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
  fee: {
    type: Number,
    default: 0 // 手续费，以分为单位
  },
  
  // 支付提供者信息
  provider: {
    name: {
      type: String,
      required: true
    },
    transactionId: String,
    providerOrderId: String,
    utrNumber: String,    // UTR交易号
    utrAmount: Number     // UTR金额
  },
  
  // 订单状态
  status: {
    type: String,
    enum: [
      // 基础状态
      'PENDING',           // 待处理 - 订单已创建，等待用户支付
      'PROCESSING',        // 处理中 - 用户已支付，正在处理
      'SUCCESS',           // 成功 - 支付成功，资金已到账
      'FAILED',            // 失败 - 支付失败
      'CANCELLED',         // 已取消 - 用户或系统取消
      
      // 高级状态
      'TIMEOUT',           // 超时 - 支付超时
      'PARTIAL_SUCCESS',   // 部分成功 - 部分金额到账
      'REFUNDED',          // 已退款 - 订单已退款
      'PARTIAL_REFUNDED',  // 部分退款 - 部分金额已退款
      'DISPUTED',          // 争议中 - 订单存在争议
      'DISPUTE_RESOLVED',  // 争议已解决 - 争议处理完成
      'RISK_BLOCKED',      // 风控拦截 - 被风控系统拦截
      'MANUAL_REVIEW',     // 人工审核 - 需要人工审核
      'REVERSED',          // 已冲正 - 交易被冲正
      'EXPIRED'            // 已过期 - 订单已过期
    ],
    default: 'PENDING'
  },
  
  // 客户信息
  customer: {
    email: String,
    phone: String,
    name: String,
    userId: String
  },
  
  // 银行账户信息（代付时使用）
  bankAccount: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  
  // 回调信息
  callback: {
    successUrl: String,
    failureUrl: String,
    notifyUrl: String
  },
  
  // 错误信息
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // 退款信息
  refund: {
    amount: Number,        // 退款金额
    reason: String,        // 退款原因
    refundedAt: Date,      // 退款时间
    refundId: String,      // 退款ID
    operator: String       // 操作人
  },
  
  // 争议信息
  dispute: {
    reason: String,        // 争议原因
    raisedAt: Date,        // 争议发起时间
    resolvedAt: Date,      // 争议解决时间
    resolution: String,    // 争议解决结果
    operator: String       // 处理人
  },
  
  // 风控信息
  riskInfo: {
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW'
    },
    riskFactors: [String], // 风险因素
    blockedReason: String, // 拦截原因
    reviewedBy: String,    // 审核人
    reviewedAt: Date       // 审核时间
  },
  
  // 时间信息
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,            // 支付时间
  completedAt: Date,       // 完成时间
  expiredAt: Date,         // 过期时间
  timeoutAt: Date,         // 超时时间
  cancelledAt: Date,       // 取消时间
  failedAt: Date,          // 失败时间
  refundedAt: Date,        // 退款时间
  disputedAt: Date,        // 争议时间
  disputeResolvedAt: Date, // 争议解决时间
  riskBlockedAt: Date,     // 风控拦截时间
  manualReviewAt: Date,    // 人工审核时间
  reversedAt: Date,        // 冲正时间
  processingStartedAt: Date, // 处理开始时间
  statusUpdatedAt: Date,   // 状态更新时间
  
  // 操作历史记录（幂等性支持）
  operations: [{
    operationId: String,
    fromStatus: String,
    toStatus: String,
    additionalData: mongoose.Schema.Types.Mixed,
    executedBy: String,
    executedAt: Date
  }],
  
  // 状态历史记录
  statusHistory: [{
    status: String,
    timestamp: Date,
    reason: String,
    executedBy: String
  }]
});

// 更新时间中间件
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 生成订单ID的静态方法
orderSchema.statics.generateOrderId = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6);
  return `ORD${timestamp}${random}`.toUpperCase();
};

// 索引
orderSchema.index({ merchantId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'provider.transactionId': 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
