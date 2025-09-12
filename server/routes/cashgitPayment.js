const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const SignatureUtil = require('../utils/signature');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const { PaymentManager } = require('../services/payment-manager');
const PassPayClient = require('../services/passpay-client');
const WakeupProvider = require('../services/payment-providers/wakeup-provider');
const PaymentConfig = require('../models/PaymentConfig');

/**
 * 处理原生支付 (PassPay)
 */
async function handleNativePayment(req, res, orderData) {
  const { orderid, numAmount, desc, notify_url, return_url, merchant } = orderData;
  
  // 转换为paisa单位存储到数据库
  const amountInPaisa = Math.round(numAmount * 100);
  
  // 获取PassPay配置
  const passpayConfig = await PaymentConfig.findOne({
    'provider.name': 'passpay',
    'provider.type': 'native'
  });
  
  if (!passpayConfig) {
    return res.json(errorResponse(500, 'PassPay原生配置未找到'));
  }
  
  // 创建PassPay客户端
  const passpayClient = new PassPayClient(passpayConfig);
  
  // 调用PassPay创建代收订单
  const passpayResult = await passpayClient.createCollectionOrder({
    orderId: orderid,
    amount: numAmount,
    notifyUrl: notify_url
  });
  
  if (!passpayResult.success) {
    return res.json(errorResponse(500, `PassPay创建订单失败: ${passpayResult.error}`));
  }
  
  // 创建本地订单记录
  const order = new Order({
    orderId: orderid,
    merchantId: merchant.merchantId,
    type: 'DEPOSIT',
    provider: {
      name: 'passpay',
      type: 'native',
      transactionId: passpayResult.data.tradeNo
    },
    amount: amountInPaisa,
    description: desc || 'CashGit原生支付订单',
    status: 'PENDING',
    paymentMethod: 'passpay_native',
    notifyUrl: notify_url,
    returnUrl: return_url,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  await order.save();
  
  // 返回PassPay的支付信息
  const responseData = {
    orderid: orderid,
    amount: numAmount.toFixed(2),
    trade_no: passpayResult.data.tradeNo,
    pay_type: 'native',
    status: 'success'
  };
  
  return res.json(successResponse(responseData, '原生支付订单创建成功'));
}

/**
 * 处理唤醒支付
 */
async function handleWakeupPayment(req, res, orderData) {
  const { orderid, numAmount, desc, notify_url, return_url, customer_phone, merchant } = orderData;
  
  // 转换为paisa单位存储到数据库
  const amountInPaisa = Math.round(numAmount * 100);
  
  // 获取唤醒支付配置
  const wakeupConfig = await PaymentConfig.findOne({
    'provider.name': 'passpay',
    'provider.type': 'wakeup'
  });
  
  if (!wakeupConfig) {
    return res.json(errorResponse(500, '唤醒支付配置未找到'));
  }
  
  // 创建唤醒支付提供商实例
  const wakeupProvider = new WakeupProvider(wakeupConfig);
  
  // 创建唤醒支付订单
  const result = await wakeupProvider.createCollectionOrder({
    orderId: orderid,
    amount: numAmount,
    currency: 'INR',
    customerPhone: customer_phone,
    description: desc,
    notifyUrl: notify_url,
    returnUrl: return_url,
    useDhPay: true // 默认使用DhPay作为上游
  });
  
  if (!result.success) {
    return res.json(errorResponse(500, `唤醒支付创建订单失败: ${result.error}`));
  }
  
  // 创建本地订单记录
  const order = new Order({
    orderId: orderid,
    merchantId: merchant.merchantId,
    type: 'DEPOSIT',
    provider: {
      name: 'passpay',
      type: 'wakeup',
      transactionId: result.dhpayOrderId || orderid
    },
    amount: amountInPaisa,
    description: desc || 'CashGit唤醒支付订单',
    status: 'PENDING',
    paymentMethod: 'passpay_wakeup',
    customer: {
      phone: customer_phone
    },
    notifyUrl: notify_url,
    returnUrl: return_url,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  await order.save();
  
  // 根据唤醒支付结果返回不同格式
  if (result.paymentUrl) {
    // DhPay支付链接
    return res.json(successResponse({
      orderid: orderid,
      amount: numAmount.toFixed(2),
      payment_url: result.paymentUrl,
      dhpay_order_id: result.dhpayOrderId,
      pay_type: 'wakeup',
      status: 'success',
      message: result.message
    }, '唤醒支付订单创建成功'));
  } else {
    // UPI转账信息
    return res.json(successResponse({
      orderid: orderid,
      amount: numAmount.toFixed(2),
      upi_transfer_info: result.upiTransferInfo,
      pay_type: 'wakeup',
      status: 'success',
      verification_required: true,
      message: result.message
    }, '唤醒支付订单创建成功'));
  }
}

/**
 * 创建支付订单 (统一接口)
 * POST /api/pay
 * 参数: appid, orderid, amount, desc, sign, pay_id, [其他参数]
 * pay_id: 1=原生支付(默认), 2=唤醒支付
 */
router.post('/pay', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, amount, desc, notify_url, return_url, pay_id, customer_phone } = req.verifiedParams;
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
    
    // 根据pay_id选择支付通道
    // pay_id缺省或为1时使用原生支付，pay_id为2时使用唤醒支付
    const paymentType = pay_id === '2' ? 'wakeup' : 'native';
    
    console.log(`🔍 支付订单创建 - 订单号: ${orderid}, 金额: ${numAmount}, 支付类型: ${paymentType} (pay_id: ${pay_id || 'undefined'})`);
    
    if (paymentType === 'wakeup') {
      // 唤醒支付通道
      if (!customer_phone) {
        return res.json(errorResponse(400, '唤醒支付需要customer_phone参数'));
      }
      
      return await handleWakeupPayment(req, res, {
        orderid,
        numAmount,
        desc,
        notify_url,
        return_url,
        customer_phone,
        merchant
      });
    } else {
      // 原生PassPay通道 (默认)
      return await handleNativePayment(req, res, {
        orderid,
        numAmount,
        desc,
        notify_url,
        return_url,
        merchant
      });
    }
    
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
    
    console.log(`🔍 查询订单 - 订单号: ${orderid}, 支付类型: ${order.provider.type || 'native'}`);
    
    // 根据订单的支付类型选择查询方式
    if (order.provider.type === 'wakeup') {
      // 唤醒支付查询
      const wakeupConfig = await PaymentConfig.findOne({
        'provider.name': 'passpay',
        'provider.type': 'wakeup'
      });
      
      if (wakeupConfig) {
        const wakeupProvider = new WakeupProvider(wakeupConfig);
        const result = await wakeupProvider.queryOrderStatus(orderid);
        
        if (result.success) {
          // 更新本地状态
          if (result.status !== order.status) {
            order.status = result.status;
            order.updatedAt = new Date();
            if (result.status === 'SUCCESS') {
              order.paidAt = new Date();
            }
            await order.save();
          }
        }
      }
    } else {
      // 原生PassPay查询
      const passpayConfig = await PaymentConfig.findOne({
        'provider.name': 'passpay',
        'provider.type': 'native'
      });
      
      if (passpayConfig && order.provider.transactionId) {
        const passpayClient = new PassPayClient(passpayConfig);
        const passpayResult = await passpayClient.queryCollectionOrderStatus(
          orderid, 
          order.provider.transactionId
        );
        
        if (passpayResult.success) {
          // 更新本地订单状态
          if (passpayResult.data.status !== order.status) {
            order.status = passpayResult.data.status;
            order.updatedAt = new Date();
            
            if (passpayResult.data.status === 'SUCCESS') {
              order.paidAt = new Date();
            }
            
            await order.save();
          }
        }
      }
    }
    
    // 返回统一格式的查询结果
    const responseData = {
      orderid: order.orderId,
      amount: (order.amount / 100).toFixed(2),
      status: order.status,
      pay_type: order.provider.type || 'native',
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
    
    // 检查订单状态
    if (order.status === 'SUCCESS') {
      return res.json(errorResponse(400, '订单已支付，不能关闭'));
    }
    
    if (order.status === 'CANCELLED') {
      return res.json(errorResponse(400, '订单已关闭'));
    }
    
    // 更新订单状态
    order.status = 'CANCELLED';
    order.updatedAt = new Date();
    await order.save();
    
    const responseData = {
      orderid: orderid,
      amount: (order.amount / 100).toFixed(2),
      status: 'CANCELLED'
    };
    
    res.json(successResponse(responseData, '订单关闭成功'));
    
  } catch (error) {
    console.error('关闭订单失败:', error);
    res.json(errorResponse(500, '关闭订单失败'));
  }
});

/**
 * UTR补单
 * POST /api/utr/submit
 * 参数: appid, orderid, utr_number, amount, sign
 */
router.post('/utr/submit', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, utr_number, amount } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 查找订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(404, '订单不存在'));
    }
    
    // 验证金额
    const numAmount = parseFloat(amount);
    const orderAmount = order.amount / 100;
    
    if (Math.abs(numAmount - orderAmount) > 0.01) {
      return res.json(errorResponse(400, '金额不匹配'));
    }
    
    // 根据订单类型处理UTR补单
    if (order.provider.type === 'native') {
      // 原生PassPay UTR补单
      const passpayConfig = await PaymentConfig.findOne({
        'provider.name': 'passpay',
        'provider.type': 'native'
      });
      
      if (passpayConfig) {
        const passpayClient = new PassPayClient(passpayConfig);
        const result = await passpayClient.submitUTR({
          orderId: orderid,
          utrNumber: utr_number,
          amount: numAmount
        });
        
        if (result.success) {
          // 更新订单
          order.status = 'SUCCESS';
          order.paidAt = new Date();
          order.utrNumber = utr_number;
          order.utrAmount = Math.round(numAmount * 100);
          order.updatedAt = new Date();
          await order.save();
        }
      }
    } else {
      // 唤醒支付UTR补单
      const wakeupConfig = await PaymentConfig.findOne({
        'provider.name': 'passpay',
        'provider.type': 'wakeup'
      });
      
      if (wakeupConfig) {
        const wakeupProvider = new WakeupProvider(wakeupConfig);
        const result = await wakeupProvider.manualVerification(orderid, {
          utrNumber: utr_number,
          transferAmount: numAmount,
          transferDate: new Date().toISOString()
        });
        
        if (result.success) {
          // 更新订单
          order.status = 'SUCCESS';
          order.paidAt = new Date();
          order.utrNumber = utr_number;
          order.utrAmount = Math.round(numAmount * 100);
          order.updatedAt = new Date();
          await order.save();
        }
      }
    }
    
    const responseData = {
      orderid: orderid,
      amount: (order.amount / 100).toFixed(2),
      status: order.status,
      utr_number: utr_number
    };
    
    res.json(successResponse(responseData, 'UTR补单提交成功'));
    
  } catch (error) {
    console.error('UTR补单失败:', error);
    res.json(errorResponse(500, 'UTR补单失败'));
  }
});

module.exports = router;