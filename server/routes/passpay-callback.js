const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const PaymentConfig = require('../models/PaymentConfig');

/**
 * PassPay回调处理路由
 * 用于接收PassPay的支付结果通知
 */

/**
 * 验证PassPay回调签名
 */
function verifyPassPayCallback(params, secretKey) {
  try {
    const { sign, ...otherParams } = params;
    
    // 过滤空值，按ASCII排序
    const filteredParams = {};
    Object.keys(otherParams).forEach(key => {
      if (otherParams[key] !== null && otherParams[key] !== undefined && otherParams[key] !== '') {
        filteredParams[key] = otherParams[key];
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
    const expectedSign = crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
    
    return expectedSign === sign.toLowerCase();
  } catch (error) {
    console.error('验证PassPay回调签名失败:', error);
    return false;
  }
}

/**
 * 代收回调处理
 * POST /api/callback/collection
 */
router.post('/collection', async (req, res) => {
  try {
    console.log('收到PassPay代收回调:', req.body);
    
    const {
      mchid,
      pay_id,
      out_trade_no,
      trade_no,
      amount,
      status,
      utr,
      sign,
      msg
    } = req.body;

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      console.error('PassPay配置未找到');
      return res.status(500).json({ error: '配置错误' });
    }

    // 验证签名
    if (!verifyPassPayCallback(req.body, passpayConfig.provider.secretKey)) {
      console.error('PassPay回调签名验证失败');
      return res.status(400).json({ error: '签名验证失败' });
    }

    // 查找订单
    const order = await Order.findOne({ orderId: out_trade_no });
    if (!order) {
      console.error('订单不存在:', out_trade_no);
      return res.status(404).json({ error: '订单不存在' });
    }

    // 更新订单状态
    const oldStatus = order.status;
    order.status = mapPassPayStatus(status);
    order.updatedAt = new Date();
    
    if (utr) {
      order.provider.utrNumber = utr;
    }

    // 如果支付成功，设置支付时间
    if (order.status === 'SUCCESS') {
      order.paidAt = new Date();
    }

    // 添加状态历史记录
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      reason: `PassPay回调: ${msg || '状态更新'}`,
      executedBy: 'passpay'
    });

    await order.save();

    // 创建交易记录
    const transaction = new Transaction({
      transactionId: trade_no,
      orderId: out_trade_no,
      merchantId: order.merchantId,
      type: 'DEPOSIT',
      provider: {
        name: 'passpay',
        transactionId: trade_no,
        utrNumber: utr
      },
      amount: parseFloat(amount),
      status: order.status,
      description: `PassPay代收回调: ${msg || '状态更新'}`,
      createdAt: new Date()
    });

    await transaction.save();

    console.log(`订单状态更新: ${out_trade_no} ${oldStatus} -> ${order.status}`);

    // 如果商户有回调地址，发送通知
    if (order.notifyUrl) {
      try {
        await sendMerchantNotification(order.notifyUrl, {
          orderid: out_trade_no,
          amount: amount,
          status: order.status,
          trade_no: trade_no,
          utr: utr,
          message: msg
        });
        console.log('商户回调通知发送成功:', order.notifyUrl);
      } catch (error) {
        console.error('商户回调通知发送失败:', error);
      }
    }

    // 返回成功响应
    res.json({ 
      code: 200, 
      message: '回调处理成功',
      order_status: order.status 
    });

  } catch (error) {
    console.error('处理PassPay代收回调失败:', error);
    res.status(500).json({ error: '回调处理失败' });
  }
});

/**
 * 代付回调处理
 * POST /api/callback/payout
 */
router.post('/payout', async (req, res) => {
  try {
    console.log('收到PassPay代付回调:', req.body);
    
    const {
      mchid,
      pay_id,
      out_trade_no,
      trade_no,
      amount,
      status,
      sign,
      msg
    } = req.body;

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      console.error('PassPay配置未找到');
      return res.status(500).json({ error: '配置错误' });
    }

    // 验证签名
    if (!verifyPassPayCallback(req.body, passpayConfig.provider.secretKey)) {
      console.error('PassPay回调签名验证失败');
      return res.status(400).json({ error: '签名验证失败' });
    }

    // 查找代付订单
    const order = await Order.findOne({ 
      orderId: out_trade_no,
      type: 'WITHDRAWAL'
    });
    
    if (!order) {
      console.error('代付订单不存在:', out_trade_no);
      return res.status(404).json({ error: '订单不存在' });
    }

    // 更新订单状态
    const oldStatus = order.status;
    order.status = mapPassPayPayoutStatus(status);
    order.updatedAt = new Date();

    // 添加状态历史记录
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      reason: `PassPay代付回调: ${msg || '状态更新'}`,
      executedBy: 'passpay'
    });

    await order.save();

    // 创建交易记录
    const transaction = new Transaction({
      transactionId: trade_no,
      orderId: out_trade_no,
      merchantId: order.merchantId,
      type: 'WITHDRAWAL',
      provider: {
        name: 'passpay',
        transactionId: trade_no
      },
      amount: parseFloat(amount),
      status: order.status,
      description: `PassPay代付回调: ${msg || '状态更新'}`,
      createdAt: new Date()
    });

    await transaction.save();

    console.log(`代付订单状态更新: ${out_trade_no} ${oldStatus} -> ${order.status}`);

    // 如果商户有回调地址，发送通知
    if (order.notifyUrl) {
      try {
        await sendMerchantNotification(order.notifyUrl, {
          orderid: out_trade_no,
          amount: amount,
          status: order.status,
          trade_no: trade_no,
          message: msg
        });
        console.log('商户代付回调通知发送成功:', order.notifyUrl);
      } catch (error) {
        console.error('商户代付回调通知发送失败:', error);
      }
    }

    // 返回成功响应
    res.json({ 
      code: 200, 
      message: '代付回调处理成功',
      order_status: order.status 
    });

  } catch (error) {
    console.error('处理PassPay代付回调失败:', error);
    res.status(500).json({ error: '回调处理失败' });
  }
});

/**
 * 映射PassPay状态到系统状态
 */
function mapPassPayStatus(status) {
  const statusMap = {
    '0': 'PENDING',      // 待处理
    '1': 'PROCESSING',   // 处理中
    '2': 'SUCCESS',      // 成功
    '3': 'FAILED',       // 失败
    '4': 'CANCELLED',    // 取消
    '5': 'EXPIRED'       // 过期
  };
  return statusMap[status] || 'UNKNOWN';
}

/**
 * 映射PassPay代付状态到系统状态
 */
function mapPassPayPayoutStatus(status) {
  const statusMap = {
    '0': 'PENDING',      // 待处理
    '1': 'PROCESSING',   // 处理中
    '2': 'SUCCESS',      // 成功
    '3': 'FAILED',       // 失败
    '4': 'CANCELLED',    // 取消
    '5': 'REJECTED'      // 拒绝
  };
  return statusMap[status] || 'UNKNOWN';
}

/**
 * 发送商户回调通知
 */
async function sendMerchantNotification(notifyUrl, data) {
  try {
    const axios = require('axios');
    
    const response = await axios.post(notifyUrl, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (response.status === 200) {
      console.log('商户回调通知成功:', response.data);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('商户回调通知失败:', error.message);
    throw error;
  }
}

module.exports = router;
