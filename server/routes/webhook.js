const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const PaymentConfig = require('../models/PaymentConfig');
const SignatureValidator = require('../services/security/signature-validator');
const SecurityAudit = require('../services/security/security-audit');

// 创建签名验证器和安全审计实例
const signatureValidator = new SignatureValidator();
const securityAudit = new SecurityAudit();

/**
 * PassPay代收回调处理
 */
router.post('/passpay/collection', async (req, res) => {
  try {
    console.log('PassPay代收回调收到:', req.body);
    
    const {
      mchid,
      pay_id,
      trade_no,
      out_trade_no,
      utr,
      amount,
      real_amount,
      status,
      msg,
      sign
    } = req.body;

    // 验证必要参数
    if (!mchid || !trade_no || !out_trade_no || !amount || !status || !sign) {
      await securityAudit.logSignatureValidation(req.body, false, '缺少必需参数', req);
      return res.status(400).json({ 
        error: '参数缺失',
        code: 'MISSING_REQUIRED_PARAMS'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay',
      'provider.accountId': mchid
    });

    if (!passpayConfig) {
      await securityAudit.logSecurityEvent('WEBHOOK_CONFIG_NOT_FOUND', {
        provider: 'passpay',
        mchid,
        callbackData: req.body
      }, 'ERROR');
      
      return res.status(400).json({ 
        error: '配置未找到',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    // 验证签名
    const signatureValid = await signatureValidator.validatePassPaySignature(
      req.body,
      passpayConfig.provider.secretKey,
      sign
    );

    if (!signatureValid.valid) {
      await securityAudit.logSignatureValidation(req.body, false, signatureValid.error, req);
      return res.status(400).json({ 
        error: '签名验证失败',
        code: signatureValid.code,
        details: signatureValid.error
      });
    }

    // 查找订单
    const order = await Order.findOne({ orderId: out_trade_no });
    if (!order) {
      await securityAudit.logSecurityEvent('WEBHOOK_ORDER_NOT_FOUND', {
        provider: 'passpay',
        orderId: out_trade_no,
        callbackData: req.body
      }, 'WARN');
      
      return res.status(404).json({ 
        error: '订单未找到',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 更新订单状态
    const orderStatus = mapPassPayStatus(status);
    const updateData = {
      status: orderStatus,
      updatedAt: new Date(),
      'paymentDetails.tradeNo': trade_no,
      'paymentDetails.utr': utr,
      'paymentDetails.realAmount': Math.round(parseFloat(real_amount || amount) * 100)
    };

    if (orderStatus === 'SUCCESS') {
      updateData.paidAt = new Date();
    }

    await Order.findByIdAndUpdate(order._id, updateData);

    // 创建或更新交易记录
    const transactionData = {
      orderId: order._id,
      transactionId: trade_no,
      amount: Math.round(parseFloat(amount) * 100),
      realAmount: Math.round(parseFloat(real_amount || amount) * 100),
      status: orderStatus,
      provider: 'passpay',
      utr: utr,
      providerTradeNo: trade_no,
      callbackData: req.body,
      createdAt: new Date()
    };

    await Transaction.findOneAndUpdate(
      { transactionId: trade_no },
      transactionData,
      { upsert: true, new: true }
    );

    // 记录成功的回调处理
    await securityAudit.logSecurityEvent('WEBHOOK_PROCESSED_SUCCESS', {
      provider: 'passpay',
      orderId: out_trade_no,
      status: orderStatus,
      tradeNo: trade_no
    }, 'INFO');

    console.log('PassPay回调处理成功:', {
      orderId: out_trade_no,
      status: orderStatus,
      tradeNo: trade_no
    });

    // 返回成功响应 - 修复：PassPay要求返回纯字符串"success"
    res.send('success');

  } catch (error) {
    console.error('PassPay代收回调处理失败:', error);
    
    // 记录错误
    await securityAudit.logSecurityEvent('WEBHOOK_PROCESSING_ERROR', {
      provider: 'passpay',
      error: error.message,
      callbackData: req.body
    }, 'ERROR');
    
    res.status(500).json({ 
      error: '回调处理失败',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PassPay代付回调处理
 */
router.post('/passpay/payout', async (req, res) => {
  try {
    console.log('PassPay代付回调收到:', req.body);
    
    const {
      mchid,
      status,
      msg,
      trade_no,
      out_trade_no,
      utr,
      amount,
      sign
    } = req.body;

    // 验证必要参数
    if (!mchid || !status || !trade_no || !out_trade_no || !amount || !sign) {
      console.error('PassPay代付回调参数缺失:', req.body);
      return res.status(400).json({ error: '参数缺失' });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay',
      'provider.accountId': mchid
    });

    if (!passpayConfig) {
      console.error('未找到PassPay配置:', mchid);
      return res.status(400).json({ error: '配置未找到' });
    }

    // 验证签名
    const expectedSign = generatePassPaySignature(req.body, passpayConfig.provider.secretKey);
    if (sign !== expectedSign) {
      console.error('PassPay代付回调签名验证失败');
      return res.status(400).json({ error: '签名验证失败' });
    }

    // 查找订单
    const order = await Order.findOne({ orderId: out_trade_no });
    if (!order) {
      console.error('未找到代付订单:', out_trade_no);
      return res.status(404).json({ error: '订单未找到' });
    }

    // 更新订单状态
    const orderStatus = mapPassPayPayoutStatus(status);
    const updateData = {
      status: orderStatus,
      updatedAt: new Date(),
      'paymentDetails.tradeNo': trade_no,
      'paymentDetails.utr': utr
    };

    if (orderStatus === 'SUCCESS') {
      updateData.paidAt = new Date();
    }

    await Order.findByIdAndUpdate(order._id, updateData);

    // 创建或更新交易记录
    const transactionData = {
      orderId: order._id,
      transactionId: trade_no,
      amount: Math.round(parseFloat(amount) * 100),
      status: orderStatus,
      provider: 'passpay',
      utr: utr,
      providerTradeNo: trade_no,
      callbackData: req.body,
      createdAt: new Date()
    };

    await Transaction.findOneAndUpdate(
      { transactionId: trade_no },
      transactionData,
      { upsert: true, new: true }
    );

    console.log('PassPay代付回调处理成功:', {
      orderId: out_trade_no,
      status: orderStatus,
      tradeNo: trade_no
    });

    // 返回成功响应 - 修复：PassPay要求返回纯字符串"success"
    res.send('success');

  } catch (error) {
    console.error('PassPay代付回调处理失败:', error);
    res.status(500).json({ error: '回调处理失败' });
  }
});

/**
 * 生成PassPay签名
 */
function generatePassPaySignature(params, secretKey) {
  // 移除sign字段
  const paramsForSign = { ...params };
  delete paramsForSign.sign;
  
  // 过滤空值和null，按ASCII排序
  const filteredParams = {};
  Object.keys(paramsForSign).forEach(key => {
    if (paramsForSign[key] !== null && paramsForSign[key] !== undefined && paramsForSign[key] !== '') {
      filteredParams[key] = paramsForSign[key];
    }
  });

  // 按ASCII排序并拼接
  const sortedKeys = Object.keys(filteredParams).sort();
  let signStr = '';
  
  sortedKeys.forEach(key => {
    signStr += `${key}=${filteredParams[key]}&`;
  });

  // 末尾拼接密钥
  signStr += `key=${secretKey}`;

  // MD5加密并转小写
  return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
}

/**
 * 映射PassPay代收状态
 */
function mapPassPayStatus(status) {
  const statusMap = {
    '1': 'PENDING',      // 订单创建成功
    '3': 'PROCESSING',   // 交易中
    '5': 'SUCCESS',      // 交易成功
    '6': 'FAILED'        // 交易失败
  };
  return statusMap[status] || 'UNKNOWN';
}

/**
 * 映射PassPay代付状态
 */
function mapPassPayPayoutStatus(status) {
  const statusMap = {
    '1': 'PENDING',      // 订单创建成功
    '3': 'PROCESSING',   // 交易中
    '5': 'SUCCESS',      // 代付交易成功
    '6': 'FAILED'        // 代付交易失败
  };
  return statusMap[status] || 'UNKNOWN';
}

/**
 * UniSpay充值回调处理
 * POST /api/webhook/unispay/collection
 */
router.post('/unispay/collection', async (req, res) => {
  try {
    console.log('🔔 收到UniSpay充值回调通知:', JSON.stringify(req.body, null, 2));

    const notificationData = req.body;
    const { 
      mchOrderId,      // 商户订单ID
      orderNo,         // UniSpay订单号
      state,           // 订单状态
      amount,          // 订单金额
      currency,        // 货币
      successTime,     // 成功时间
      msg,             // 消息
      sign             // 签名
    } = notificationData;

    // 验证必要参数
    if (!mchOrderId || !orderNo || !state) {
      console.error('❌ UniSpay充值回调缺少必要参数');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 查询订单
    const order = await Order.findOne({ orderId: mchOrderId, type: 'DEPOSIT' });
    if (!order) {
      console.error(`❌ 未找到充值订单: ${mchOrderId}`);
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

    // 创建UniSpay提供者实例进行签名验证
    const PaymentManager = require('../services/payment-manager');
    const paymentManager = new PaymentManager();
    paymentManager.registerProvider('unispay', require('../services/payment-providers/unispay-provider'), {
      accountId: paymentConfig.provider.accountId,
      apiKey: paymentConfig.provider.apiKey,
      secretKey: paymentConfig.provider.secretKey,
      environment: paymentConfig.provider.environment,
      mchNo: paymentConfig.provider.mchNo
    });

    // 验证签名
    const unispayProvider = paymentManager.providers.get('unispay');
    if (!unispayProvider.verifySignature(notificationData, sign)) {
      console.error('❌ UniSpay充值回调签名验证失败');
      return res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // 映射状态
    const orderStatus = mapUnispayStatus(state);
    
    // 更新订单状态
    const updateData = {
      status: orderStatus,
      updatedAt: new Date(),
      'provider.providerOrderId': orderNo,
      'provider.providerTransactionId': orderNo
    };

    if (orderStatus === 'SUCCESS' && successTime) {
      updateData.paidTime = new Date(successTime);
    }

    await Order.findByIdAndUpdate(order._id, updateData);

    // 更新交易状态
    await Transaction.findOneAndUpdate(
      { orderId: order.orderId },
      {
        status: orderStatus,
        updatedAt: new Date(),
        'provider.providerTransactionId': orderNo
      }
    );

    console.log(`✅ UniSpay充值回调处理成功: ${mchOrderId} -> ${orderStatus}`);

    // 转发通知给下游商户
    await forwardNotificationToMerchant(order, {
      status: orderStatus,
      orderNo: orderNo,
      amount: parseFloat(amount),  // 保持rupees格式给下游商户
      currency: currency,
      successTime: successTime,
      message: msg
    });

    // 返回成功响应
    res.json({
      success: true,
      message: 'Notification processed successfully'
    });

  } catch (error) {
    console.error('❌ UniSpay充值回调处理失败:', error);
    res.status(500).json({
      success: false,
      error: 'Callback processing failed'
    });
  }
});

/**
 * 转发通知给下游商户
 */
async function forwardNotificationToMerchant(order, statusUpdate) {
  if (!order.callback?.notifyUrl) {
    console.log('ℹ️ 订单没有配置回调URL，跳过转发');
    return;
  }

  try {
    console.log(`🔄 转发通知给商户: ${order.callback.notifyUrl}`);
    
    // 构建通知数据
    const notificationData = {
      orderId: order.orderId,
      merchantId: order.merchantId,
      status: statusUpdate.status,
      amount: (order.amount / 100).toFixed(2),  // 转换为rupees格式
      currency: order.currency,
      fee: order.fee,
      netAmount: order.netAmount,
      providerOrderId: statusUpdate.orderNo,
      providerTransactionId: statusUpdate.orderNo,
      timestamp: new Date().toISOString(),
      message: statusUpdate.message || ''
    };

    // 生成签名（使用商户的secretKey）
    const Merchant = require('../models/merchant');
    const merchant = await Merchant.findOne({ merchantId: order.merchantId });
    if (merchant) {
      const signature = generateNotificationSignature(notificationData, merchant.secretKey);
      notificationData.signature = signature;
    }

    // 发送通知
    const axios = require('axios');
    const response = await axios.post(order.callback.notifyUrl, notificationData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PaymentPlatform/1.0'
      }
    });

    if (response.status === 200) {
      console.log(`✅ 通知转发成功: ${order.callback.notifyUrl}`);
    } else {
      console.warn(`⚠️ 通知转发响应异常: ${response.status}`);
    }

  } catch (error) {
    console.error(`❌ 通知转发失败: ${order.callback.notifyUrl}`, error.message);
    
    // 记录失败日志，可以考虑重试机制
    // TODO: 实现重试队列
  }
}

/**
 * 生成通知签名
 */
function generateNotificationSignature(data, secretKey) {
  const crypto = require('crypto');
  
  // 移除signature字段
  const { signature, ...signData } = data;
  
  // 按字母顺序排序
  const sortedKeys = Object.keys(signData).sort();
  
  // 构建签名字符串
  let signStr = '';
  sortedKeys.forEach(key => {
    if (signData[key] !== undefined && signData[key] !== null && signData[key] !== '') {
      signStr += `${key}=${signData[key]}&`;
    }
  });
  
  // 移除最后的&，然后添加密钥
  signStr = signStr.slice(0, -1) + `&key=${secretKey}`;
  
  // 生成SHA-256签名
  return crypto.createHash('sha256').update(signStr).digest('hex');
}

/**
 * 映射UniSpay状态
 */
function mapUnispayStatus(state) {
  const statusMap = {
    '0': 'PENDING',      // 待支付
    '1': 'SUCCESS',      // 支付成功
    '2': 'FAILED',       // 支付失败
    '3': 'CANCELLED',    // 已取消
    '4': 'REFUNDED'      // 已退款
  };
  return statusMap[state] || 'UNKNOWN';
}

/**
 * 通用Webhook测试接口
 */
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Webhook服务正常运行',
    timestamp: new Date().toISOString(),
    endpoints: {
      'PassPay代收回调': 'POST /api/webhook/passpay/collection',
      'PassPay代付回调': 'POST /api/webhook/passpay/payout',
      'UniSpay充值回调': 'POST /api/webhook/unispay/collection',
      '测试接口': 'GET /api/webhook/test'
    }
  });
});

module.exports = router;
