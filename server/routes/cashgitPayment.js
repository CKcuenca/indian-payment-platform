const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const SignatureUtil = require('../utils/signature');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const { PaymentManager } = require('../services/payment-manager');
const PassPayClient = require('../services/passpay-client');
const PaymentConfig = require('../models/PaymentConfig');

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
    
    // 转换为paisa单位存储到数据库
    const amountInPaisa = Math.round(numAmount * 100);
    
    // 检查订单是否已存在
    const existingOrder = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (existingOrder) {
      return res.json(errorResponse(400, '订单已存在'));
    }
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
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
        transactionId: passpayResult.data.tradeNo
      },
      amount: amountInPaisa,
      description: desc || 'CashGit支付订单',
      status: 'PENDING',
      paymentMethod: 'passpay_payment',
      notifyUrl: notify_url,
      returnUrl: return_url,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await order.save();
    
    // 返回PassPay的支付信息
    const responseData = {
      orderid: orderid,
      amount: amount,
      trade_no: passpayResult.data.tradeNo,
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
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
    }
    
    // 创建PassPay客户端
    const passpayClient = new PassPayClient(passpayConfig);
    
    // 调用PassPay查询订单状态
    const passpayResult = await passpayClient.queryCollectionOrderStatus(
      orderid, 
      order.provider.transactionId
    );
    
    if (!passpayResult.success) {
      // 如果PassPay查询失败，返回本地状态
      const responseData = {
        orderid: order.orderId,
        amount: (order.amount / 100).toFixed(2),
        status: order.status,
        paytime: order.paidAt ? order.paidAt.getTime() : null,
        desc: order.description
      };
      
      return res.json(successResponse(responseData, '查询成功（本地状态）'));
    }
    
    // 更新本地订单状态
    if (passpayResult.data.status !== order.status) {
      order.status = passpayResult.data.status;
      order.updatedAt = new Date();
      
      if (passpayResult.data.status === 'SUCCESS') {
        order.paidAt = new Date();
      }
      
      await order.save();
    }
    
    // 返回PassPay的最新状态
    const responseData = {
      orderid: order.orderId,
      amount: (order.amount / 100).toFixed(2),
      status: passpayResult.data.status,
      paytime: order.paidAt ? order.paidAt.getTime() : null,
      desc: order.description,
      utr: passpayResult.data.utr
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
    const refundAmountInPaisa = Math.round(refundAmount * 100);
    if (isNaN(refundAmount) || refundAmount <= 0 || refundAmountInPaisa > order.amount) {
      return res.json(errorResponse(400, '退款金额不正确'));
    }
    
    // 创建退款交易
    const transaction = new Transaction({
      transactionId: `refund_${Date.now()}`,
      orderId: order.orderId,
      merchantId: merchant.merchantId,
      type: 'REFUND',
      amount: refundAmountInPaisa,
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

/**
 * UTR补单接口
 * POST /api/utr/submit
 * 参数: appid, orderid, utr_number, amount, sign
 */
router.post('/utr/submit', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, utr_number, amount } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 验证必要参数
    if (!utr_number || !amount) {
      return res.json(errorResponse(400, '缺少必要参数：utr_number, amount'));
    }
    
    // 查找订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (!order) {
      return res.json(errorResponse(404, '订单不存在'));
    }
    
    if (order.status === 'SUCCESS') {
      return res.json(errorResponse(400, '订单已成功，无需补单'));
    }
    
    // 验证金额
    const utrAmount = parseFloat(amount);
    const utrAmountInPaisa = Math.round(utrAmount * 100);
    if (isNaN(utrAmount) || utrAmount <= 0) {
      return res.json(errorResponse(400, 'UTR金额格式不正确'));
    }
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
    }
    
    // 创建PassPay客户端
    const passpayClient = new PassPayClient(passpayConfig);
    
    // 调用PassPay提交UTR
    const passpayResult = await passpayClient.submitUTR(
      orderid,
      order.provider.transactionId,
      utr_number
    );
    
    if (!passpayResult.success) {
      return res.json(errorResponse(500, `PassPay UTR提交失败: ${passpayResult.error}`));
    }
    
    // 更新本地订单状态和UTR信息
    order.status = 'PROCESSING';
    order.updatedAt = new Date();
    order.provider.utrNumber = utr_number;
    order.provider.utrAmount = utrAmountInPaisa;
    
    // 添加状态历史记录
    order.statusHistory.push({
      status: 'PROCESSING',
      timestamp: new Date(),
      reason: `UTR补单: ${utr_number}`,
      executedBy: 'system'
    });
    
    await order.save();
    
    // 创建UTR交易记录
    const utrTransaction = new Transaction({
      transactionId: `utr_${Date.now()}`,
      orderId: order.orderId,
      merchantId: merchant.merchantId,
      type: 'DEPOSIT',
      provider: {
        name: 'passpay',
        utrNumber: utr_number
      },
      amount: utrAmountInPaisa,
      status: 'PENDING',
      description: `UTR补单: ${utr_number}`,
      createdAt: new Date()
    });
    
    await utrTransaction.save();
    
    res.json(successResponse({
      orderid,
      utr_number,
      amount: utrAmount,
      status: 'processing'
    }, 'UTR补单成功'));
    
  } catch (error) {
    console.error('UTR补单失败:', error);
    res.json(errorResponse(500, 'UTR补单失败'));
  }
});

