const express = require('express');
const { body, validationResult } = require('express-validator');
const { apiKeyAuth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// JWT认证中间件（支持管理员和商户）
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
const { getIndianTimeISO } = require('../utils/timeUtils');
const mongoose = require('mongoose');
const Merchant = require('../models/merchant');

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

// 获取商户列表（需要管理员权限）
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 检查用户角色，只有管理员可以访问
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '只有管理员用户可以访问此接口'
      });
    }
    
    const { page = 1, limit = 10, status, search } = req.query;
    
    // 构建查询条件
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { merchantId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const merchants = await Merchant.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Merchant.countDocuments(query);

    res.json({
      success: true,
      data: {
        merchants,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get merchants error:', error);
    res.status(500).json({
      success: false,
      error: '获取商户列表失败'
    });
  }
});

// 创建新商户
router.post('/', [
  body('merchantId').isString().notEmpty().withMessage('商户ID不能为空'),
  body('name').isString().notEmpty().withMessage('商户名称不能为空'),
  body('email').isEmail().withMessage('邮箱格式无效'),
  body('phone').isString().notEmpty().withMessage('手机号不能为空'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']).withMessage('状态值无效'),
  body('defaultProvider').optional().isString().withMessage('默认支付商必须是字符串'),
  body('depositFee').optional().isFloat({ min: 0 }).withMessage('充值费率必须是非负数'),
  body('withdrawalFee').optional().isFloat({ min: 0 }).withMessage('提现费率必须是非负数'),
  body('minDeposit').optional().isInt({ min: 1 }).withMessage('最小充值金额必须是正整数'),
  body('maxDeposit').optional().isInt({ min: 1 }).withMessage('最大充值金额必须是正整数'),
  body('minWithdrawal').optional().isInt({ min: 1 }).withMessage('最小提现金额必须是正整数'),
  body('maxWithdrawal').optional().isInt({ min: 1 }).withMessage('最大提现金额必须是正整数'),
  body('dailyLimit').optional().isInt({ min: 1 }).withMessage('日限额必须是正整数'),
  body('monthlyLimit').optional().isInt({ min: 1 }).withMessage('月限额必须是正整数'),
  body('singleTransactionLimit').optional().isInt({ min: 1 }).withMessage('单笔交易限额必须是正整数'),
  body('userId').optional().isString().withMessage('用户ID必须是字符串'),
  body('username').optional().isString().withMessage('用户名必须是字符串'),
  body('userFullName').optional().isString().withMessage('用户全名必须是字符串')
], validateRequest, async (req, res) => {
  try {
    const {
      merchantId,
      name,
      email,
      phone,
      status = 'ACTIVE',
      defaultProvider = 'AirPay',
      depositFee = 5.0,
      withdrawalFee = 3.0,
      minDeposit = 100,
      maxDeposit = 100000,
      minWithdrawal = 500,
      maxWithdrawal = 50000,
      dailyLimit = 100000000,
      monthlyLimit = 1000000000,
      singleTransactionLimit = 10000000,
      userId,
      username,
      userFullName
    } = req.body;

    // 检查商户ID是否已存在
    const existingMerchant = await Merchant.findOne({ merchantId });
    if (existingMerchant) {
      return res.status(400).json({
        success: false,
        error: '商户ID已存在'
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await Merchant.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: '邮箱已被使用'
      });
    }

    // 验证限额逻辑
    if (maxDeposit <= minDeposit) {
      return res.status(400).json({
        success: false,
        error: '最大充值金额必须大于最小充值金额'
      });
    }

    if (maxWithdrawal <= minWithdrawal) {
      return res.status(400).json({
        success: false,
        error: '最大提现金额必须大于最小提现金额'
      });
    }

    if (monthlyLimit < dailyLimit) {
      return res.status(400).json({
        success: false,
        error: '月限额必须大于或等于日限额'
      });
    }

    if (dailyLimit < singleTransactionLimit) {
      return res.status(400).json({
        success: false,
        error: '日限额必须大于或等于单笔交易限额'
      });
    }

    // 生成API密钥
    const apiKey = Merchant.generateApiKey();
    const secretKey = Merchant.generateSecretKey();

    // 创建新商户
    const newMerchant = new Merchant({
      merchantId,
      name,
      email,
      apiKey,
      secretKey,
      status,
      balance: {
        available: 0,
        frozen: 0
      },
      defaultProvider,
      userId,
      username,
      userFullName,
      deposit: {
        fee: {
          percentage: depositFee,
          fixedAmount: 0
        },
        limits: {
          minAmount: minDeposit,
          maxAmount: maxDeposit,
          dailyLimit,
          monthlyLimit,
          singleTransactionLimit
        },
        usage: {
          dailyUsed: 0,
          monthlyUsed: 0,
          lastResetDate: new Date()
        }
      },
      withdrawal: {
        fee: {
          percentage: withdrawalFee,
          fixedAmount: 6
        },
        limits: {
          minAmount: minWithdrawal,
          maxAmount: maxWithdrawal,
          dailyLimit,
          monthlyLimit,
          singleTransactionLimit
        },
        usage: {
          dailyUsed: 0,
          monthlyUsed: 0,
          lastResetDate: new Date()
        }
      },
      paymentConfigs: [],
      security: {
        keyStatus: 'ACTIVE',
        lastKeyUpdate: new Date(),
        keyHistory: [],
        ipWhitelist: {
          enabled: false,
          strictMode: false,
          allowedIPs: [],
          accessRules: {
            blockUnknownIPs: true,
            maxFailedAttempts: 5,
            lockoutDuration: 300
          }
        },
        usage: {
          dailyCount: 0,
          monthlyCount: 0,
          lastUsed: new Date(),
          lastResetDate: new Date()
        }
      }
    });

    await newMerchant.save();

    res.status(201).json({
      success: true,
      data: {
        message: '商户创建成功',
        merchant: {
          merchantId: newMerchant.merchantId,
          name: newMerchant.name,
          email: newMerchant.email,
          status: newMerchant.status,
          apiKey: newMerchant.apiKey,
          secretKey: newMerchant.secretKey
        }
      }
    });

  } catch (error) {
    console.error('Create merchant error:', error);
    res.status(500).json({
      success: false,
      error: '创建商户失败'
    });
  }
});

// 获取单个商户信息
router.get('/:merchantId', apiKeyAuth, async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    const merchant = await Merchant.findOne({ merchantId });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }

    res.json({
      success: true,
      data: { merchant }
    });

  } catch (error) {
    console.error('Get merchant error:', error);
    res.status(500).json({
      success: false,
      error: '获取商户信息失败'
    });
  }
});

