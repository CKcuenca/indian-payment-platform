const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const PaymentConfig = require('../models/PaymentConfig');
const Order = require('../models/order');

/**
 * 统一出款接口 - 根据后台配置自动选择支付商
 * POST /api/payout/create
 */
router.post('/create', mgAuthMiddleware, async (req, res) => {
  try {
    const { 
      mchNo, 
      mchOrderId, 
      amount, 
      currency, 
      bankCode, 
      accountNumber, 
      ifscCode, 
      accountName,
      transferMode,
      remark,
      timestamp, 
      sign 
    } = req.body;
    const merchant = req.merchant;
    
    // 验证商户号
    if (mchNo !== merchant.merchantId) {
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
    
    // 验证银行账户信息
    if (!bankCode || !accountNumber || !ifscCode || !accountName) {
      return res.json(errorResponse(400, '银行账户信息不完整'));
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
    console.log(`🔍 为商户 ${merchant.merchantId} 选择出款支付商: ${providerName}`);
    
    // 根据支付商调用对应的服务
    let result;
    switch (providerName) {
      case 'unispay':
        result = await createUnispayPayout(mchOrderId, numAmount, currency, bankCode, accountNumber, ifscCode, accountName, transferMode, remark, merchant);
        break;
      case 'passpay':
        result = await createPasspayPayout(mchOrderId, numAmount, currency, bankCode, accountNumber, ifscCode, accountName, transferMode, remark, merchant);
        break;
      default:
        return res.json(errorResponse(500, `不支持的出款支付商: ${providerName}`));
    }
    
    if (result.success) {
      return res.json(successResponse(result.data));
    } else {
      return res.json(errorResponse(500, result.error || '创建出款订单失败'));
    }
    
  } catch (error) {
    console.error('创建统一出款订单失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 统一出款查询接口
 * POST /api/payout/query
 */
router.post('/query', mgAuthMiddleware, async (req, res) => {
  try {
    const { mchNo, mchOrderId, timestamp, sign } = req.body;
    const merchant = req.merchant;
    
    // 验证商户号
    if (mchNo !== merchant.merchantId) {
      return res.json(errorResponse(400, '商户号不匹配'));
    }
    
    // 查询订单
    const order = await Order.findOne({ 
      orderId: mchOrderId, 
      merchantId: merchant.merchantId,
      type: 'WITHDRAWAL'
    });
    
    if (!order) {
      return res.json(errorResponse(400, '出款订单不存在'));
    }
    
    // 根据支付商查询最新状态
    const providerName = order.provider.name;
    let orderStatus;
    
    switch (providerName) {
      case 'unispay':
        orderStatus = await queryUnispayPayout(mchOrderId, merchant);
        break;
      case 'passpay':
        orderStatus = await queryPasspayPayout(mchOrderId, merchant);
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
      bankCode: orderStatus.bankAccount?.bankCode,
      accountNumber: orderStatus.bankAccount?.accountNumber,
      ifscCode: orderStatus.bankAccount?.ifscCode,
      accountName: orderStatus.bankAccount?.accountHolderName,
      transferMode: orderStatus.metadata?.transferMode,
      utrNumber: orderStatus.provider?.utrNumber,
      createTime: orderStatus.createTime,
      updateTime: orderStatus.updateTime
    }));
    
  } catch (error) {
    console.error('查询统一出款订单失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 创建UNISPAY出款订单
 */
async function createUnispayPayout(orderId, amount, currency, bankCode, accountNumber, ifscCode, accountName, transferMode, remark, merchant) {
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
    const result = await unispayProvider.createPayoutOrder({
      orderId,
      amount,
      currency,
      bankCode,
      accountNumber,
      ifscCode,
      accountName,
      transferMode,
      remark
    });
    
    if (result.success) {
      // 保存订单到数据库
      const order = new Order({
        orderId,
        merchantId: merchant.merchantId,
        type: 'WITHDRAWAL',
        amount,
        currency,
        status: 'PROCESSING',
        provider: {
          name: 'unispay',
          providerOrderId: result.providerOrderId
        },
        bankAccount: {
          bankCode,
          accountNumber,
          ifscCode,
          accountHolderName: accountName
        },
        description: remark || '游戏提现',
        metadata: {
          transferMode: transferMode || 'IMPS'
        }
      });
      
      await order.save();
      
      return {
        success: true,
        data: {
          orderId,
          platformOrderId: result.providerOrderId,
          status: 'PROCESSING',
          amount: amount.toString(),
          currency,
          bankCode,
          accountNumber,
          ifscCode,
          accountName,
          transferMode: transferMode || 'IMPS',
          createTime: new Date().toISOString()
        }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('创建UNISPAY出款订单失败:', error);
    return { success: false, error: 'UNISPAY服务异常' };
  }
}

/**
 * 创建PassPay出款订单
 */
async function createPasspayPayout(orderId, amount, currency, bankCode, accountNumber, ifscCode, accountName, transferMode, remark, merchant) {
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
    const result = await passpayProvider.createPayoutOrder({
      orderId,
      amount,
      currency,
      bankCode,
      accountNumber,
      ifscCode,
      accountName,
      transferMode,
      remark
    });
    
    if (result.success) {
      // 保存订单到数据库
      const order = new Order({
        orderId,
        merchantId: merchant.merchantId,
        type: 'WITHDRAWAL',
        amount,
        currency,
        status: 'PROCESSING',
        provider: {
          name: 'passpay',
          providerOrderId: result.providerOrderId
        },
        bankAccount: {
          bankCode,
          accountNumber,
          ifscCode,
          accountHolderName: accountName
        },
        description: remark || '游戏提现',
        metadata: {
          transferMode: transferMode || 'IMPS'
        }
      });
      
      await order.save();
      
      return {
        success: true,
        data: {
          orderId,
          platformOrderId: result.providerOrderId,
          status: 'PROCESSING',
          amount: amount.toString(),
          currency,
          bankCode,
          accountNumber,
          ifscCode,
          accountName,
          transferMode: transferMode || 'IMPS',
          createTime: new Date().toISOString()
        }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('创建PassPay出款订单失败:', error);
    return { success: false, error: 'PassPay服务异常' };
  }
}

/**
 * 查询UNISPAY出款订单状态
 */
async function queryUnispayPayout(orderId, merchant) {
  try {
    const UnispayProvider = require('../services/payment-providers/unispay-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' });
    }
    
    const unispayProvider = new UnispayProvider(paymentConfig.provider);
    const result = await unispayProvider.queryPayoutOrder(orderId);
    
    if (result.success) {
      // 更新本地订单状态
      await Order.updateOne(
        { orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' },
        { 
          status: result.status,
          'provider.providerOrderId': result.providerOrderId,
          'provider.utrNumber': result.utrNumber,
          updateTime: new Date()
        }
      );
      
      return {
        orderId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        bankCode: result.bankCode,
        accountNumber: result.accountNumber,
        ifscCode: result.ifscCode,
        accountName: result.accountName,
        transferMode: result.transferMode,
        utrNumber: result.utrNumber,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' });
    }
  } catch (error) {
    console.error('查询UNISPAY出款订单失败:', error);
    return await Order.findOne({ orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' });
  }
}

/**
 * 查询PassPay出款订单状态
 */
async function queryPasspayPayout(orderId, merchant) {
  try {
    const PasspayProvider = require('../services/payment-providers/passpay-provider');
    const paymentConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay',
      'status': 'ACTIVE'
    });
    
    if (!paymentConfig) {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' });
    }
    
    const passpayProvider = new PasspayProvider(paymentConfig.provider);
    const result = await passpayProvider.queryPayoutOrder(orderId);
    
    if (result.success) {
      // 更新本地订单状态
      await Order.updateOne(
        { orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' },
        { 
          status: result.status,
          'provider.providerOrderId': result.providerOrderId,
          'provider.utrNumber': result.utrNumber,
          updateTime: new Date()
        }
      );
      
      return {
        orderId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        bankCode: result.bankCode,
        accountNumber: result.accountNumber,
        ifscCode: result.ifscCode,
        accountName: result.accountName,
        transferMode: result.transferMode,
        utrNumber: result.utrNumber,
        createTime: result.createTime,
        updateTime: new Date()
      };
    } else {
      return await Order.findOne({ orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' });
    }
  } catch (error) {
    console.error('查询PassPay出款订单失败:', error);
    return await Order.findOne({ orderId, merchantId: merchant.merchantId, type: 'WITHDRAWAL' });
    }
}

module.exports = router;