/**
 * UTR状态查询接口
 * POST /api/utr/query
 * 参数: appid, orderid, sign
 */
router.post('/utr/query', mgAuthMiddleware, async (req, res) => {
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
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
    }
    
    // 创建PassPay客户端
    const passpayClient = new PassPayClient(passpayConfig);
    
    // 调用PassPay查询UTR状态
    const passpayResult = await passpayClient.queryUTRStatus(
      orderid,
      order.provider.transactionId
    );
    
    if (!passpayResult.success) {
      // 如果PassPay查询失败，返回本地状态
      const utrTransaction = await Transaction.findOne({
        orderId: orderid,
        'provider.utrNumber': { $exists: true }
      });
      
      if (!utrTransaction) {
        return res.json(errorResponse(404, '未找到UTR记录'));
      }
      
      return res.json(successResponse({
        orderid,
        utr_number: utrTransaction.provider.utrNumber,
        amount: (utrTransaction.amount / 100).toFixed(2),
        status: utrTransaction.status,
        created_at: utrTransaction.createdAt
      }, 'UTR查询成功（本地状态）'));
    }
    
    // 返回PassPay的最新状态
    res.json(successResponse({
      orderid,
      utr_status: passpayResult.data.utrStatus,
      message: passpayResult.data.message
    }, 'UTR查询成功'));
    
  } catch (error) {
    console.error('UTR查询失败:', error);
    res.json(errorResponse(500, 'UTR查询失败'));
  }
});

/**
 * 查询UPI接口
 * POST /api/upi/query
 * 参数: appid, sign
 */
router.post('/upi/query', mgAuthMiddleware, async (req, res) => {
  try {
    const merchant = req.merchant;
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
    }
    
    // 创建PassPay客户端
    const passpayClient = new PassPayClient(passpayConfig);
    
    // 调用PassPay查询UPI（这里使用一个示例订单ID）
    // 实际应用中可能需要从配置获取或使用其他方式
    const passpayResult = await passpayClient.queryUPI(
      'SYSTEM_UPI_QUERY',
      'SYSTEM_TRADE_NO'
    );
    
    if (!passpayResult.success) {
      // 如果PassPay查询失败，返回默认UPI信息
      const defaultUpiInfo = [
        {
          upi_id: 'cashgit@upi',
          name: 'CashGit Payment UPI',
          status: 'ACTIVE',
          qr_code: `${process.env.BASE_URL || 'http://localhost:3000'}/upi/cashgit@upi`
        },
        {
          upi_id: 'pay@cashgit',
          name: 'CashGit UPI Account',
          status: 'ACTIVE',
          qr_code: `${process.env.BASE_URL || 'http://localhost:3000'}/upi/pay@cashgit`
        }
      ];
      
      return res.json(successResponse({
        upi_list: defaultUpiInfo
      }, 'UPI查询成功（默认信息）'));
    }
    
    // 返回PassPay的UPI信息
    res.json(successResponse({
      upi_id: passpayResult.data.upiId,
      upi_status: passpayResult.data.upiStatus,
      message: passpayResult.data.message
    }, 'UPI查询成功'));
    
  } catch (error) {
    console.error('UPI查询失败:', error);
    res.json(errorResponse(500, 'UPI查询失败'));
  }
});

/**
 * 创建代付订单接口
 * POST /api/payout/create
 * 参数: appid, orderid, amount, account_number, ifsc_code, account_holder, notify_url, sign
 */
router.post('/payout/create', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid, amount, account_number, ifsc_code, account_holder, notify_url } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 验证必要参数
    if (!amount || !account_number || !ifsc_code || !account_holder) {
      return res.json(errorResponse(400, '缺少必要参数：amount, account_number, ifsc_code, account_holder'));
    }
    
    // 验证金额
    const payoutAmount = parseFloat(amount);
    const payoutAmountInPaisa = Math.round(payoutAmount * 100);
    if (isNaN(payoutAmount) || payoutAmount <= 0) {
      return res.json(errorResponse(400, '代付金额格式不正确'));
    }
    
    // 检查订单是否已存在
    const existingOrder = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId 
    });
    
    if (existingOrder) {
      return res.json(errorResponse(400, '订单已存在'));
    }
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
    }
    
    // 创建PassPay客户端
    const passpayClient = new PassPayClient(passpayConfig);
    
    // 调用PassPay创建代付订单
    const passpayResult = await passpayClient.createPayoutOrder({
      orderId: orderid,
      amount: payoutAmount,
      accountNumber: account_number,
      ifscCode: ifsc_code,
      accountHolder: account_holder,
      notifyUrl: notify_url
    });
    
    if (!passpayResult.success) {
      return res.json(errorResponse(500, `PassPay创建代付订单失败: ${passpayResult.error}`));
    }
    
    // 创建本地代付订单记录
    const payoutOrder = new Order({
      orderId: orderid,
      merchantId: merchant.merchantId,
      type: 'WITHDRAWAL',
      provider: {
        name: 'passpay',
        transactionId: passpayResult.data.tradeNo
      },
      amount: payoutAmountInPaisa,
      description: '代付订单',
      status: 'PENDING',
      paymentMethod: 'passpay_payout',
      notifyUrl: notify_url,
      bankAccount: {
        accountNumber: account_number,
        ifscCode: ifsc_code,
        accountHolderName: account_holder
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await payoutOrder.save();
    
    res.json(successResponse({
      orderid,
      trade_no: passpayResult.data.tradeNo,
      amount: amount,
      status: 'pending'
    }, '代付订单创建成功'));
    
  } catch (error) {
    console.error('创建代付订单失败:', error);
    res.json(errorResponse(500, '创建代付订单失败'));
  }
});

