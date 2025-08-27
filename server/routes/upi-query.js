const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const Order = require('../models/order');

/**
 * 统一UPI查询接口
 * POST /api/upi-query/query
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
      merchantId: merchant.merchantId,
      type: 'DEPOSIT'
    });
    
    if (!order) {
      return res.json(errorResponse(400, '订单不存在'));
    }
    
    // 根据支付商查询UPI信息
    const providerName = order.provider.name;
    let upiInfo;
    
    switch (providerName) {
      case 'unispay':
        upiInfo = await queryUnispayUPI(mchOrderId, merchant);
        break;
      case 'passpay':
        upiInfo = await queryPasspayUPI(mchOrderId, merchant);
        break;
      case 'wakeup':
        upiInfo = await queryWakeupUPI(mchOrderId, merchant);
        break;
      default:
        return res.json(errorResponse(500, `不支持的支付商: ${providerName}`));
    }
    
    if (upiInfo.success) {
      return res.json(successResponse({
        orderId: upiInfo.orderId,
        platformOrderId: upiInfo.platformOrderId,
        status: upiInfo.status,
        upiId: upiInfo.upiId,
        upiTransactionId: upiInfo.upiTransactionId,
        amount: upiInfo.amount,
        currency: upiInfo.currency,
        createTime: upiInfo.createTime,
        updateTime: upiInfo.updateTime
      }));
    } else {
      return res.json(errorResponse(500, upiInfo.error || '查询UPI信息失败'));
    }
    
  } catch (error) {
    console.error('查询UPI信息失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 查询UNISPAY UPI信息
 */
async function queryUnispayUPI(orderId, merchant) {
  try {
    const UnispayProvider = require('../services/payment-providers/unispay-provider');
    const PaymentConfig = require('../models/PaymentConfig');
    
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return { success: false, error: 'UNISPAY配置未找到' };
    }
    
    const unispayProvider = new UnispayProvider(paymentConfig.provider);
    const result = await unispayProvider.queryOrder(orderId);
    
    if (result.success) {
      return {
        success: true,
        orderId: result.orderId,
        platformOrderId: result.providerOrderId,
        status: result.status,
        upiId: result.upiId,
        upiTransactionId: result.upiTransactionId,
        amount: result.amount,
        currency: result.currency,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('查询UNISPAY UPI信息失败:', error);
    return { success: false, error: 'UNISPAY服务异常' };
  }
}

/**
 * 查询PassPay UPI信息
 */
async function queryPasspayUPI(orderId, merchant) {
  try {
    const PasspayProvider = require('../services/payment-providers/passpay-provider');
    const PaymentConfig = require('../models/PaymentConfig');
    
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return { success: false, error: 'PassPay配置未找到' };
    }
    
    const passpayProvider = new PasspayProvider(paymentConfig.provider);
    const result = await passpayProvider.queryOrder(orderId);
    
    if (result.success) {
      return {
        success: true,
        orderId: result.orderId,
        platformOrderId: result.providerOrderId,
        status: result.status,
        upiId: result.upiId,
        upiTransactionId: result.upiTransactionId,
        amount: result.amount,
        currency: result.currency,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('查询PassPay UPI信息失败:', error);
    return { success: false, error: 'PassPay服务异常' };
  }
}

/**
 * 查询Wakeup UPI信息
 */
async function queryWakeupUPI(orderId, merchant) {
  try {
    const WakeupProvider = require('../services/payment-providers/wakeup-provider');
    const PaymentConfig = require('../models/PaymentConfig');
    
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return { success: false, error: 'Wakeup配置未找到' };
    }
    
    const wakeupProvider = new WakeupProvider(paymentConfig);
    const result = await wakeupProvider.queryOrder(orderId);
    
    if (result.success) {
      return {
        success: true,
        orderId: result.orderId,
        platformOrderId: result.providerOrderId,
        status: result.status,
        upiId: result.upiId,
        upiTransactionId: result.upiTransactionId,
        amount: result.amount,
        currency: result.currency,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('查询Wakeup UPI信息失败:', error);
    return { success: false, error: 'Wakeup服务异常' };
  }
}

module.exports = router;
