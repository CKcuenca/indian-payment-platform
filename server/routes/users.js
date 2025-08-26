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

// 创建新用户
router.post('/', [
  body('username').isString().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名必须是3-30个字符，只能包含字母、数字和下划线'),
  body('email').isEmail().withMessage('邮箱格式无效'),
  body('password').isString().isLength({ min: 8 }).withMessage('密码至少8个字符'),
  body('fullName').isString().isLength({ min: 1, max: 100 }).withMessage('姓名不能为空且不能超过100个字符'),
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('手机号格式无效'),
  body('role').isIn(['admin', 'operator', 'merchant', 'user']).withMessage('角色值无效'),
  body('merchantId').optional().isMongoId().withMessage('商户ID格式无效'),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('状态值无效')
], validateRequest, async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      phone,
      role = 'user',
      merchantId,
      status = 'pending'
    } = req.body;

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
        error: '邮箱已被使用'
      });
    }

    // 验证商户角色必须关联商户ID
    if (role === 'merchant' && !merchantId) {
      return res.status(400).json({
        success: false,
        error: '商户角色必须关联商户ID'
      });
    }

    // 获取默认权限
    const defaultPermissions = User.getDefaultPermissions(role);

    // 创建新用户
    const newUser = new User({
      username,
      email,
      password,
      fullName,
      phone,
      role,
      merchantId: role === 'merchant' ? merchantId : undefined,
      status,
      permissions: defaultPermissions
    });

    await newUser.save();

    // 返回用户信息（不包含密码）
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: {
        message: '用户创建成功',
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: '创建用户失败'
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

// 更新用户信息
router.put('/:userId', [
  body('email').optional().isEmail().withMessage('邮箱格式无效'),
  body('fullName').optional().isString().isLength({ min: 1, max: 100 }).withMessage('姓名不能为空且不能超过100个字符'),
  body('phone').optional().matches(/^\+?[1-9]\d{1,14}$/).withMessage('手机号格式无效'),
  body('role').optional().isIn(['admin', 'operator', 'merchant', 'user']).withMessage('角色值无效'),
  body('merchantId').optional().isMongoId().withMessage('商户ID格式无效'),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('状态值无效'),
  body('permissions').optional().isArray().withMessage('权限必须是数组')
], validateRequest, async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 如果更新邮箱，检查是否与其他用户重复
    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await User.findOne({ email: updateData.email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: '邮箱已被其他用户使用'
        });
      }
    }

    // 如果更新角色，验证商户角色必须关联商户ID
    if (updateData.role === 'merchant' && !updateData.merchantId && !user.merchantId) {
      return res.status(400).json({
        success: false,
        error: '商户角色必须关联商户ID'
      });
    }

    // 如果更新权限，验证权限格式
    if (updateData.permissions) {
      const validPermissions = [
        'VIEW_ALL_MERCHANTS',
        'MANAGE_MERCHANTS',
        'VIEW_PAYMENT_CONFIG',
        'MANAGE_PAYMENT_CONFIG',
        'VIEW_ALL_ORDERS',
        'VIEW_OWN_ORDERS',
        'VIEW_ALL_TRANSACTIONS',
        'VIEW_OWN_TRANSACTIONS',
        'MANAGE_USERS',
        'SYSTEM_MONITORING',
        'VIEW_OWN_MERCHANT_DATA'
      ];
      
      const invalidPermissions = updateData.permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          error: `无效的权限: ${invalidPermissions.join(', ')}`
        });
      }
    }

    // 更新用户信息
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password').populate('merchantId', 'name email');

    res.json({
      success: true,
      data: {
        message: '用户信息更新成功',
        user: updatedUser
      }
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
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 不允许删除自己
    if (userId === req.user?.id) {
      return res.status(400).json({
        success: false,
        error: '不能删除自己的账户'
      });
    }

    // 不允许删除最后一个管理员
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: '不能删除最后一个管理员'
        });
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      data: {
        message: '用户删除成功'
      }
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
  body('newPassword').isString().isLength({ min: 8 }).withMessage('新密码至少8个字符')
], validateRequest, async (req, res) => {
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
      data: {
        message: '密码重置成功'
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: '密码重置失败'
    });
  }
});

// 更新用户状态
router.patch('/:userId/status', [
  body('status').isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('状态值无效')
], validateRequest, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 不允许停用自己
    if (userId === req.user?.id && status !== 'active') {
      return res.status(400).json({
        success: false,
        error: '不能停用自己的账户'
      });
    }

    // 不允许停用最后一个管理员
    if (user.role === 'admin' && status !== 'active') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: '不能停用最后一个管理员'
        });
      }
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      data: {
        message: '用户状态更新成功',
        user: {
          id: user._id,
          username: user.username,
          status: user.status
        }
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: '更新用户状态失败'
    });
  }
});

module.exports = router;