// 更新商户信息
router.put('/:merchantId', [
  body('name').optional().isString().notEmpty().withMessage('商户名称不能为空'),
  body('email').optional().isEmail().withMessage('邮箱格式无效'),
  body('phone').optional().isString().notEmpty().withMessage('手机号不能为空'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']).withMessage('状态值无效'),
  body('defaultProvider').optional().isString().withMessage('默认支付商必须是字符串'),
  body('depositFee').optional().isFloat({ min: 0 }).withMessage('充值费率必须是非负数'),
  body('withdrawalFee').optional().isFloat({ min: 0 }).withMessage('提现费率必须是非负数'),
  body('minDeposit').optional().isInt({ min: 1 }).withMessage('最小充值金额必须是正整数'),
  body('maxDeposit').optional().isInt({ min: 1 }).withMessage('最大充值金额必须是正整数'),
  body('minWithdrawal').optional().isInt({ min: 1 }).withMessage('最小提现金额必须是正整数'),
  body('maxWithdrawal').optional().isInt({ min: 1 }).withMessage('最大提现金额必须是正整数'),
  body('dailyLimit').optional().isInt({ min: 1 }).withMessage('日限额必须是正整数'),
  body('monthlyLimit').optional().isInt({ min: 1 }).withMessage('月限额必须是正整数'),
  body('singleTransactionLimit').optional().isInt({ min: 1 }).withMessage('单笔交易限额必须是正整数')
], validateRequest, async (req, res) => {
  try {
    const { merchantId } = req.params;
    const updateData = req.body;

    // 查找商户
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }

    // 如果更新邮箱，检查是否与其他商户重复
    if (updateData.email && updateData.email !== merchant.email) {
      const existingEmail = await Merchant.findOne({ email: updateData.email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: '邮箱已被其他商户使用'
        });
      }
    }

    // 验证限额逻辑
    if (updateData.maxDeposit && updateData.minDeposit && updateData.maxDeposit <= updateData.minDeposit) {
      return res.status(400).json({
        success: false,
        error: '最大充值金额必须大于最小充值金额'
      });
    }

    if (updateData.maxWithdrawal && updateData.minWithdrawal && updateData.maxWithdrawal <= updateData.minWithdrawal) {
      return res.status(400).json({
        success: false,
        error: '最大提现金额必须大于最小提现金额'
      });
    }

    if (updateData.monthlyLimit && updateData.dailyLimit && updateData.monthlyLimit < updateData.dailyLimit) {
      return res.status(400).json({
        success: false,
        error: '月限额必须大于或等于日限额'
      });
    }

    if (updateData.dailyLimit && updateData.singleTransactionLimit && updateData.dailyLimit < updateData.singleTransactionLimit) {
      return res.status(400).json({
        success: false,
        error: '日限额必须大于或等于单笔交易限额'
      });
    }

    // 更新商户信息
    const updatedMerchant = await Merchant.findOneAndUpdate(
      { merchantId },
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        message: '商户信息更新成功',
        merchant: updatedMerchant
      }
    });

  } catch (error) {
    console.error('Update merchant error:', error);
    res.status(500).json({
      success: false,
      error: '更新商户信息失败'
    });
  }
});

