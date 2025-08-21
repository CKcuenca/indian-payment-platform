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
      'paymentDetails.realAmount': parseFloat(real_amount || amount)
    };

    if (orderStatus === 'SUCCESS') {
      updateData.paidAt = new Date();
    }

    await Order.findByIdAndUpdate(order._id, updateData);

    // 创建或更新交易记录
    const transactionData = {
      orderId: order._id,
      transactionId: trade_no,
      amount: parseFloat(amount),
      realAmount: parseFloat(real_amount || amount),
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

    // 返回成功响应
    res.json({ success: true, message: '回调处理成功' });

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
      amount: parseFloat(amount),
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

    // 返回成功响应
    res.json({ success: true, message: '回调处理成功' });

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
    3: 'PENDING',      // 交易中
    5: 'SUCCESS',      // 交易成功
    6: 'FAILED'        // 交易失败
  };
  return statusMap[status] || 'UNKNOWN';
}

/**
 * 映射PassPay代付状态
 */
function mapPassPayPayoutStatus(status) {
  const statusMap = {
    3: 'PENDING',      // 交易中
    5: 'SUCCESS',      // 代付交易成功
    6: 'FAILED'        // 代付交易失败
  };
  return statusMap[status] || 'UNKNOWN';
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
      '测试接口': 'GET /api/webhook/test'
    }
  });
});

module.exports = router;
