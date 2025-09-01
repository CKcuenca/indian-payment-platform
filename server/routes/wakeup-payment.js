const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const WakeupProvider = require('../services/payment-providers/wakeup-provider');
const PaymentConfig = require('../models/PaymentConfig');
const Order = require('../models/order');

/**
 * 创建唤醒支付订单
 * POST /api/wakeup/create
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
    
    // 检查订单是否已存在
    const existingOrder = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (existingOrder) {
      return res.json(errorResponse(400, '订单已存在'));
    }
    
    // 获取唤醒支付配置 - 查找系统级配置或当前商户的配置
    let wakeupConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup',
      merchantId: 'system'
    });
    
    if (!wakeupConfig) {
      wakeupConfig = await PaymentConfig.findOne({
        'provider.name': 'wakeup'
      });
    }
    
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
      returnUrl: return_url
    });
    
    if (result.success) {
      // 创建订单记录
      const orderData = {
        orderId: orderid,
        merchantId: merchant.merchantId,
        type: 'DEPOSIT',
        amount: numAmount,
        currency: 'INR',
        fee: 0, // 唤醒支付暂时不收取手续费
        provider: {
          name: 'wakeup'
        },
        customer: {
          phone: customer_phone
        },
        callback: {
          successUrl: return_url,
          failureUrl: return_url,
          notifyUrl: notify_url
        },
        status: 'PENDING'
      };
      
      const order = new Order(orderData);
      await order.save();
      
      return res.json(successResponse({
        orderid: orderid,
        status: 'PENDING',
        message: result.message,
        upi_transfer_info: result.upiTransferInfo,
        verification_required: true
      }));
    } else {
      return res.json(errorResponse(500, result.error || '创建唤醒支付订单失败'));
    }
    
  } catch (error) {
    console.error('创建唤醒支付订单失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 查询唤醒支付订单状态
 * POST /api/wakeup/query
 */
