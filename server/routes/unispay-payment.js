const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const UnispayProvider = require('../services/payment-providers/unispay-provider');
const PaymentConfig = require('../models/PaymentConfig');
const Order = require('../models/order');

/**
 * 创建UNISPAY唤醒支付订单
 * POST /api/unispay/create
 */
router.post('/create', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, amount, desc, notify_url, return_url, customer_phone } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 验证订单ID格式
    if (!orderid || orderid.length < 6) {
      return res.json(errorResponse(400, '订单ID格式不正确'));
    }
    
    // 验证金额
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.json(errorResponse(400, '金额格式不正确'));
    }
    
    // 获取UNISPAY支付配置
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return res.json(errorResponse(400, '未找到有效的UNISPAY支付配置'));
    }
    
    // 创建UNISPAY提供商实例
    const unispayProvider = new UnispayProvider(paymentConfig.provider);
    
    // 创建订单数据
    const orderData = {
      orderId: orderid,
      amount: numAmount,
      currency: 'INR',
      customerPhone: customer_phone,
      description: desc || '游戏充值',
      notifyUrl: notify_url,
      returnUrl: return_url
    };
    
    // 调用UNISPAY创建订单
    const result = await unispayProvider.createCollectionOrder(orderData);
    
    if (result.success) {
      // 保存订单到数据库
      const order = new Order({
        orderId: orderid,
        merchantId: merchant._id,
        type: 'DEPOSIT',
        amount: numAmount,
        currency: 'INR',
        status: 'PENDING',
        provider: 'unispay',
        providerOrderId: result.providerOrderId,
        description: desc,
        notifyUrl: notify_url,
        returnUrl: return_url,
        customerPhone: customer_phone,
        metadata: {
          upiTransferInfo: result.upiTransferInfo
        }
      });
      
      await order.save();
      
      return res.json(successResponse({
        orderid: orderid,
        status: 'SUCCESS',
        message: result.message,
        upi_transfer_info: result.upiTransferInfo,
        order_no: result.providerOrderId
      }));
    } else {
      return res.json(errorResponse(400, result.error || '创建订单失败'));
    }
  } catch (error) {
    console.error('UNISPAY创建订单失败:', error);
    return res.json(errorResponse(500, '服务器内部错误'));
  }
});

/**
 * 查询UNISPAY订单状态
 * POST /api/unispay/query
 */
router.post('/query', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid } = req.verifiedParams;
    const merchant = req.merchant;
    
    if (!orderid) {
      return res.json(errorResponse(400, '订单ID不能为空'));
    }
    
    // 获取UNISPAY支付配置
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return res.json(errorResponse(400, '未找到有效的UNISPAY支付配置'));
    }
    
    // 创建UNISPAY提供商实例
    const unispayProvider = new UnispayProvider(paymentConfig.provider);
    
    // 查询订单状态
    const result = await unispayProvider.queryOrderStatus(orderid);
    
    if (result.success) {
      return res.json(successResponse({
        orderid: orderid,
        status: result.status,
        amount: result.amount,
        order_no: result.providerOrderId,
        paid_time: result.paidTime,
        message: result.message
      }));
    } else {
      return res.json(errorResponse(400, result.error || '查询订单失败'));
    }
  } catch (error) {
    console.error('UNISPAY查询订单失败:', error);
    return res.json(errorResponse(500, '服务器内部错误'));
  }
});

/**
 * UNISPAY异步通知回调
 * POST /api/unispay/notify
 */
router.post('/notify', async (req, res) => {
  try {
    const notificationData = req.body;
    
    // 查找对应的支付配置
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      console.error('未找到UNISPAY支付配置');
      return res.status(400).send('配置不存在');
    }
    
    // 创建UNISPAY提供商实例
    const unispayProvider = new UnispayProvider(paymentConfig.provider);
    
    // 处理异步通知
    const result = await unispayProvider.handleNotification(notificationData);
    
    if (result.success) {
      // 更新订单状态
      const order = await Order.findOne({ orderId: result.data.orderId });
      if (order) {
        order.status = result.data.status;
        order.providerOrderId = result.data.providerOrderId;
        order.paidTime = result.data.paidTime;
        order.metadata = {
          ...order.metadata,
          lastNotification: {
            time: new Date(),
            data: notificationData
          }
        };
        await order.save();
        
        console.log(`UNISPAY订单${result.data.orderId}状态更新为: ${result.data.status}`);
      }
      
      // 返回SUCCESS确认接收
      return res.send('SUCCESS');
    } else {
      console.error('UNISPAY通知处理失败:', result.message);
      return res.status(400).send('处理失败');
    }
  } catch (error) {
    console.error('UNISPAY通知处理异常:', error);
    return res.status(500).send('服务器错误');
  }
});

/**
 * 获取UNISPAY支付配置信息
 * GET /api/unispay/config
 */
router.get('/config', mgAuthMiddleware, async (req, res) => {
  try {
    const merchant = req.merchant;
    
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return res.json(errorResponse(400, '未找到UNISPAY支付配置'));
    }
    
    return res.json(successResponse({
      provider: 'unispay',
      accountName: paymentConfig.accountName,
      status: paymentConfig.status,
      limits: paymentConfig.limits,
      fees: paymentConfig.fees
    }));
  } catch (error) {
    console.error('获取UNISPAY配置失败:', error);
    return res.json(errorResponse(500, '服务器内部错误'));
  }
});

module.exports = router;
