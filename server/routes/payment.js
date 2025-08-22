const express = require('express');
const { body, validationResult } = require('express-validator');
const { apiKeyAuth } = require('../middleware/auth');
const PaymentController = require('../controllers/payment-controller');

const router = express.Router();

// 验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// 创建支付订单
router.post('/create', apiKeyAuth, [
  body('merchantId').notEmpty().withMessage('Merchant ID is required'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('currency').optional().isIn(['INR', 'USD']).withMessage('Currency must be INR or USD'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
  body('customerPhone').notEmpty().withMessage('Customer phone is required'),
  body('returnUrl').isURL().withMessage('Valid return URL is required'),
  body('notifyUrl').optional().isURL().withMessage('Valid notify URL is required'),
  body('provider').optional().isString().withMessage('Provider must be a string'),
  validateRequest
], PaymentController.createPayment);

// 查询订单状态
router.get('/status/:orderId', PaymentController.queryOrder);

// 更新订单状态（内部API，需要验证）
router.post('/status/:orderId', [
  body('status').isIn([
    'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED',
    'TIMEOUT', 'PARTIAL_SUCCESS', 'REFUNDED', 'PARTIAL_REFUNDED',
    'DISPUTED', 'DISPUTE_RESOLVED', 'RISK_BLOCKED', 'MANUAL_REVIEW',
    'REVERSED', 'EXPIRED'
  ]).withMessage('Invalid status'),
  body('providerTransactionId').optional().isString().withMessage('Provider transaction ID must be a string'),
  validateRequest
], PaymentController.updateOrderStatus);

// 批量更新订单状态
router.post('/batch-status', [
  body('updates').isArray().withMessage('Updates must be an array'),
  validateRequest
], PaymentController.batchUpdateOrderStatus);

// 获取可用支付提供者
router.get('/providers', PaymentController.getAvailableProviders);

// 退款处理
router.post('/refund/:orderId', [
  body('refundAmount').isInt({ min: 1 }).withMessage('Refund amount must be a positive integer'),
  body('reason').notEmpty().withMessage('Refund reason is required'),
  body('operator').notEmpty().withMessage('Operator is required'),
  validateRequest
], PaymentController.handleRefund);

// 争议处理
router.post('/dispute/:orderId', [
  body('reason').notEmpty().withMessage('Dispute reason is required'),
  body('operator').notEmpty().withMessage('Operator is required'),
  validateRequest
], PaymentController.handleDispute);

// 解决争议
router.post('/dispute/:orderId/resolve', [
  body('resolution').notEmpty().withMessage('Resolution is required'),
  body('operator').notEmpty().withMessage('Operator is required'),
  validateRequest
], PaymentController.resolveDispute);

// 风控拦截
router.post('/block/:orderId', [
  body('riskLevel').isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid risk level'),
  body('riskFactors').isArray().withMessage('Risk factors must be an array'),
  body('blockedReason').notEmpty().withMessage('Blocked reason is required'),
  validateRequest
], PaymentController.blockOrder);

// 订单状态统计
router.get('/stats/orders', PaymentController.getOrderStatusStats);

module.exports = router;