router.post('/query', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 查询订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(404, '订单不存在'));
    }
    
    // 获取唤醒支付配置 - 查找系统级配置或当前商户的配置
    let wakeupConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup',
      merchantId: 'system'
    });
    
    if (!wakeupConfig) {
      wakeupConfig = await PaymentConfig.findOne({
        'provider.name': 'wakeup'
      });
    }
    
    if (!wakeupConfig) {
      return res.json(errorResponse(500, '唤醒支付配置未找到'));
    }
    
    // 创建唤醒支付提供商实例
    const wakeupProvider = new WakeupProvider(wakeupConfig);
    
    // 查询订单状态
    const result = await wakeupProvider.queryOrderStatus(orderid);
    
    if (result.success) {
      return res.json(successResponse({
        orderid: orderid,
        status: result.status,
        message: result.message,
        transfer_info: result.transferInfo
      }));
    } else {
      return res.json(errorResponse(500, result.error || '查询订单状态失败'));
    }
    
  } catch (error) {
    console.error('查询唤醒支付订单失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 手动验证唤醒支付转账
 * POST /api/wakeup/verify
 */
router.post('/verify', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, utr_number, transfer_amount, transfer_date } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 查询订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(404, '订单不存在'));
    }
    
    // 获取唤醒支付配置
    const wakeupConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup'
    });
    
    if (!wakeupConfig) {
      return res.json(errorResponse(500, '唤醒支付配置未找到'));
    }
    
    // 创建唤醒支付提供商实例
    const wakeupProvider = new WakeupProvider(wakeupConfig);
    
    // 手动验证转账
    const result = await wakeupProvider.manualVerification(orderid, {
      utrNumber: utr_number,
      transferAmount: parseFloat(transfer_amount),
      transferDate: transfer_date
    });
    
    if (result.success) {
      // 更新订单状态
      order.status = 'SUCCESS';
      order.provider.utrNumber = utr_number;
      order.updatedAt = new Date();
      await order.save();
      
      return res.json(successResponse({
        orderid: orderid,
        status: 'SUCCESS',
        message: result.message
      }));
    } else {
      return res.json(errorResponse(400, result.error || '验证失败'));
    }
    
  } catch (error) {
    console.error('手动验证唤醒支付失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 获取可用的收款账户信息
 * GET /api/wakeup/accounts
 */
router.get('/accounts', mgAuthMiddleware, async (req, res) => {
  try {
    // 获取唤醒支付配置
    const wakeupConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup'
    });
    
    if (!wakeupConfig) {
      return res.json(errorResponse(500, '唤醒支付配置未找到'));
    }
    
    // 创建唤醒支付提供商实例
    const wakeupProvider = new WakeupProvider(wakeupConfig);
    
    // 获取可用账户
    const accounts = await wakeupProvider.getAvailableAccounts();
    
    return res.json(successResponse({
      accounts: accounts.map(account => ({
        account_holder_name: account.accountHolderName,
        upi_id: account.upiId,
        bank_name: account.bankName,
        daily_limit: account.dailyLimit,
        monthly_limit: account.monthlyLimit,
        is_active: account.isActive
      }))
    }));
    
  } catch (error) {
    console.error('获取收款账户失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 检查转账状态（定时任务调用）
 * POST /api/wakeup/check-status
 */
router.post('/check-status', async (req, res) => {
  try {
    const { orderid } = req.body;
    
    if (!orderid) {
      return res.status(400).json({ error: '订单ID不能为空' });
    }
    
    // 获取唤醒支付配置
    const wakeupConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup'
    });
    
    if (!wakeupConfig) {
      return res.status(500).json({ error: '唤醒支付配置未找到' });
    }
    
    // 创建唤醒支付提供商实例
    const wakeupProvider = new WakeupProvider(wakeupConfig);
    
    // 检查转账状态
    await wakeupProvider.checkTransferStatus(orderid);
    
    return res.json({ success: true, message: '状态检查完成' });
    
  } catch (error) {
    console.error('检查转账状态失败:', error);
    return res.status(500).json({ error: '系统错误' });
  }
});

/**
 * DhPay回调通知处理
 * POST /api/wakeup/dhpay-notify
 */
router.post('/dhpay-notify', async (req, res) => {
  try {
    console.log('DhPay回调通知:', req.body);
    
    // 获取唤醒支付配置 - 查找系统级配置或当前商户的配置
    let wakeupConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup',
      merchantId: 'system'
    });
    
    if (!wakeupConfig) {
      wakeupConfig = await PaymentConfig.findOne({
        'provider.name': 'wakeup'
      });
    }
    
    if (!wakeupConfig) {
      console.error('唤醒支付配置未找到');
      return res.status(500).json({ success: false, error: '配置未找到' });
    }
    
    // 创建唤醒支付提供商实例
    const wakeupProvider = new WakeupProvider(wakeupConfig);
    
    // 处理DhPay回调
    const result = await wakeupProvider.handleDhPayCallback(req.body);
    
    if (result.success) {
      console.log('DhPay回调处理成功:', result.message);
      res.json({ success: true, message: '回调处理成功' });
    } else {
      console.error('DhPay回调处理失败:', result.error);
      res.status(400).json({ success: false, error: result.error });
    }
    
  } catch (error) {
    console.error('处理DhPay回调失败:', error);
    res.status(500).json({ success: false, error: '系统错误' });
  }
});

/**
 * DhPay返回页面处理
 * GET /api/wakeup/dhpay-return
 */
router.get('/dhpay-return', async (req, res) => {
  try {
    console.log('DhPay返回页面:', req.query);
    
    const { orderId, status, amount } = req.query;
    
    // 这里可以重定向到前端页面或返回结果
    res.json({
      success: true,
      message: 'DhPay返回页面处理成功',
      data: {
        orderId,
        status,
        amount
      }
    });
    
  } catch (error) {
    console.error('处理DhPay返回页面失败:', error);
    res.status(500).json({ success: false, error: '系统错误' });
  }
});

module.exports = router;
