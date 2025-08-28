const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Merchant = require('../models/merchant');
const User = mongoose.connection.model('User');

const router = express.Router();

// JWT认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '访问令牌缺失'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: '访问令牌无效'
      });
    }
    req.user = user;
    next();
  });
};

// 验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// 获取商户自己的信息
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // 检查用户角色
    if (req.user.role !== 'merchant') {
      return res.status(403).json({
        success: false,
        error: '只有商户用户可以访问此接口'
      });
    }

    // 获取商户信息
    const merchant = await Merchant.findById(req.user.merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }

    console.log('🔍 原始商户数据:', JSON.stringify(merchant, null, 2));

    // 转换数据结构以匹配前端期望
    const merchantData = {
      merchantId: merchant.merchantId,
      name: merchant.name,
      email: merchant.email,
      status: merchant.status,
      defaultProvider: merchant.paymentConfig?.defaultProvider || 'airpay',
      depositFee: (merchant.paymentConfig?.fees?.deposit || 0.01) * 100, // 转换为百分比
      withdrawalFee: (merchant.paymentConfig?.fees?.withdrawal || 0.01) * 100, // 转换为百分比
      minDeposit: merchant.paymentConfig?.limits?.minDeposit || 100,
      maxDeposit: merchant.paymentConfig?.limits?.maxDeposit || 5000000,
      minWithdrawal: merchant.paymentConfig?.limits?.minWithdrawal || 100,
      maxWithdrawal: merchant.paymentConfig?.limits?.maxWithdrawal || 5000000,
      limits: {
        dailyLimit: merchant.paymentConfig?.limits?.dailyLimit || 50000000,
        monthlyLimit: merchant.paymentConfig?.limits?.monthlyLimit || 500000000,
        singleTransactionLimit: merchant.paymentConfig?.limits?.maxDeposit || 5000000,
      },
      balance: 0, // 默认余额
      usage: {
        dailyUsed: 0,
        monthlyUsed: 0
      },
      createdAt: merchant.createdAt || new Date(),
      updatedAt: merchant.updatedAt || new Date()
    };

    console.log('🔍 转换后的商户数据:', JSON.stringify(merchantData, null, 2));

    res.json({
      success: true,
      data: merchantData
    });

  } catch (error) {
    console.error('Get merchant profile error:', error);
    res.status(500).json({
      success: false,
      error: '获取商户信息失败'
    });
  }
});

// 修改密码
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('当前密码不能为空'),
  body('newPassword').isLength({ min: 8 }).withMessage('新密码至少8个字符')
], validateRequest, authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 获取用户信息
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: '当前密码错误'
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    await User.updateOne(
      { _id: user._id },
      { password: hashedPassword }
    );

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: '修改密码失败'
    });
  }
});

// 生成API密钥
router.post('/generate-api-key', [
  body('name').notEmpty().withMessage('密钥名称不能为空'),
  body('description').optional().isString().withMessage('描述必须是字符串')
], validateRequest, authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // 这里应该实现实际的API密钥生成逻辑
    // 目前只是返回成功消息
    const apiKey = `api_key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      message: 'API密钥生成成功',
      data: {
        apiKey,
        name,
        description,
        createdAt: new Date()
      }
    });

  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      success: false,
      error: '生成API密钥失败'
    });
  }
});

module.exports = router;
