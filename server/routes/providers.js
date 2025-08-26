const express = require('express');
const { body, validationResult } = require('express-validator');
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

// 获取支付商列表
router.get('/', apiKeyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    // 构建查询条件
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    // 模拟支付商数据，实际应该从数据库获取
    const mockProviders = [
      {
        id: '1',
        name: 'airpay',
        displayName: 'AirPay',
        type: 'native',
        status: 'ACTIVE',
        environment: 'production',
        description: '印度本地支付解决方案',
        features: ['UPI', 'IMPS', 'NEFT', 'RTGS'],
        supportedCurrencies: ['INR'],
        dailyLimit: 100000000,
        monthlyLimit: 1000000000,
        singleTransactionLimit: 10000000,
        fees: {
          deposit: 0.5,
          withdrawal: 1.0,
          fixed: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z'
      },
      {
        id: '2',
        name: 'cashfree',
        displayName: 'Cashfree',
        type: 'native',
        status: 'ACTIVE',
        environment: 'production',
        description: '印度领先的支付网关',
        features: ['UPI', 'IMPS', 'NEFT', 'RTGS', 'Cards'],
        supportedCurrencies: ['INR'],
        dailyLimit: 200000000,
        monthlyLimit: 2000000000,
        singleTransactionLimit: 20000000,
        fees: {
          deposit: 0.3,
          withdrawal: 0.8,
          fixed: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z'
      },
      {
        id: '3',
        name: 'razorpay',
        displayName: 'Razorpay',
        type: 'native',
        status: 'ACTIVE',
        environment: 'production',
        description: '全渠道支付解决方案',
        features: ['UPI', 'IMPS', 'NEFT', 'RTGS', 'Cards', 'NetBanking'],
        supportedCurrencies: ['INR'],
        dailyLimit: 150000000,
        monthlyLimit: 1500000000,
        singleTransactionLimit: 15000000,
        fees: {
          deposit: 0.4,
          withdrawal: 0.9,
          fixed: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z'
      },
      {
        id: '4',
        name: 'paytm',
        displayName: 'Paytm',
        type: 'native',
        status: 'ACTIVE',
        environment: 'production',
        description: '印度最大的数字支付平台',
        features: ['UPI', 'IMPS', 'NEFT', 'RTGS', 'Cards', 'Wallet'],
        supportedCurrencies: ['INR'],
        dailyLimit: 300000000,
        monthlyLimit: 3000000000,
        singleTransactionLimit: 30000000,
        fees: {
          deposit: 0.2,
          withdrawal: 0.7,
          fixed: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z'
      },
      {
        id: '5',
        name: 'unispay',
        displayName: 'UNISPAY',
        type: 'wakeup',
        status: 'ACTIVE',
        environment: 'production',
        description: '印度唤醒支付解决方案',
        features: ['UPI', 'IMPS', 'NEFT', 'RTGS'],
        supportedCurrencies: ['INR'],
        dailyLimit: 50000000,
        monthlyLimit: 500000000,
        singleTransactionLimit: 5000000,
        fees: {
          deposit: 0.6,
          withdrawal: 1.2,
          fixed: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z'
      },
      {
        id: '6',
        name: 'passpay',
        displayName: 'PassPay',
        type: 'wakeup',
        status: 'ACTIVE',
        environment: 'production',
        description: '印度唤醒支付服务',
        features: ['UPI', 'IMPS', 'NEFT', 'RTGS'],
        supportedCurrencies: ['INR'],
        dailyLimit: 40000000,
        monthlyLimit: 400000000,
        singleTransactionLimit: 4000000,
        fees: {
          deposit: 0.7,
          withdrawal: 1.5,
          fixed: 0
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z'
      }
    ];

    // 应用筛选条件
    let filteredProviders = mockProviders;
    if (status) {
      filteredProviders = filteredProviders.filter(p => p.status === status);
    }
    if (type) {
      filteredProviders = filteredProviders.filter(p => p.type === type);
    }

    // 分页处理
    const total = filteredProviders.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedProviders = filteredProviders.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        providers: paginatedProviders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商列表失败'
    });
  }
});

// 获取单个支付商信息
router.get('/:providerId', apiKeyAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    
    // 模拟支付商数据，实际应该从数据库获取
    const mockProviders = [
      {
        id: '1',
        name: 'airpay',
        displayName: 'AirPay',
        type: 'native',
        status: 'ACTIVE',
        environment: 'production',
        description: '印度本地支付解决方案',
        features: ['UPI', 'IMPS', 'NEFT', 'RTGS'],
        supportedCurrencies: ['INR'],
        dailyLimit: 100000000,
        monthlyLimit: 1000000000,
        singleTransactionLimit: 10000000,
        fees: {
          deposit: 0.5,
          withdrawal: 1.0,
          fixed: 0
        },
        config: {
          apiEndpoint: 'https://api.airpay.com',
          webhookUrl: 'https://webhook.airpay.com',
          supportedMethods: ['UPI', 'IMPS', 'NEFT', 'RTGS']
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-26T00:00:00Z'
      }
    ];

    const provider = mockProviders.find(p => p.id === providerId || p.name === providerId);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: '支付商不存在'
      });
    }

    res.json({
      success: true,
      data: { provider }
    });

  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商信息失败'
    });
  }
});

