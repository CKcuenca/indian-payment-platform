const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const PaymentConfig = require('../models/PaymentConfig');
const { apiKeyAuth } = require('../middleware/auth');

/**
 * 查询订单支付状态
 */
router.get('/order/:orderId', apiKeyAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 查找订单
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单未找到'
      });
    }

    // 查找相关交易记录
    const transactions = await Transaction.find({ orderId: order._id })
      .sort({ createdAt: -1 });

    // 获取支付配置
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': order.provider
    });

    res.json({
      success: true,
      data: {
        order: {
          orderId: order.orderId,
          amount: order.amount,
          status: order.status,
          provider: order.provider,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          paidAt: order.paidAt
        },
        transactions,
        paymentConfig: paymentConfig ? {
          provider: paymentConfig.provider.name,
          environment: paymentConfig.provider.environment,
          status: paymentConfig.status
        } : null
      }
    });

  } catch (error) {
    console.error('查询订单状态失败:', error);
    res.status(500).json({
      success: false,
      error: '查询订单状态失败'
    });
  }
});

/**
 * 主动查询PassPay订单状态
 */
router.post('/passpay/query', apiKeyAuth, async (req, res) => {
  try {
    const { orderId, tradeNo } = req.body;

    if (!orderId && !tradeNo) {
      return res.status(400).json({
        success: false,
        error: '必须提供orderId或tradeNo'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay',
      status: 'ACTIVE'
    });

    if (!passpayConfig) {
      return res.status(400).json({
        success: false,
        error: '未找到有效的PassPay配置'
      });
    }

    // 导入PassPay服务
    const PassPayProvider = require('../services/payment-providers/passpay-provider');
    const passpay = new PassPayProvider(passpayConfig);

    let queryResult;
    if (tradeNo) {
      // 使用tradeNo查询
      queryResult = await passpay.queryCollectionOrderStatus(null, tradeNo);
    } else {
      // 使用orderId查询
      queryResult = await passpay.queryCollectionOrderStatus(orderId);
    }

    if (queryResult.success) {
      // 更新本地订单状态
      const order = await Order.findOne({ orderId: queryResult.data.orderId });
      if (order) {
        const updateData = {
          status: queryResult.data.status,
          updatedAt: new Date(),
          'paymentDetails.tradeNo': queryResult.data.tradeNo,
          'paymentDetails.utr': queryResult.data.utr
        };

        if (queryResult.data.status === 'SUCCESS') {
          updateData.paidAt = new Date();
        }

        await Order.findByIdAndUpdate(order._id, updateData);
      }

      res.json({
        success: true,
        data: queryResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: queryResult.error
      });
    }

  } catch (error) {
    console.error('查询PassPay订单状态失败:', error);
    res.status(500).json({
      success: false,
      error: '查询PassPay订单状态失败'
    });
  }
});

/**
 * 批量查询订单状态
 */
router.post('/batch-query', apiKeyAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '必须提供订单ID数组'
      });
    }

    // 限制批量查询数量
    if (orderIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: '批量查询最多支持50个订单'
      });
    }

    const results = [];
    for (const orderId of orderIds) {
      try {
        const order = await Order.findOne({ orderId });
        if (order) {
          results.push({
            orderId,
            status: order.status,
            amount: order.amount,
            provider: order.provider,
            updatedAt: order.updatedAt
          });
        } else {
          results.push({
            orderId,
            status: 'NOT_FOUND',
            error: '订单未找到'
          });
        }
      } catch (error) {
        results.push({
          orderId,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        total: orderIds.length,
        results
      }
    });

  } catch (error) {
    console.error('批量查询订单状态失败:', error);
    res.status(500).json({
      success: false,
      error: '批量查询订单状态失败'
    });
  }
});

/**
 * 获取支付状态统计
 */
router.get('/stats', apiKeyAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // 统计各状态订单数量
    const statusStats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // 统计各支付商订单数量
    const providerStats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        statusStats,
        providerStats,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('获取支付状态统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付状态统计失败'
    });
  }
});

module.exports = router;