// 删除商户
router.delete('/:merchantId', apiKeyAuth, async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }

    // 检查商户是否有余额
    if (merchant.balance.available > 0 || merchant.balance.frozen > 0) {
      return res.status(400).json({
        success: false,
        error: '商户还有余额，无法删除'
      });
    }

    await Merchant.deleteOne({ merchantId });

    res.json({
      success: true,
      data: {
        message: '商户删除成功'
      }
    });

  } catch (error) {
    console.error('Delete merchant error:', error);
    res.status(500).json({
      success: false,
      error: '删除商户失败'
    });
  }
});

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

// 获取测试商户信息（仅用于开发测试，生产环境应移除）
router.get('/test-info', (req, res) => {
  // 生产环境检查
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: '测试端点在生产环境中已禁用'
    });
  }
  
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

// 公开演示端点 - 用于前端展示（生产环境安全）
// 注意：这些端点不需要任何认证，应该可以公开访问
// 重要：这些端点必须放在其他需要认证的路由之前
router.get('/demo-info', (req, res) => {
  console.log('Demo info endpoint accessed - no auth required');
  // 确保设置正确的响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.json({
    success: true,
    data: {
      merchantId: 'DEMO001',
      name: '演示商户',
      email: 'demo@example.com',
      status: 'ACTIVE',
      balance: 0,
      paymentConfig: {
        providers: ['mock', 'passpay', 'unispay'],
        defaultProvider: 'mock'
      }
    }
  });
});

// 公开演示交易历史端点 - 用于前端展示（生产环境安全）
// 注意：这些端点不需要任何认证，应该可以公开访问
router.get('/demo-transactions', (req, res) => {
  console.log('Demo transactions endpoint accessed - no auth required');
  // 确保设置正确的响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    // 返回空的演示数据
    res.json({
      success: true,
      data: {
        transactions: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    console.error('Demo transactions error:', error);
    res.status(500).json({
      success: false,
      error: '获取演示交易历史失败'
    });
  }
});

// 公开演示订单历史端点 - 用于前端展示（生产环境安全）
// 注意：这些端点不需要任何认证，应该可以公开访问
router.get('/demo-orders', (req, res) => {
  console.log('Demo orders endpoint accessed - no auth required');
  // 确保设置正确的响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    // 返回空的演示数据
    res.json({
      success: true,
      data: {
        orders: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    console.error('Demo orders error:', error);
    res.status(500).json({
      success: false,
      error: '获取演示订单历史失败'
    });
  }
});

// 获取交易历史
router.get('/transactions', async (req, res) => {
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

    // 构建查询条件
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (merchantId) query.merchantId = merchantId;
    if (providerName) query.providerName = providerName;
    if (transactionId) query.transactionId = { $regex: transactionId, $options: 'i' };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // 计算分页参数
    const startIndex = (pageNum - 1) * limitNum;
    
    // 从数据库查询真实交易数据
    const Transaction = require('../models/transaction');
    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitNum)
      .lean();

    // 如果没有真实数据，返回空结果
    if (transactions.length === 0) {
      return res.json({
        success: true,
        data: {
          transactions: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        transactions: transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: '获取交易历史失败'
    });
  }
});

module.exports = router;
