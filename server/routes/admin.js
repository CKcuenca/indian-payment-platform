const express = require('express');
const { body, validationResult } = require('express-validator');

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

// 创建商户
router.post('/merchants', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // 如果email有值且不是空字符串，则验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Email must be valid if provided');
      }
    }
    return true;
  }).withMessage('Email must be valid if provided'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']).withMessage('Invalid status'),
  body('defaultProvider').optional().isString().withMessage('Default provider must be a string'),
  body('paymentConfigs').optional().isArray().withMessage('Payment configs must be an array'),
  body('deposit').optional().isObject().withMessage('Deposit must be an object'),
  body('withdrawal').optional().isObject().withMessage('Withdrawal must be an object'),
  validateRequest
], async (req, res) => {
  try {
    const { name, email, status, defaultProvider, paymentConfigs, deposit, withdrawal } = req.body;
    const Merchant = require('../models/merchant');

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingMerchant = await Merchant.findOne({ email });
      if (existingMerchant) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // 生成商户ID和密钥
    const merchantId = 'MERCHANT_' + Date.now().toString(36).toUpperCase();
    const apiKey = Merchant.generateApiKey();
    const secretKey = Merchant.generateSecretKey();

    // 创建商户 - 保存完整的前端数据结构
    const merchantData = {
      merchantId,
      name,
      apiKey,
      secretKey,
      status: status || 'ACTIVE',
      defaultProvider: defaultProvider || 'AirPay',
      paymentConfigs: paymentConfigs || [],
      deposit: deposit || {},
      withdrawal: withdrawal || {},
      balance: 0
    };
    
    // 只有当字段有值时才添加
    if (email) merchantData.email = email;
    
    const merchant = new Merchant(merchantData);

    await merchant.save();

    const responseData = {
      merchantId: merchant.merchantId,
      name: merchant.name,
      apiKey: merchant.apiKey,
      secretKey: merchant.secretKey,
      status: merchant.status,
      defaultProvider: merchant.defaultProvider,
      paymentConfigs: merchant.paymentConfigs,
      deposit: merchant.deposit,
      withdrawal: merchant.withdrawal
    };
    
    // 只有当字段有值时才添加到响应中
    if (merchant.email) responseData.email = merchant.email;
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Create merchant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取所有商户
router.get('/merchants', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const Merchant = require('../models/merchant');
    const merchants = await Merchant.find()
      .select('-secretKey')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Merchant.countDocuments();

    res.json({
      success: true,
      data: {
        merchants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get merchants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取平台统计
router.get('/stats', async (req, res) => {
  try {
    const Order = require('../models/order');
    const Transaction = require('../models/transaction');
    const Merchant = require('../models/merchant');

    // 今日统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // 总统计
    const totalStats = await Order.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // 商户数量
    const merchantCount = await Merchant.countDocuments();

    res.json({
      success: true,
      data: {
        today: todayStats,
        total: totalStats,
        merchantCount
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
