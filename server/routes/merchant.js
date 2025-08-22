const express = require('express');
const { body, validationResult } = require('express-validator');
const { apiKeyAuth } = require('../middleware/auth');
const { getIndianTimeISO } = require('../utils/timeUtils');
const mongoose = require('mongoose');

const router = express.Router();

// 验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// 获取商户信息（需要认证）
router.get('/info', apiKeyAuth, (req, res) => {
  try {
    // 从认证中间件获取商户信息
    const merchant = req.merchant;
    
    res.json({
      success: true,
      data: {
        merchantId: merchant.merchantId,
        name: merchant.name,
        email: merchant.email,
        status: merchant.status,
        balance: merchant.balance.available,
        paymentConfig: {
          providers: merchant.paymentConfig.providers.map(p => p.name),
          defaultProvider: merchant.paymentConfig.defaultProvider
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取商户信息失败'
    });
  }
});

// 获取测试商户信息（无需认证，仅用于开发测试）
router.get('/test-info', (req, res) => {
  res.json({
    success: true,
    data: {
      merchantId: 'TEST001',
      name: '测试商户',
      email: 'test@example.com',
      status: 'ACTIVE',
      balance: 100000,
      paymentConfig: {
        providers: ['mock', 'passpay'],
        defaultProvider: 'mock'
      }
    }
  });
});

// 获取交易历史
router.get('/transactions', (req, res) => {
  try {
    // 获取筛选参数
    const { type, status, merchantId, providerName, startDate, endDate, transactionId, page = 1, limit = 10 } = req.query;
    
    // 参数验证
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // 限制最大100条
    
    // 验证日期格式
    if (startDate && !Date.parse(startDate)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效' });
    }
    if (endDate && !Date.parse(endDate)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效' });
    }
    
    // 验证日期范围
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, error: '开始日期不能晚于结束日期' });
    }
    
    console.log('Received filter params:', { type, status, merchantId, providerName, startDate, endDate, transactionId, page: pageNum, limit: limitNum });

  // 返回模拟交易数据，符合前端Transaction接口
  let mockTransactions = [
    {
      transactionId: 'TXN001',
      orderId: 'ORD001',
      merchantId: 'MERCH001',
      type: 'DEPOSIT',
      amount: 100000, // 以分为单位
      fee: 1000,
      netAmount: 99000,
      currency: 'INR',
      balanceChange: 99000,
      balanceSnapshot: {
        before: 500000,
        after: 599000
      },
      status: 'SUCCESS',
      orderStatus: 'SUCCESS',
      provider: {
        name: 'airpay',
        refId: 'AP_REF_001'
      },
      upiPayment: {
        upiId: 'user@bank',
        phoneNumber: '+919876543210',
        accountName: 'Test User',
        bankName: 'Test Bank',
        ifscCode: 'TEST0001234',
        accountNumber: '1234567890'
      },
      beneficiaryAccount: '1234567890',
      beneficiaryName: 'Test User',
      createdAt: getIndianTimeISO(),
      updatedAt: getIndianTimeISO()
    },
    {
      transactionId: 'TXN002',
      orderId: 'ORD002',
      merchantId: 'MERCH002',
      type: 'WITHDRAWAL',
      amount: 50000, // 以分为单位
      fee: 500,
      netAmount: 49500,
      currency: 'INR',
      balanceChange: -50000,
      balanceSnapshot: {
        before: 599000,
        after: 549000
      },
      status: 'SUCCESS',
      orderStatus: 'SUCCESS',
      provider: {
        name: 'cashfree',
        refId: 'CF_REF_002'
      },
      upiPayment: {
        upiId: 'merchant@bank',
        phoneNumber: '+919876543211',
        accountName: 'Merchant User',
        bankName: 'Merchant Bank',
        ifscCode: 'MERCH0001234',
        accountNumber: '0987654321'
      },
      beneficiaryAccount: '0987654321',
      beneficiaryName: 'Merchant User',
      createdAt: getIndianTimeISO(),
      updatedAt: getIndianTimeISO()
    },
    {
      transactionId: 'TXN003',
      orderId: 'ORD003',
      merchantId: 'MERCH001',
      type: 'DEPOSIT',
      amount: 200000, // 以分为单位
      fee: 2000,
      netAmount: 198000,
      currency: 'INR',
      balanceChange: 198000,
      balanceSnapshot: {
        before: 549000,
        after: 747000
      },
      status: 'PENDING',
      orderStatus: 'PENDING',
      provider: {
        name: 'razorpay',
        refId: 'RP_REF_003'
      },
      createdAt: getIndianTimeISO(),
      updatedAt: getIndianTimeISO()
    },
    {
      transactionId: 'TXN004',
      orderId: 'ORD004',
      merchantId: 'MERCH003',
      type: 'REFUND',
      amount: 25000, // 以分为单位
      fee: 0,
      netAmount: 25000,
      currency: 'INR',
      balanceChange: 25000,
      balanceSnapshot: {
        before: 747000,
        after: 772000
      },
      status: 'SUCCESS',
      orderStatus: 'SUCCESS',
      provider: {
        name: 'paytm',
        refId: 'PT_REF_004'
      },
      createdAt: getIndianTimeISO(),
      updatedAt: getIndianTimeISO()
    },
    {
      transactionId: 'TXN005',
      orderId: 'ORD005',
      merchantId: 'MERCH001',
      type: 'ADJUSTMENT',
      amount: 10000, // 以分为单位
      fee: 0,
      netAmount: 10000,
      currency: 'INR',
      balanceChange: 10000,
      balanceSnapshot: {
        before: 772000,
        after: 782000
      },
      status: 'SUCCESS',
      orderStatus: 'SUCCESS',
      createdAt: getIndianTimeISO(),
      updatedAt: getIndianTimeISO()
    },
    {
      transactionId: 'TXN006',
      orderId: 'ORD006',
      merchantId: 'MERCH002',
      type: 'DEPOSIT',
      amount: 150000, // 以分为单位
      fee: 1500,
      netAmount: 148500,
      currency: 'INR',
      balanceChange: 148500,
      balanceSnapshot: {
        before: 782000,
        after: 930500
      },
      status: 'PENDING',
      orderStatus: 'PENDING',
      provider: {
        name: 'airpay',
        refId: 'AP_REF_006'
      },
      createdAt: getIndianTimeISO(),
      updatedAt: getIndianTimeISO()
    },
    {
      transactionId: 'TXN007',
      orderId: 'ORD007',
      merchantId: 'MERCH001',
      type: 'WITHDRAWAL',
      amount: 75000, // 以分为单位
      fee: 750,
      netAmount: 74250,
      currency: 'INR',
      balanceChange: -75000,
      balanceSnapshot: {
        before: 930500,
        after: 855500
      },
      status: 'FAILED',
      orderStatus: 'FAILED',
      provider: {
        name: 'cashfree',
        refId: 'CF_REF_007'
      },
      createdAt: getIndianTimeISO(),
      updatedAt: getIndianTimeISO()
    }
  ];

  // 应用筛选条件
  let filteredTransactions = mockTransactions;

  if (type) {
    filteredTransactions = filteredTransactions.filter(t => t.type === type);
  }

  if (status) {
    filteredTransactions = filteredTransactions.filter(t => t.status === status);
  }

  if (merchantId) {
    filteredTransactions = filteredTransactions.filter(t => t.merchantId === merchantId);
  }

  if (providerName) {
    filteredTransactions = filteredTransactions.filter(t => t.provider.name === providerName);
  }

  if (transactionId) {
    filteredTransactions = filteredTransactions.filter(t => 
      t.transactionId.toLowerCase().includes(transactionId.toLowerCase())
    );
  }

  if (startDate || endDate) {
    filteredTransactions = filteredTransactions.filter(t => {
      const transactionDate = new Date(t.createdAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      
      if (start && end) {
        return transactionDate >= start && transactionDate <= end;
      } else if (start) {
        return transactionDate >= start;
      } else if (end) {
        return transactionDate <= end;
      }
      return true;
    });
  }

  console.log('Filtered transactions count:', filteredTransactions.length);

  // 分页
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      data: paginatedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredTransactions.length,
        pages: Math.ceil(filteredTransactions.length / limitNum)
      }
    }
  });
  } catch (error) {
    console.error('Error in /transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取交易记录失败',
      message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

// 获取订单历史
router.get('/orders', apiKeyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, startDate, endDate } = req.query;
    const merchantId = req.merchant.merchantId; // 从认证中间件获取商户ID
    
    // 构建查询条件
    const query = { merchantId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // 分页参数
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    
    // 查询订单
    const Order = mongoose.model('Order');
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);
    
    // 格式化响应数据
    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      merchantId: order.merchantId,
      type: order.type,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      fee: order.fee || 0,
      netAmount: order.amount - (order.fee || 0),
      customer: order.customer || {},
      provider: order.provider || {},
      returnUrl: order.callback?.successUrl,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
    
    res.json({
      success: true,
      data: {
        data: formattedOrders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: '获取订单列表失败'
    });
  }
});

module.exports = router;
