const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const PaymentConfig = require('../models/PaymentConfig');
const Order = require('../models/order');

/**
 * 统一存款接口 - 根据后台配置自动选择支付商
 * POST /api/order/create
 */
router.post('/create', mgAuthMiddleware, async (req, res) => {
  try {
    const { appid, mchOrderId, amount, currency, payType, notifyUrl, timestamp, sign } = req.body;
    const merchant = req.merchant;
    
    // 验证商户号
    if (appid !== merchant.merchantId) {
      return res.json(errorResponse(400, '商户号不匹配'));
    }
    
    // 验证订单ID格式
    if (!mchOrderId || mchOrderId.length < 6) {
      return res.json(errorResponse(400, '订单ID格式不正确'));
    }
    
    // 验证金额
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.json(errorResponse(400, '金额格式不正确'));
    }
    
    // 验证币种
    if (currency !== 'INR') {
      return res.json(errorResponse(400, '仅支持INR币种'));
    }
    
    // 检查订单是否已存在
    const existingOrder = await Order.findOne({ 
      orderId: mchOrderId, 
      merchantId: merchant.merchantId 
    });
    
    if (existingOrder) {
      return res.json(errorResponse(400, '订单已存在'));
    }
    
    // 根据后台配置选择支付商
    const paymentConfig = await PaymentConfig.findOne({
      'merchantId': merchant.merchantId,
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return res.json(errorResponse(500, '未找到有效的支付配置'));
    }
    
    const providerName = paymentConfig.provider.name;
    console.log(`🔍 为商户 ${merchant.merchantId} 选择支付商: ${providerName}`);
    
    // 根据支付商调用对应的服务
    let result;
    switch (providerName) {
      case 'unispay':
        result = await createUnispayOrder(mchOrderId, numAmount, currency, payType, notifyUrl, merchant);
        break;
      case 'passpay':
        result = await createPasspayOrder(mchOrderId, numAmount, currency, payType, notifyUrl, merchant);
        break;
      case 'wakeup':
        result = await createWakeupOrder(mchOrderId, numAmount, currency, payType, notifyUrl, merchant);
        break;
      default:
        return res.json(errorResponse(500, `不支持的支付商: ${providerName}`));
    }
    
    if (result.success) {
      return res.json(successResponse(result.data));
    } else {
      return res.json(errorResponse(500, result.error || '创建订单失败'));
    }
    
  } catch (error) {
    console.error('创建统一存款订单失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 统一存款查询接口
 * POST /api/order/query
 */
router.post('/query', mgAuthMiddleware, async (req, res) => {
  try {
    const { appid, mchOrderId, timestamp, sign } = req.body;
    const merchant = req.merchant;
    
    // 验证商户号
    if (appid !== merchant.merchantId) {
      return res.json(errorResponse(400, '商户号不匹配'));
    }
    
    // 查询订单
    const order = await Order.findOne({ 
      orderId: mchOrderId, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(400, '订单不存在'));
    }
    
    // 根据支付商查询最新状态
    const providerName = order.provider.name;
    let orderStatus;
    
    switch (providerName) {
      case 'unispay':
        orderStatus = await queryUnispayOrder(mchOrderId, merchant);
        break;
      case 'passpay':
        orderStatus = await queryPasspayOrder(mchOrderId, merchant);
        break;
      case 'wakeup':
        orderStatus = await queryWakeupOrder(mchOrderId, merchant);
        break;
      default:
        orderStatus = order;
    }
    
    return res.json(successResponse({
      orderId: orderStatus.orderId,
      platformOrderId: orderStatus.provider?.providerOrderId || orderStatus._id,
      status: orderStatus.status,
      amount: orderStatus.amount,
      currency: orderStatus.currency,
      createTime: orderStatus.createTime,
      updateTime: orderStatus.updateTime
    }));
    
  } catch (error) {
    console.error('查询统一存款订单失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 创建UNISPAY订单
 */
async function createUnispayOrder(orderId, amount, currency, payType, notifyUrl, merchant) {
  try {
    const UnispayProvider = require('../services/payment-providers/unispay-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return { success: false, error: 'UNISPAY配置未找到' };
    }
    
    const unispayProvider = new UnispayProvider(paymentConfig.provider);
    const result = await unispayProvider.createCollectionOrder({
      orderId,
      amount,
      currency,
      payType,
      notifyUrl,
      returnUrl: notifyUrl
    });
    
    if (result.success) {
      // 保存订单到数据库
      const order = new Order({
        orderId,
        merchantId: merchant.merchantId,
        type: 'DEPOSIT',
        amount,
        currency,
        status: 'PENDING',
        provider: {
          name: 'unispay',
          providerOrderId: result.providerOrderId
        },
        description: '游戏充值',
        notifyUrl,
        returnUrl: notifyUrl,
        metadata: {
          payType,
          upiTransferInfo: result.upiTransferInfo
        }
      });
      
      await order.save();
      
      return {
        success: true,
        data: {
          orderId,
          platformOrderId: result.providerOrderId,
          paymentUrl: result.paymentUrl,
          qrCode: result.qrCode,
          expireTime: result.expireTime,
          amount: amount.toString(),
          currency,
          status: 'PENDING',
          payType,
          createTime: new Date().toISOString()
        }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('创建UNISPAY订单失败:', error);
    return { success: false, error: 'UNISPAY服务异常' };
  }
}

/**
 * 创建PassPay订单
 */
async function createPasspayOrder(orderId, amount, currency, payType, notifyUrl, merchant) {
  try {
    const PasspayProvider = require('../services/payment-providers/passpay-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return { success: false, error: 'PassPay配置未找到' };
    }
    
    const passpayProvider = new PasspayProvider(paymentConfig.provider);
    const result = await passpayProvider.createCollectionOrder({
      orderId,
      amount,
      currency,
      payType,
      notifyUrl,
      returnUrl: notifyUrl
    });
    
    if (result.success) {
      // 保存订单到数据库
      const order = new Order({
        orderId,
        merchantId: merchant.merchantId,
        type: 'DEPOSIT',
        amount,
        currency,
        status: 'PENDING',
        provider: {
          name: 'passpay',
          providerOrderId: result.providerOrderId
        },
        description: '游戏充值',
        notifyUrl,
        returnUrl: notifyUrl,
        metadata: {
          payType
        }
      });
      
      await order.save();
      
      return {
        success: true,
        data: {
          orderId,
          platformOrderId: result.providerOrderId,
          paymentUrl: result.paymentUrl,
          qrCode: result.qrCode,
          expireTime: result.expireTime,
          amount: amount.toString(),
          currency,
          status: 'PENDING',
          payType,
          createTime: new Date().toISOString()
        }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('创建PassPay订单失败:', error);
    return { success: false, error: 'PassPay服务异常' };
  }
}

/**
 * 创建Wakeup订单
 */
async function createWakeupOrder(orderId, amount, currency, payType, notifyUrl, merchant) {
  try {
    const WakeupProvider = require('../services/payment-providers/wakeup-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return { success: false, error: 'Wakeup配置未找到' };
    }
    
    const wakeupProvider = new WakeupProvider(paymentConfig);
    const result = await wakeupProvider.createCollectionOrder({
      orderId,
      amount,
      currency,
      customerPhone: merchant.phone || '',
      description: '游戏充值',
      notifyUrl,
      returnUrl: notifyUrl
    });
    
    if (result.success) {
      // 保存订单到数据库
      const order = new Order({
        orderId,
        merchantId: merchant.merchantId,
        type: 'DEPOSIT',
        amount,
        currency,
        status: 'PENDING_VERIFICATION',
        provider: {
          name: 'wakeup'
        },
        description: '游戏充值',
        notifyUrl,
        returnUrl: notifyUrl,
        metadata: {
          payType,
          upiTransferInfo: result.upiTransferInfo
        }
      });
      
      await order.save();
      
      return {
        success: true,
        data: {
          orderId,
          platformOrderId: order._id,
          paymentUrl: result.paymentUrl,
          qrCode: result.qrCode,
          expireTime: result.expireTime,
          amount: amount.toString(),
          currency,
          status: 'PENDING_VERIFICATION',
          payType,
          createTime: new Date().toISOString()
        }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('创建Wakeup订单失败:', error);
    return { success: false, error: 'Wakeup服务异常' };
  }
}

/**
 * 查询UNISPAY订单状态
 */
async function queryUnispayOrder(orderId, merchant) {
  try {
    const UnispayProvider = require('../services/payment-providers/unispay-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId });
    }
    
    const unispayProvider = new UnispayProvider(paymentConfig.provider);
    const result = await unispayProvider.queryOrder(orderId);
    
    if (result.success) {
      // 更新本地订单状态
      await Order.updateOne(
        { orderId, merchantId: merchant.merchantId },
        { 
          status: result.status,
          'provider.providerOrderId': result.providerOrderId,
          updateTime: new Date()
        }
      );
      
      return {
        orderId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId });
    }
  } catch (error) {
    console.error('查询UNISPAY订单失败:', error);
    return await Order.findOne({ orderId, merchantId: merchant.merchantId });
  }
}

/**
 * 查询PassPay订单状态
 */
async function queryPasspayOrder(orderId, merchant) {
  try {
    const PasspayProvider = require('../services/payment-providers/passpay-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId });
    }
    
    const passpayProvider = new PasspayProvider(paymentConfig.provider);
    const result = await passpayProvider.queryOrder(orderId);
    
    if (result.success) {
      // 更新本地订单状态
      await Order.updateOne(
        { orderId, merchantId: merchant.merchantId },
        { 
          status: result.status,
          'provider.providerOrderId': result.providerOrderId,
          updateTime: new Date()
        }
      );
      
      return {
        orderId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId });
    }
  } catch (error) {
    console.error('查询PassPay订单失败:', error);
    return await Order.findOne({ orderId, merchantId: merchant.merchantId });
  }
}

/**
 * 查询Wakeup订单状态
 */
async function queryWakeupOrder(orderId, merchant) {
  try {
    const WakeupProvider = require('../services/payment-providers/wakeup-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId });
    }
    
    const wakeupProvider = new WakeupProvider(paymentConfig);
    const result = await wakeupProvider.queryOrder(orderId);
    
    if (result.success) {
      // 更新本地订单状态
      await Order.updateOne(
        { orderId, merchantId: merchant.merchantId },
        { 
          status: result.status,
          updateTime: new Date()
        }
      );
      
      return {
        orderId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId });
    }
  } catch (error) {
    console.error('查询Wakeup订单失败:', error);
    return await Order.findOne({ orderId, merchantId: merchant.merchantId });
  }
}

module.exports = router;
