const express = require('express');
const { body, validationResult } = require('express-validator');
const { apiKeyAuth } = require('../middleware/auth');
const { 
  validateTransactionLimits, 
  preCheckTransactionLimits,
  addLimitStats,
  decorateLimitValidationResponse,
  limitValidationService 
} = require('../middleware/limit-validation');

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

/**
 * 验证交易限额
 * POST /api/limit-management/validate
 */
router.post('/validate', 
  apiKeyAuth,
  [
    body('amount').isNumeric().withMessage('金额必须是数字'),
    body('type').isIn(['DEPOSIT', 'WITHDRAWAL']).withMessage('交易类型必须是DEPOSIT或WITHDRAWAL'),
    body('provider').notEmpty().withMessage('支付提供商不能为空'),
    body('currency').optional().isIn(['INR']).withMessage('仅支持印度卢比(INR)')
  ],
  validateRequest,
  validateTransactionLimits(),
  decorateLimitValidationResponse,
  async (req, res) => {
    try {
      res.json({
        success: true,
        message: '限额验证通过',
        data: {
          amount: req.body.amount,
          type: req.body.type,
          provider: req.body.provider,
          currency: req.body.currency || 'INR',
          validation: req.limitValidation
        }
      });
    } catch (error) {
      console.error('限额验证API错误:', error);
      res.status(500).json({
        success: false,
        error: '限额验证失败',
        code: 'VALIDATION_API_ERROR'
      });
    }
  }
);

/**
 * 预检查交易限额（不阻止交易）
 * POST /api/limit-management/pre-check
 */
router.post('/pre-check',
  apiKeyAuth,
  [
    body('amount').isNumeric().withMessage('金额必须是数字'),
    body('type').isIn(['DEPOSIT', 'WITHDRAWAL']).withMessage('交易类型必须是DEPOSIT或WITHDRAWAL'),
    body('provider').notEmpty().withMessage('支付提供商不能为空')
  ],
  validateRequest,
  preCheckTransactionLimits(),
  addLimitStats(),
  decorateLimitValidationResponse,
  async (req, res) => {
    try {
      res.json({
        success: true,
        message: '限额预检查完成',
        data: {
          amount: req.body.amount,
          type: req.body.type,
          provider: req.body.provider,
          preCheck: req.limitPreCheck,
          stats: req.limitStats
        }
      });
    } catch (error) {
      console.error('限额预检查API错误:', error);
      res.status(500).json({
        success: false,
        error: '限额预检查失败',
        code: 'PRECHECK_API_ERROR'
      });
    }
  }
);

/**
 * 获取限额统计信息
 * GET /api/limit-management/stats
 */
router.get('/stats',
  apiKeyAuth,
  async (req, res) => {
    try {
      const { provider, type = 'DEPOSIT', period = 'month' } = req.query;
      const merchantId = req.merchant?.merchantId;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: '支付提供商参数不能为空',
          code: 'MISSING_PROVIDER'
        });
      }

      const stats = await limitValidationService.getLimitStats(
        merchantId, provider, type
      );

      res.json({
        success: true,
        message: '获取限额统计成功',
        data: {
          merchantId,
          provider,
          type,
          period,
          stats
        }
      });

    } catch (error) {
      console.error('获取限额统计API错误:', error);
      res.status(500).json({
        success: false,
        error: '获取限额统计失败',
        code: 'STATS_API_ERROR'
      });
    }
  }
);

/**
 * 获取限额配置信息
 * GET /api/limit-management/config
 */