// 创建新支付商
router.post('/', [
  body('name').isString().notEmpty().withMessage('支付商名称不能为空'),
  body('displayName').isString().notEmpty().withMessage('显示名称不能为空'),
  body('type').isIn(['native', 'wakeup', 'third-party']).withMessage('类型值无效'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).withMessage('状态值无效'),
  body('environment').optional().isIn(['sandbox', 'production']).withMessage('环境值无效'),
  body('description').optional().isString().withMessage('描述必须是字符串'),
  body('features').optional().isArray().withMessage('功能特性必须是数组'),
  body('supportedCurrencies').optional().isArray().withMessage('支持的货币必须是数组'),
  body('dailyLimit').optional().isInt({ min: 1 }).withMessage('日限额必须是正整数'),
  body('monthlyLimit').optional().isInt({ min: 1 }).withMessage('月限额必须是正整数'),
  body('singleTransactionLimit').optional().isInt({ min: 1 }).withMessage('单笔交易限额必须是正整数'),
  body('depositFee').optional().isFloat({ min: 0 }).withMessage('充值费率必须是非负数'),
  body('withdrawalFee').optional().isFloat({ min: 0 }).withMessage('提现费率必须是非负数'),
  body('fixedFee').optional().isFloat({ min: 0 }).withMessage('固定费用必须是非负数')
], validateRequest, async (req, res) => {
  try {
    const {
      name,
      displayName,
      type,
      status = 'ACTIVE',
      environment = 'production',
      description = '',
      features = [],
      supportedCurrencies = ['INR'],
      dailyLimit = 100000000,
      monthlyLimit = 1000000000,
      singleTransactionLimit = 10000000,
      depositFee = 0.5,
      withdrawalFee = 1.0,
      fixedFee = 0
    } = req.body;

    // 检查支付商名称是否已存在
    // TODO: 实际项目中应该检查数据库

    // 验证限额逻辑
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

    // 创建新支付商（模拟）
    const newProvider = {
      id: Date.now().toString(),
      name,
      displayName,
      type,
      status,
      environment,
      description,
      features,
      supportedCurrencies,
      dailyLimit,
      monthlyLimit,
      singleTransactionLimit,
      fees: {
        deposit: depositFee,
        withdrawal: withdrawalFee,
        fixed: fixedFee
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: {
        message: '支付商创建成功',
        provider: newProvider
      }
    });

  } catch (error) {
    console.error('Create provider error:', error);
    res.status(500).json({
      success: false,
      error: '创建支付商失败'
    });
  }
});

// 更新支付商信息
router.put('/:providerId', [
  body('displayName').optional().isString().notEmpty().withMessage('显示名称不能为空'),
  body('type').optional().isIn(['native', 'wakeup', 'third-party']).withMessage('类型值无效'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).withMessage('状态值无效'),
  body('environment').optional().isIn(['sandbox', 'production']).withMessage('环境值无效'),
  body('description').optional().isString().withMessage('描述必须是字符串'),
  body('features').optional().isArray().withMessage('功能特性必须是数组'),
  body('supportedCurrencies').optional().isArray().withMessage('支持的货币必须是数组'),
  body('dailyLimit').optional().isInt({ min: 1 }).withMessage('日限额必须是正整数'),
  body('monthlyLimit').optional().isInt({ min: 1 }).withMessage('月限额必须是正整数'),
  body('singleTransactionLimit').optional().isInt({ min: 1 }).withMessage('单笔交易限额必须是正整数'),
  body('depositFee').optional().isFloat({ min: 0 }).withMessage('充值费率必须是非负数'),
  body('withdrawalFee').optional().isFloat({ min: 0 }).withMessage('提现费率必须是非负数'),
  body('fixedFee').optional().isFloat({ min: 0 }).withMessage('固定费用必须是非负数')
], validateRequest, async (req, res) => {
  try {
    const { providerId } = req.params;
    const updateData = req.body;

    // 查找支付商
    // TODO: 实际项目中应该从数据库查找

    // 验证限额逻辑
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

    // 更新支付商信息（模拟）
    const updatedProvider = {
      id: providerId,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        message: '支付商信息更新成功',
        provider: updatedProvider
      }
    });

  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({
      success: false,
      error: '更新支付商信息失败'
    });
  }
});

// 删除支付商
router.delete('/:providerId', apiKeyAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    
    // 检查支付商是否存在
    // TODO: 实际项目中应该检查数据库

    // 检查是否有关联的商户
    // TODO: 实际项目中应该检查数据库

    // 删除支付商（模拟）
    res.json({
      success: true,
      data: {
        message: '支付商删除成功'
      }
    });

  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({
      success: false,
      error: '删除支付商失败'
    });
  }
});

// 获取支付商统计信息
router.get('/:providerId/stats', apiKeyAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { startDate, endDate } = req.query;

    // 模拟统计数据
    const stats = {
      providerId,
      period: {
        startDate: startDate || '2025-01-01',
        endDate: endDate || '2025-01-26'
      },
      transactions: {
        total: 1250,
        successful: 1180,
        failed: 70,
        successRate: 94.4
      },
      volume: {
        total: 1250000000, // 12.5亿卢比
        average: 50000000, // 5000万卢比/天
        largest: 100000000 // 1亿卢比
      },
      fees: {
        total: 6250000, // 625万卢比
        average: 5000 // 5000卢比/笔
      },
      performance: {
        averageResponseTime: 2.5, // 2.5秒
        uptime: 99.8, // 99.8%
        errorRate: 0.2 // 0.2%
      }
    };

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get provider stats error:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商统计信息失败'
    });
  }
});

module.exports = router;