/**
 * 查询代付订单状态接口
 * POST /api/payout/query
 * 参数: appid, orderid, sign
 */
router.post('/payout/query', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid } = req.verifiedParams;
    const merchant = req.merchant;
    
    // 查找代付订单
    const order = await Order.findOne({ 
      orderId: orderid, 
      merchantId: merchant.merchantId,
      type: 'WITHDRAWAL'
    });
    
    if (!order) {
      return res.json(errorResponse(404, '代付订单不存在'));
    }
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
    }
    
    // 创建PassPay客户端
    const passpayClient = new PassPayClient(passpayConfig);
    
    // 调用PassPay查询代付订单状态
    const passpayResult = await passpayClient.queryPayoutOrderStatus(
      orderid,
      order.provider.transactionId
    );
    
    if (!passpayResult.success) {
      // 如果PassPay查询失败，返回本地状态
      return res.json(successResponse({
        orderid,
        amount: (order.amount / 100).toFixed(2),
        status: order.status,
        account_number: order.bankAccount?.accountNumber,
        ifsc_code: order.bankAccount?.ifscCode,
        account_holder: order.bankAccount?.accountHolderName,
        create_time: order.createdAt,
        update_time: order.updatedAt
      }, '代付订单查询成功（本地状态）'));
    }
    
    // 更新本地订单状态
    if (passpayResult.data.status !== order.status) {
      order.status = passpayResult.data.status;
      order.updatedAt = new Date();
      await order.save();
    }
    
    // 返回PassPay的最新状态
    res.json(successResponse({
      orderid,
      amount: (order.amount / 100).toFixed(2),
      status: passpayResult.data.status,
      account_number: order.bankAccount?.accountNumber,
      ifsc_code: order.bankAccount?.ifscCode,
      account_holder: order.bankAccount?.accountHolderName,
      create_time: order.createdAt,
      update_time: order.updatedAt
    }, '代付订单查询成功'));
    
  } catch (error) {
    console.error('查询代付订单失败:', error);
    res.json(errorResponse(500, '查询代付订单失败'));
  }
});

/**
 * 余额查询接口
 * POST /api/balance/query
 * 参数: appid, sign
 */
router.post('/balance/query', mgAuthMiddleware, async (req, res) => {
  try {
    const merchant = req.merchant;
    
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    if (!passpayConfig) {
      return res.json(errorResponse(500, 'PassPay配置未找到'));
    }
    
    // 创建PassPay客户端
    const passpayClient = new PassPayClient(passpayConfig);
    
    // 调用PassPay查询余额
    const passpayResult = await passpayClient.getBalance();
    
    if (!passpayResult.success) {
      // 如果PassPay查询失败，计算本地余额
      const totalDeposits = await Order.aggregate([
        { $match: { merchantId: merchant.merchantId, type: 'DEPOSIT', status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const totalWithdrawals = await Order.aggregate([
        { $match: { merchantId: merchant.merchantId, type: 'WITHDRAWAL', status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const totalRefunds = await Transaction.aggregate([
        { $match: { merchantId: merchant.merchantId, type: 'REFUND', status: 'SUCCESS' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const deposits = totalDeposits[0]?.total || 0;
      const withdrawals = totalWithdrawals[0]?.total || 0;
      const refunds = totalRefunds[0]?.total || 0;
      
      // 可用余额 = 总收入 - 总支出 - 总退款
      const availableBalance = deposits - withdrawals - refunds;
      
      return res.json(successResponse({
        balance: (availableBalance / 100).toFixed(2),
        currency: 'INR',
        total_deposits: (deposits / 100).toFixed(2),
        total_withdrawals: (withdrawals / 100).toFixed(2),
        total_refunds: (refunds / 100).toFixed(2),
        last_update: new Date().toISOString(),
        note: '本地计算余额（PassPay查询失败）'
      }, '余额查询成功（本地计算）'));
    }
    
    // 返回PassPay的余额信息
    res.json(successResponse({
      balance: passpayResult.data.balance.toFixed(2),
      currency: passpayResult.data.currency,
      message: passpayResult.data.message,
      last_update: new Date().toISOString()
    }, '余额查询成功'));
    
  } catch (error) {
    console.error('余额查询失败:', error);
    res.json(errorResponse(500, '余额查询失败'));
  }
});

module.exports = router;
