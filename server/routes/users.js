const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const { apiKeyAuth } = require('../middleware/auth');
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

// 获取用户列表（需要管理员权限）
router.get('/', apiKeyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    // 构建查询条件
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const users = await User.find(query)
      .select('-password')
      .populate('merchantId', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    });
  }
});

// 获取单个用户信息
router.get('/:userId', apiKeyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('merchantId', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

// 创建新用户（需要管理员权限）
router.post('/', [
  apiKeyAuth,
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
    .isIn(['admin', 'operator', 'merchant', 'user'])
    .withMessage('无效的用户角色'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('无效的用户状态'),
  validateRequest
], async (req, res) => {
  try {
    const { username, email, password, fullName, role, phone, merchantId, status = 'pending' } = req.body;

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
      status,
      createdBy: req.user.id
    });

    await user.save();

    // 返回用户信息（不包含密码）
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: { user: userResponse },
      message: '用户创建成功'
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: '创建用户失败'
    });
  }
});

// 更新用户信息
router.put('/:userId', [
  apiKeyAuth,
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('姓名必须是2-100个字符'),
  body('role')
    .optional()
    .isIn(['admin', 'operator', 'merchant', 'user'])
    .withMessage('无效的用户角色'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('无效的用户状态'),
  validateRequest
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, role, phone, merchantId, status, permissions } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 更新用户信息
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) {
      updateData.role = role;
      updateData.permissions = User.getDefaultPermissions(role);
    }
    if (phone !== undefined) updateData.phone = phone;
    if (merchantId !== undefined) updateData.merchantId = role === 'merchant' ? merchantId : undefined;
    if (status !== undefined) updateData.status = status;
    if (permissions !== undefined) updateData.permissions = permissions;
    
    updateData.updatedBy = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: { user: updatedUser },
      message: '用户信息更新成功'
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: '更新用户信息失败'
    });
  }
});

// 删除用户
router.delete('/:userId', apiKeyAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // 检查用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 不能删除自己
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: '不能删除自己的账户'
      });
    }

    // 软删除：将状态改为inactive
    await User.findByIdAndUpdate(userId, {
      status: 'inactive',
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      message: '用户已停用'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: '删除用户失败'
    });
  }
});

// 重置用户密码
router.post('/:userId/reset-password', [
  apiKeyAuth,
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('新密码至少8个字符'),
  validateRequest
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码重置成功'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: '密码重置失败'
    });
  }
});

// 解锁用户账户
router.post('/:userId/unlock', apiKeyAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 解锁账户
    await user.resetLoginAttempts();

    res.json({
      success: true,
      message: '账户已解锁'
    });

  } catch (error) {
    console.error('Unlock user error:', error);
    res.status(500).json({
      success: false,
      error: '解锁账户失败'
    });
  }
});

module.exports = router;
