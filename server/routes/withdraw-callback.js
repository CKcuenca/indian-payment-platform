const express = require('express');
const PaymentManager = require('../services/payment-manager');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const PaymentConfig = require('../models/PaymentConfig');

const router = express.Router();

/**
 * 处理UniSpay出款回调通知
 * POST /api/webhook/unispay/withdraw
 */
router.post('/unispay/withdraw', async (req, res) => {
  try {
    console.log('🔔 收到UniSpay出款回调通知:', JSON.stringify(req.body, null, 2));

    const notificationData = req.body;
    const { mchOrderId, orderNo, state, amount, currency, successTime, msg } = notificationData;

    if (!mchOrderId || !orderNo) {
      console.error('❌ UniSpay出款回调缺少必要参数');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 查询订单
    const order = await Order.findOne({ orderId: mchOrderId, type: 'WITHDRAWAL' });
    if (!order) {
      console.error(`❌ 未找到出款订单: ${mchOrderId}`);
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 获取支付配置
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'provider.accountId': order.provider.accountId || order.provider.merchantId
    });

    if (!paymentConfig) {
      console.error(`❌ 未找到UniSpay支付配置`);
      return res.status(500).json({
        success: false,
        error: 'Payment configuration not found'
      });
    }

    // 创建UniSpay提供者实例
    const paymentManager = new PaymentManager();
    paymentManager.registerProvider('unispay', require('../services/payment-providers/unispay-provider'), {
      accountId: paymentConfig.provider.accountId,
      apiKey: paymentConfig.provider.apiKey,
      secretKey: paymentConfig.provider.secretKey,
      environment: paymentConfig.provider.environment
    });

    // 处理出款通知
    const notificationResult = await paymentManager.providers.get('unispay').handlePayoutNotification(notificationData);

    if (notificationResult.success) {
      const payoutInfo = notificationResult.data;
      
      // 更新订单状态
      await Order.findByIdAndUpdate(order._id, {
        status: payoutInfo.status,
        updatedAt: new Date(),
        providerOrderId: payoutInfo.providerOrderId,
        paidTime: payoutInfo.paidTime,
        message: payoutInfo.message
      });

      // 更新交易状态
      await Transaction.findOneAndUpdate(
        { orderId: order.orderId },
        {
          status: payoutInfo.status,
          updatedAt: new Date(),
          providerTransactionId: payoutInfo.providerOrderId,
          paidTime: payoutInfo.paidTime
        }
      );

      console.log(`✅ UniSpay出款回调处理成功: ${mchOrderId} -> ${payoutInfo.status}`);

      // 返回成功响应
      return res.json({
        success: true,
        message: 'Notification processed successfully'
      });
    } else {
      console.error(`❌ UniSpay出款回调处理失败: ${notificationResult.message}`);
      return res.status(400).json({
        success: false,
        error: notificationResult.message
      });
    }

  } catch (error) {
    console.error('❌ UniSpay出款回调处理异常:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 处理通用出款回调通知（支持多个支付服务商）
 * POST /api/webhook/withdraw
 */
router.post('/withdraw', async (req, res) => {
  try {
    console.log('🔔 收到通用出款回调通知:', JSON.stringify(req.body, null, 2));

    const notificationData = req.body;
    const { provider, orderId, status, amount, currency, message } = notificationData;

    if (!provider || !orderId) {
      console.error('❌ 通用出款回调缺少必要参数');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 查询订单
    const order = await Order.findOne({ orderId, type: 'WITHDRAWAL' });
    if (!order) {
      console.error(`❌ 未找到出款订单: ${orderId}`);
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 验证订单金额
    if (amount && Math.abs(amount - order.amount) > 1) {
      console.error(`❌ 出款金额不匹配: 订单${order.amount}, 回调${amount}`);
      return res.status(400).json({
        success: false,
        error: 'Amount mismatch'
      });
    }

    // 更新订单状态
    await Order.findByIdAndUpdate(order._id, {
      status: status,
      updatedAt: new Date(),
      message: message || 'Withdrawal notification received'
    });

    // 更新交易状态
    await Transaction.findOneAndUpdate(
      { orderId: order.orderId },
      {
        status: status,
        updatedAt: new Date()
      }
    );

    console.log(`✅ 通用出款回调处理成功: ${orderId} -> ${status}`);

    return res.json({
      success: true,
      message: 'Notification processed successfully'
    });

  } catch (error) {
    console.error('❌ 通用出款回调处理异常:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 出款回调测试接口
 * POST /api/webhook/withdraw/test
 */
router.post('/withdraw/test', async (req, res) => {
  try {
    console.log('🧪 出款回调测试接口被调用');
    
    const testData = {
      provider: 'unispay',
      orderId: 'TEST_' + Date.now(),
      status: 'SUCCESS',
      amount: 1000,
      currency: 'INR',
      message: 'Test withdrawal notification'
    };

    console.log('测试数据:', JSON.stringify(testData, null, 2));

    return res.json({
      success: true,
      message: 'Test endpoint working',
      data: testData
    });

  } catch (error) {
    console.error('出款回调测试接口异常:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
