const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const SignatureUtil = require('../utils/signature');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const { PaymentManager } = require('../services/payment-manager');

/**
 * 创建支付订单
 * POST /api/pay
 * 参数: appid, orderid, amount, desc, sign, [其他参数]
 */
router.post('/pay', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, amount, desc, notify_url, return_url } = req.verifiedParams;
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
    
    // 检查订单是否已存在
    const existingOrder = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (existingOrder) {
      return res.json(errorResponse(400, '订单已存在'));
    }
    
    // 创建订单
    const order = new Order({
      orderId: orderid,
      merchantId: merchant.merchantId,
      type: 'DEPOSIT', // 支付订单类型为充值
      provider: {
        name: 'cashgit' // 设置支付提供者名称
      },      amount: numAmount,
      description: desc || 'CashGit支付订单',
      status: 'PENDING',
      paymentMethod: 'cashgit_payment',
      notifyUrl: notify_url,
      returnUrl: return_url,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await order.save();
    
    // 生成支付链接（这里简化处理，实际应该调用支付网关）
    const paymentUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/payment/${orderid}`;
    
    // 返回标准格式响应
    const responseData = {
      orderid: orderid,
      amount: amount,
      payurl: paymentUrl,
      qrcode: paymentUrl, // 简化处理，实际应该生成二维码
      status: 'success'
    };
    
    res.json(successResponse(responseData, '订单创建成功'));
    
  } catch (error) {
    console.error('创建支付订单失败:', error);
    console.error('错误堆栈:', error.stack);
    res.json(errorResponse(500, '创建订单失败'));
  }
});

/**
 * 查询订单状态
 * POST /api/query
 * 参数: appid, orderid, sign
 */
router.post('/query', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 查找订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(404, '订单不存在'));
    }
    
    // 返回订单状态
    const responseData = {
      orderid: order.orderId,
      amount: order.amount.toString(),
      status: order.status,
      paytime: order.paidAt ? order.paidAt.getTime() : null,
      desc: order.description
    };
    
    res.json(successResponse(responseData, '查询成功'));
    
  } catch (error) {
    console.error('查询订单失败:', error);
    res.json(errorResponse(500, '查询订单失败'));
  }
});

/**
 * 关闭订单
 * POST /api/close
 * 参数: appid, orderid, sign
 */
router.post('/close', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 查找订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(404, '订单不存在'));
    }
    
    if (order.status === 'paid') {
      return res.json(errorResponse(400, '已支付订单不能关闭'));
    }
    
    // 更新订单状态
    order.status = 'CANCELLED';
    order.updatedAt = new Date();
    await order.save();
    
    res.json(successResponse({ orderid, status: 'CANCELLED' }, '订单关闭成功'));
    
  } catch (error) {
    console.error('关闭订单失败:', error);
    res.json(errorResponse(500, '关闭订单失败'));
  }
});

/**
 * 退款接口
 * POST /api/refund
 * 参数: appid, orderid, amount, sign
 */
router.post('/refund', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, amount } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 查找订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(404, '订单不存在'));
    }
    
    if (order.status !== 'paid') {
      return res.json(errorResponse(400, '订单未支付，无法退款'));
    }
    
    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > order.amount) {
      return res.json(errorResponse(400, '退款金额不正确'));
    }
    
    // 创建退款交易
    const transaction = new Transaction({
      transactionId: `refund_${Date.now()}`,
      orderId: order.orderId,
      merchantId: merchant.merchantId,
      type: 'DEPOSIT', // 支付订单类型为充值
      provider: {
        name: 'cashgit' // 设置支付提供者名称
      },      type: 'refund',
      amount: refundAmount,
      status: 'PENDING',
      description: `退款订单: ${orderid}`,
      createdAt: new Date()
    });
    
    await transaction.save();
    
    // 更新订单状态
    order.status = 'SUCCESS';
    order.updatedAt = new Date();
    await order.save();
    
    res.json(successResponse({
      orderid,
      refund_amount: refundAmount,
      status: 'success'
    }, '退款申请成功'));
    
  } catch (error) {
    console.error('退款失败:', error);
    res.json(errorResponse(500, '退款失败'));
  }
});

module.exports = router;
