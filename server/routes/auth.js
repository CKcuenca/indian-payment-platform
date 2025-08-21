const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const router = express.Router();

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

// 用户注册路由
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名必须是3-30个字符，只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('密码至少8个字符'),
  body('fullName')
    .isLength({ min: 2, max: 100 })
    .withMessage('姓名必须是2-100个字符'),
  body('role')
    .optional()
    .isIn(['admin', 'operator', 'merchant', 'user'])
    .withMessage('无效的用户角色'),
  validateRequest
], async (req, res) => {
  try {
    const { username, email, password, fullName, role = 'user', phone, merchantId } = req.body;

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: '用户名已存在'
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: '邮箱已存在'
      });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      fullName,
      role,
      phone,
      merchantId: role === 'merchant' ? merchantId : undefined,
      permissions: User.getDefaultPermissions(role),
      status: 'pending'
    });

    await user.save();

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        merchantId: user.merchantId 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 返回用户信息（不包含密码）
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token,
        permissions: user.permissions
      },
      message: '用户注册成功'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: '注册失败',
      message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

// 用户登录路由
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
  validateRequest
], async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户（支持用户名或邮箱登录）
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 检查账户状态
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: `账户状态: ${user.status}，请联系管理员`
      });
    }

    // 检查账户是否被锁定
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        error: '账户已被锁定，请稍后再试'
      });
    }

    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      // 增加登录失败次数
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 登录成功，重置登录失败次数
    await user.resetLoginAttempts();
    
    // 更新最后登录时间
    await User.updateOne(
      { _id: user._id },
      { lastLoginAt: new Date() }
    );

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        merchantId: user.merchantId 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 返回用户信息（不包含密码）
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      data: {
        user: userResponse,
        token,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '登录失败',
      message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
    });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    // 从JWT token中获取用户ID
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未提供认证token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        permissions: user.permissions
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: '无效的token'
      });
    }
    
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

// 刷新token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '未提供认证token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 生成新的token
    const newToken = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        merchantId: user.merchantId 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: '无效的token'
      });
    }
    
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: '刷新token失败'
    });
  }
});

// 登出路由（客户端删除token即可）
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

module.exports = router; 