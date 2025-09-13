const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 添加认证中间件 - 所有admin路由都需要认证和admin权限
router.use(authenticateToken);
router.use(requireAdmin);

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
  body('userId').optional().isString().withMessage('User ID must be a string'),
  body('username').optional().isString().withMessage('Username must be a string'),
  body('userFullName').optional().isString().withMessage('User full name must be a string'),
  validateRequest
], async (req, res) => {
  try {
    const { name, email, status, defaultProvider, paymentConfigs, deposit, withdrawal, userId, username, userFullName } = req.body;
    const Merchant = require('../models/merchant');

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingMerchant = await Merchant.findOne({ email });
      if (existingMerchant) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // 生成商户ID
    const merchantId = Merchant.generateMerchantId ? Merchant.generateMerchantId() : 'MERCHANT_' + Date.now().toString(36).toUpperCase();

    // 生成API密钥
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
      deposit: deposit || {
        fee: { percentage: 5.0, fixedAmount: 0 },
        limits: { minAmount: 100, maxAmount: 100000, dailyLimit: 100000000, monthlyLimit: 1000000000, singleTransactionLimit: 10000000 },
        usage: { dailyUsed: 0, monthlyUsed: 0, lastResetDate: new Date() }
      },
      withdrawal: withdrawal || {
        fee: { percentage: 3.0, fixedAmount: 6 },
        limits: { minAmount: 500, maxAmount: 50000, dailyLimit: 100000000, monthlyLimit: 1000000000, singleTransactionLimit: 10000000 },
        usage: { dailyUsed: 0, monthlyUsed: 0, lastResetDate: new Date() }
      },
      balance: { available: 0, frozen: 0 },
      security: {
        keyStatus: 'ACTIVE',
        lastKeyUpdate: new Date(),
        keyHistory: [],
        ipWhitelist: {
          enabled: false,
          strictMode: false,
          allowedIPs: [],
          accessRules: { blockUnknownIPs: true, maxFailedAttempts: 5, lockoutDuration: 300 }
        },
        usage: { dailyCount: 0, monthlyCount: 0, lastUsed: new Date(), lastResetDate: new Date() }
      }
    };
    
    // 只有当字段有值时才添加
    if (email) merchantData.email = email;
    if (userId) merchantData.userId = userId;
    if (username) merchantData.username = username;
    if (userFullName) merchantData.userFullName = userFullName;
    
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
      withdrawal: merchant.withdrawal,
      balance: merchant.balance
    };
    
    // 只有当字段有值时才添加到响应中
    if (merchant.email) responseData.email = merchant.email;
    if (merchant.userId) responseData.userId = merchant.userId;
    if (merchant.username) responseData.userName = merchant.username;
    if (merchant.userFullName) responseData.userFullName = merchant.userFullName;
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Create merchant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新商户
router.put('/merchants/:merchantId', [
  body('name').optional().isString().withMessage('Name must be a string'),
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
  body('userId').optional().isString().withMessage('User ID must be a string'),
  body('username').optional().isString().withMessage('Username must be a string'),
  body('userFullName').optional().isString().withMessage('User full name must be a string'),
  validateRequest
], async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { name, email, status, defaultProvider, paymentConfigs, deposit, withdrawal, userId, username, userFullName } = req.body;
    const Merchant = require('../models/merchant');

    // 查找商户
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({ error: '商户不存在' });
    }

    // 检查邮箱是否已存在（如果提供了邮箱且与当前不同）
    if (email && email !== merchant.email) {
      const existingMerchant = await Merchant.findOne({ email });
      if (existingMerchant) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // 更新商户数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined) updateData.status = status;
    if (defaultProvider !== undefined) updateData.defaultProvider = defaultProvider;
    if (paymentConfigs !== undefined) updateData.paymentConfigs = paymentConfigs;
    if (deposit !== undefined) updateData.deposit = deposit;
    if (withdrawal !== undefined) updateData.withdrawal = withdrawal;
    if (userId !== undefined) updateData.userId = userId;
    if (username !== undefined) updateData.username = username;
    if (userFullName !== undefined) updateData.userFullName = userFullName;
    
    updateData.updatedAt = new Date();

    // 更新商户
    await Merchant.updateOne({ merchantId }, updateData);

    res.json({
      success: true,
      message: '商户更新成功'
    });
  } catch (error) {
    console.error('Update merchant error:', error);
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

// 删除商户
router.delete('/merchants/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const Merchant = require('../models/merchant');

    // 检查商户是否存在
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({ error: '商户不存在' });
    }

    // 删除商户
    await Merchant.deleteOne({ merchantId });

    res.json({
      success: true,
      message: '商户删除成功'
    });
  } catch (error) {
    console.error('Delete merchant error:', error);
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
