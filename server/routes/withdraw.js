const express = require('express');
const { body, validationResult } = require('express-validator');
const { apiKeyAuth } = require('../middleware/auth');
const paymentManager = require('../services/payment-service');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const ConcurrencyService = require('../services/concurrency-service-fixed');

const router = express.Router();

// 验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * 发起出款申请
 * POST /api/withdraw/create
 */
router.post('/create', apiKeyAuth, [
  body('merchantId').notEmpty().withMessage('Merchant ID is required'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('currency').optional().isIn(['INR', 'USD']).withMessage('Currency must be INR or USD'),
  body('bankAccount').isObject().withMessage('Bank account information is required'),
  body('bankAccount.accountNumber').notEmpty().withMessage('Account number is required'),
  body('bankAccount.ifscCode').notEmpty().withMessage('IFSC code is required'),
  body('bankAccount.accountHolderName').notEmpty().withMessage('Account holder name is required'),
  body('bankAccount.bankName').optional().isString().withMessage('Bank name must be a string'),
  body('bankAccount.bankCode').optional().isString().withMessage('Bank code must be a string'),
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('provider').optional().isString().withMessage('Provider must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('notifyUrl').optional().isURL().withMessage('Valid notify URL is required'),
  body('returnUrl').optional().isURL().withMessage('Valid return URL is required'),
  validateRequest
], async (req, res) => {
  try {
    const {
      merchantId,
      amount,
      currency = 'INR',
      bankAccount,
      customerName,
      provider = 'unispay', // 默认使用unispay
      description,
      notifyUrl,
      returnUrl
    } = req.body;

    // 验证商户ID与认证用户匹配
    if (req.merchant && req.merchant.merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        error: 'Merchant ID mismatch'
      });
    }

    // 生成出款订单ID
    const orderId = Order.generateOrderId();

    // 计算手续费（默认0.5%）
    const fee = Math.round(amount * 0.005);

    // 使用并发服务创建出款订单
    const orderData = {
      orderId,
      merchantId,
      type: 'WITHDRAWAL',
      amount,
      currency,
      fee,
      provider: {
        name: provider
      },
      customer: {
        name: customerName
      },
      bankAccount,
      callback: {
        notifyUrl: notifyUrl,
        returnUrl: returnUrl
      },
      description: description || 'Withdrawal request'
    };

    const result = await ConcurrencyService.createOrderWithTransaction(orderData, merchantId);
    const { order, transaction } = result;

    // 调用支付服务发起出款
    const payoutResult = await paymentManager.payout(provider, {
      orderId,
      amount,
      currency,
      bankAccount,
      customerName,
      extra: {
        notifyUrl,
        returnUrl
      }
    });

    if (payoutResult.success) {
      // 更新订单状态
      await Order.findByIdAndUpdate(order._id, {
        status: 'PROCESSING',
        providerOrderId: payoutResult.data.providerOrderId,
        updatedAt: new Date()
      });

      // 更新交易状态
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'PROCESSING',
        providerTransactionId: payoutResult.data.providerOrderId,
        updatedAt: new Date()
      });

      return res.json({
        success: true,
        data: {
          orderId: orderId,
          amount: amount,
          currency: currency,
          fee: fee,
          status: 'PROCESSING',
          providerOrderId: payoutResult.data.providerOrderId,
          message: payoutResult.data.message
        }
      });
    } else {
      // 出款失败，更新订单状态
      await Order.findByIdAndUpdate(order._id, {
        status: 'FAILED',
        updatedAt: new Date()
      });

      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'FAILED',
        updatedAt: new Date()
      });

      return res.status(400).json({
        success: false,
        error: payoutResult.error,
        code: payoutResult.code
      });
    }

  } catch (error) {
    console.error('发起出款失败:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 查询出款状态
 * GET /api/withdraw/status/:orderId
 */
router.get('/status/:orderId', apiKeyAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { merchantId } = req.query;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: 'Merchant ID is required'
      });
    }

    // 验证商户ID与认证用户匹配
    if (req.merchant && req.merchant.merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        error: 'Merchant ID mismatch'
      });
    }

    // 查询订单
    const order = await Order.findOne({ orderId, merchantId, type: 'WITHDRAWAL' });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 如果订单状态已经是最终状态，直接返回
    if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(order.status)) {
      return res.json({
        success: true,
        data: {
          orderId: order.orderId,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          fee: order.fee,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          providerOrderId: order.providerOrderId
        }
      });
    }

    // 查询支付服务商的最新状态
    const payoutResult = await paymentManager.queryPayout(order.provider.name, orderId);

    if (payoutResult.success) {
      // 更新订单状态
      const newStatus = payoutResult.data.status;
      if (newStatus !== order.status) {
        await Order.findByIdAndUpdate(order._id, {
          status: newStatus,
          updatedAt: new Date()
        });

        // 更新交易状态
        await Transaction.findOneAndUpdate(
          { orderId: order.orderId },
          {
            status: newStatus,
            updatedAt: new Date()
          }
        );
      }

      return res.json({
        success: true,
        data: {
          orderId: order.orderId,
          status: newStatus,
          amount: order.amount,
          currency: order.currency,
          fee: order.fee,
          createdAt: order.createdAt,
          updatedAt: new Date(),
          providerOrderId: order.providerOrderId,
          message: payoutResult.data.message
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: payoutResult.error
      });
    }

  } catch (error) {
    console.error('查询出款状态失败:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 获取出款订单列表
 * GET /api/withdraw/list
 */
router.get('/list', apiKeyAuth, async (req, res) => {
  try {
    const { merchantId, status, page = 1, limit = 20 } = req.query;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: 'Merchant ID is required'
      });
    }

    // 验证商户ID与认证用户匹配
    if (req.merchant && req.merchant.merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        error: 'Merchant ID mismatch'
      });
    }

    // 构建查询条件
    const query = { merchantId, type: 'WITHDRAWAL' };
    if (status) {
      query.status = status;
    }

    // 分页查询
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Order.countDocuments(query);

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('获取出款订单列表失败:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 取消出款申请
 * POST /api/withdraw/:orderId/cancel
 */
router.post('/:orderId/cancel', apiKeyAuth, [
  body('merchantId').notEmpty().withMessage('Merchant ID is required'),
  body('reason').notEmpty().withMessage('Cancel reason is required'),
  validateRequest
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const { merchantId, reason } = req.body;

    // 验证商户ID与认证用户匹配
    if (req.merchant && req.merchant.merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        error: 'Merchant ID mismatch'
      });
    }

    // 查询订单
    const order = await Order.findOne({ orderId, merchantId, type: 'WITHDRAWAL' });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 检查订单状态是否可以取消
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled in current status'
      });
    }

    // 更新订单状态
    await Order.findByIdAndUpdate(order._id, {
      status: 'CANCELLED',
      updatedAt: new Date(),
      cancelReason: reason
    });

    // 更新交易状态
    await Transaction.findOneAndUpdate(
      { orderId: order.orderId },
      {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    );

    return res.json({
      success: true,
      data: {
        orderId: order.orderId,
        status: 'CANCELLED',
        message: '出款申请已取消'
      }
    });

  } catch (error) {
    console.error('取消出款申请失败:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
