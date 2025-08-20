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
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  validateRequest
], async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const Merchant = require('../models/merchant');

    // 检查邮箱是否已存在
    const existingMerchant = await Merchant.findOne({ email });
    if (existingMerchant) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // 生成商户ID和密钥
    const merchantId = 'MERCHANT_' + Date.now().toString(36).toUpperCase();
    const apiKey = Merchant.generateApiKey();
    const secretKey = Merchant.generateSecretKey();

    // 创建商户
    const merchant = new Merchant({
      merchantId,
      name,
      email,
      phone,
      apiKey,
      secretKey
    });

    await merchant.save();

    res.json({
      success: true,
      data: {
        merchantId: merchant.merchantId,
        name: merchant.name,
        email: merchant.email,
        apiKey: merchant.apiKey,
        secretKey: merchant.secretKey
      }
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