router.get('/config',
  apiKeyAuth,
  async (req, res) => {
    try {
      const { provider } = req.query;
      const merchantId = req.merchant?.merchantId;

      if (!provider) {
        return res.status(400).json({
          success: false,
          error: '支付提供商参数不能为空',
          code: 'MISSING_PROVIDER'
        });
      }

      // 获取商户配置
      const merchantConfig = await limitValidationService.getMerchantConfig(merchantId);
      if (!merchantConfig) {
        return res.status(404).json({
          success: false,
          error: '商户配置未找到',
          code: 'MERCHANT_CONFIG_NOT_FOUND'
        });
      }

      // 获取支付提供商配置
      const providerConfig = await limitValidationService.getProviderConfig(merchantId, provider);
      if (!providerConfig) {
        return res.status(404).json({
          success: false,
          error: '支付提供商配置未找到',
          code: 'PROVIDER_CONFIG_NOT_FOUND'
        });
      }

      // 合并限额配置
      const limits = {
        basic: {
          minAmount: Math.max(
            merchantConfig.paymentConfig.limits.minDeposit || 100,
            providerConfig.limits?.minAmount || 100
          ) / 100,
          maxAmount: Math.min(
            merchantConfig.paymentConfig.limits.maxDeposit || 5000000,
            providerConfig.limits?.maxAmount || 5000000
          ) / 100
        },
        daily: {
          limit: Math.min(
            merchantConfig.paymentConfig.limits.dailyLimit || 50000000,
            providerConfig.limits?.dailyLimit || 50000000
          ) / 100
        },
        monthly: {
          limit: Math.min(
            merchantConfig.paymentConfig.limits.monthlyLimit || 500000000,
            providerConfig.limits?.monthlyLimit || 500000000
          ) / 100
        },
        risk: {
          allowLargeTransactions: merchantConfig.paymentConfig.limits.allowLargeTransactions || false,
          maxLargeTransactionsPerDay: merchantConfig.paymentConfig.limits.maxLargeTransactionsPerDay || 3,
          largeAmountThreshold: 1000000 // 100万卢比
        }
      };

      res.json({
        success: true,
        message: '获取限额配置成功',
        data: {
          merchantId,
          provider,
          limits,
          currency: 'INR',
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('获取限额配置API错误:', error);
      res.status(500).json({
        success: false,
        error: '获取限额配置失败',
        code: 'CONFIG_API_ERROR'
      });
    }
  }
);

/**
 * 更新限额配置
 * PUT /api/limit-management/config
 */
router.put('/config',
  apiKeyAuth,
  [
    body('provider').notEmpty().withMessage('支付提供商不能为空'),
    body('limits.basic.minAmount').optional().isNumeric().withMessage('最小金额必须是数字'),
    body('limits.basic.maxAmount').optional().isNumeric().withMessage('最大金额必须是数字'),
    body('limits.daily.limit').optional().isNumeric().withMessage('日限额必须是数字'),
    body('limits.monthly.limit').optional().isNumeric().withMessage('月限额必须是数字'),
    body('limits.risk.allowLargeTransactions').optional().isBoolean().withMessage('大额交易权限必须是布尔值'),
    body('limits.risk.maxLargeTransactionsPerDay').optional().isInt({ min: 1, max: 10 }).withMessage('大额交易次数限制必须在1-10之间')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { provider, limits } = req.body;
      const merchantId = req.merchant?.merchantId;

      // 获取商户配置
      const merchantConfig = await limitValidationService.getMerchantConfig(merchantId);
      if (!merchantConfig) {
        return res.status(404).json({
          success: false,
          error: '商户配置未找到',
          code: 'MERCHANT_CONFIG_NOT_FOUND'
        });
      }

      // 获取支付提供商配置
      const providerConfig = await limitValidationService.getProviderConfig(merchantId, provider);
      if (!providerConfig) {
        return res.status(404).json({
          success: false,
          error: '支付提供商配置未找到',
          code: 'PROVIDER_CONFIG_NOT_FOUND'
        });
      }

      // 更新限额配置
      if (limits.basic) {
        if (limits.basic.minAmount !== undefined) {
          providerConfig.limits = providerConfig.limits || {};
          providerConfig.limits.minAmount = Math.round(limits.basic.minAmount * 100);
        }
        if (limits.basic.maxAmount !== undefined) {
          providerConfig.limits = providerConfig.limits || {};
          providerConfig.limits.maxAmount = Math.round(limits.basic.maxAmount * 100);
        }
      }

      if (limits.daily?.limit !== undefined) {
        providerConfig.limits = providerConfig.limits || {};
        providerConfig.limits.dailyLimit = Math.round(limits.daily.limit * 100);
      }

      if (limits.monthly?.limit !== undefined) {
        providerConfig.limits = providerConfig.limits || {};
        providerConfig.limits.monthlyLimit = Math.round(limits.monthly.limit * 100);
      }

      if (limits.risk) {
        if (limits.risk.allowLargeTransactions !== undefined) {
          merchantConfig.paymentConfig.limits.allowLargeTransactions = limits.risk.allowLargeTransactions;
        }
        if (limits.risk.maxLargeTransactionsPerDay !== undefined) {
          merchantConfig.paymentConfig.limits.maxLargeTransactionsPerDay = limits.risk.maxLargeTransactionsPerDay;
        }
      }

      // 保存配置
      await providerConfig.save();
      await merchantConfig.save();

      // 清理相关缓存
      limitValidationService.cleanupCache();

      res.json({
        success: true,
        message: '限额配置更新成功',
        data: {
          merchantId,
          provider,
          limits: {
            basic: {
              minAmount: providerConfig.limits?.minAmount / 100,
              maxAmount: providerConfig.limits?.maxAmount / 100
            },
            daily: {
              limit: providerConfig.limits?.dailyLimit / 100
            },
            monthly: {
              limit: providerConfig.limits?.monthlyLimit / 100
            },
            risk: {
              allowLargeTransactions: merchantConfig.paymentConfig.limits.allowLargeTransactions,
              maxLargeTransactionsPerDay: merchantConfig.paymentConfig.limits.maxLargeTransactionsPerDay
            }
          },
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('更新限额配置API错误:', error);
      res.status(500).json({
        success: false,
        error: '更新限额配置失败',
        code: 'UPDATE_CONFIG_API_ERROR'
      });
    }
  }
);

/**
 * 获取限额验证历史
 * GET /api/limit-management/history
 */
router.get('/history',
  apiKeyAuth,
  async (req, res) => {
    try {
      const { provider, type, status, page = 1, limit = 20 } = req.query;
      const merchantId = req.merchant?.merchantId;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      // 构建查询条件
      const query = { merchantId };
      if (provider) query.provider = provider;
      if (type) query.type = type;
      if (status) query.status = status;

      // 查询交易记录
      const transactions = await require('../models/transaction').find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('transactionId amount type provider status createdAt');

      // 统计总数
      const total = await require('../models/transaction').countDocuments(query);

      res.json({
        success: true,
        message: '获取限额验证历史成功',
        data: {
          transactions: transactions.map(tx => ({
            ...tx.toObject(),
            amount: tx.amount / 100 // 转换为卢比
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error) {
      console.error('获取限额验证历史API错误:', error);
      res.status(500).json({
        success: false,
        error: '获取限额验证历史失败',
        code: 'HISTORY_API_ERROR'
      });
    }
  }
);

/**
 * 测试限额验证服务
 * GET /api/limit-management/test
 */
router.get('/test',
  apiKeyAuth,
  async (req, res) => {
    try {
      const testCases = [
        {
          amount: 1000000, // 1万卢比
          type: 'DEPOSIT',
          provider: 'passpay',
          expected: 'valid'
        },
        {
          amount: 100000000, // 100万卢比
          type: 'DEPOSIT',
          provider: 'passpay',
          expected: 'valid'
        },
        {
          amount: 1000000000, // 1000万卢比
          type: 'DEPOSIT',
          provider: 'passpay',
          expected: 'may_exceed_limit'
        }
      ];

      const results = [];
      const merchantId = req.merchant?.merchantId;

      for (const testCase of testCases) {
        try {
          const result = await limitValidationService.preCheckLimits(
            testCase.amount,
            testCase.type,
            merchantId,
            testCase.provider
          );

          results.push({
            testCase,
            result: {
              valid: result.valid,
              error: result.error,
              code: result.code
            }
          });
        } catch (error) {
          results.push({
            testCase,
            result: {
              valid: false,
              error: error.message,
              code: 'TEST_ERROR'
            }
          });
        }
      }

      res.json({
        success: true,
        message: '限额验证服务测试完成',
        data: {
          merchantId,
          testResults: results,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('限额验证服务测试API错误:', error);
      res.status(500).json({
        success: false,
        error: '限额验证服务测试失败',
        code: 'TEST_API_ERROR'
      });
    }
  }
);

module.exports = router;
