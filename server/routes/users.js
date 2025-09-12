const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

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

// 获取所有用户
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const User = require('../models/user');
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: 1,
          limit: users.length,
          total: users.length,
          pages: 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建新用户
router.post('/', authenticateToken, requireAdmin, [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'operator', 'merchant']).withMessage('Invalid role'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']).withMessage('Invalid status'),
  body('merchantId').optional().isString().withMessage('Merchant ID must be a string'),
  body('fullName').optional().isString().withMessage('Full name must be a string'),
  // 邮箱字段已移除
  validateRequest
], async (req, res) => {
  try {
    const { username, password, role, status, merchantId, fullName } = req.body;
    const User = require('../models/user');

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 创建用户 - 让模型中间件处理密码加密
    const userData = {
      username,
      password: password, // 不加密，让模型中间件处理
      role,
      status: status || 'active',
      fullName: fullName || username,
      // 邮箱字段已移除
      permissions: getDefaultPermissions(role),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 如果是商户角色，添加商户ID
    if (role === 'merchant' && merchantId) {
      userData.merchantId = merchantId;
    }

    const user = new User(userData);
    await user.save();

    // 返回用户信息（不包含密码）
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 更新用户
router.put('/:id', authenticateToken, requireAdmin, [
  body('username').optional().isString().withMessage('Username must be a string'),
  body('role').optional().isIn(['admin', 'operator', 'merchant']).withMessage('Invalid role'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']).withMessage('Invalid status'),
  body('merchantId').optional().isString().withMessage('Merchant ID must be a string'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, status, merchantId, fullName } = req.body;
    const User = require('../models/user');

    // 查找用户
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查用户名是否已存在（如果修改了用户名）
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }
    }

    // 更新用户数据
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (fullName !== undefined) updateData.fullName = fullName;
    // 邮箱字段已移除
    if (role === 'merchant' && merchantId !== undefined) updateData.merchantId = merchantId;
    if (role !== 'merchant') updateData.merchantId = undefined; // 非商户角色移除商户ID
    
    updateData.updatedAt = new Date();

    // 更新用户
    await User.findByIdAndUpdate(id, updateData);

    res.json({
      success: true,
      message: '用户更新成功'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 删除用户
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const User = require('../models/user');

    // 查找用户
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 删除用户
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取默认权限
function getDefaultPermissions(role) {
  switch (role) {
    case 'admin':
      return [
        'VIEW_ALL_MERCHANTS',
        'MANAGE_MERCHANTS',
        'VIEW_PAYMENT_CONFIG',
        'MANAGE_PAYMENT_CONFIG',
        'VIEW_ALL_ORDERS',
        'VIEW_ALL_TRANSACTIONS',
        'MANAGE_USERS',
        'SYSTEM_MONITORING'
      ];
    case 'operator':
      return [
        'VIEW_ALL_MERCHANTS',
        'VIEW_ALL_ORDERS',
        'VIEW_ALL_TRANSACTIONS'
      ];
    case 'merchant':
      return [
        'VIEW_OWN_ORDERS',
        'VIEW_OWN_TRANSACTIONS',
        'VIEW_OWN_MERCHANT_DATA'
      ];
    default:
      return [];
  }
}

module.exports = router;
