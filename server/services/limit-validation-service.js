const Order = require('../models/order');
const Transaction = require('../models/transaction');
const PaymentConfig = require('../models/PaymentConfig');
const { getIndianTimeISO } = require('../utils/timeUtils');

/**
 * 限额验证服务
 * 防止超额交易，保护商户资金安全
 */
class LimitValidationService {
  constructor() {
    this.cache = new Map(); // 缓存限额检查结果
    this.cacheExpiry = 5 * 60 * 1000; // 缓存5分钟
  }

  /**
   * 验证交易限额
   * @param {Object} transactionData - 交易数据
   * @param {string} merchantId - 商户ID
   * @param {string} providerName - 支付提供商名称
   * @returns {Object} 验证结果
   */
  async validateTransactionLimits(transactionData, merchantId, providerName) {
    try {
      const {
        amount,
        type = 'DEPOSIT', // DEPOSIT 或 WITHDRAWAL
        currency = 'INR'
      } = transactionData;

      // 获取商户配置
      const merchantConfig = await this.getMerchantConfig(merchantId);
      if (!merchantConfig) {
        return {
          valid: false,
          error: '商户配置未找到',
          code: 'MERCHANT_CONFIG_NOT_FOUND'
        };
      }

      // 获取支付提供商配置
      const providerConfig = await this.getProviderConfig(merchantId, providerName);
      if (!providerConfig) {
        return {
          valid: false,
          error: '支付提供商配置未找到',
          code: 'PROVIDER_CONFIG_NOT_FOUND'
        };
      }

      // 验证基础限额
      const basicLimitValidation = await this.validateBasicLimits(
        amount, type, merchantConfig, providerConfig
      );
      if (!basicLimitValidation.valid) {
        return basicLimitValidation;
      }

      // 验证日限额
      const dailyLimitValidation = await this.validateDailyLimits(
        amount, type, merchantId, providerName, merchantConfig, providerConfig
      );
      if (!dailyLimitValidation.valid) {
        return dailyLimitValidation;
      }

      // 验证月限额
      const monthlyLimitValidation = await this.validateMonthlyLimits(
        amount, type, merchantId, providerName, merchantConfig, providerConfig
      );
      if (!monthlyLimitValidation.valid) {
        return monthlyLimitValidation;
      }

      // 验证风险限额（大额交易）
      const riskLimitValidation = await this.validateRiskLimits(
        amount, type, merchantId, providerName, merchantConfig, providerConfig
      );
      if (!riskLimitValidation.valid) {
        return riskLimitValidation;
      }

      // 所有验证通过
      return {
        valid: true,
        message: '限额验证通过',
        limits: {
          basic: basicLimitValidation.limits,
          daily: dailyLimitValidation.limits,
          monthly: monthlyLimitValidation.limits,
          risk: riskLimitValidation.limits
        }
      };

    } catch (error) {
      console.error('限额验证失败:', error);
      return {
        valid: false,
        error: '限额验证服务异常',
        code: 'VALIDATION_SERVICE_ERROR',
        details: error.message
      };
    }
  }

  /**
   * 验证基础限额
   */
  async validateBasicLimits(amount, type, merchantConfig, providerConfig) {
    const limits = merchantConfig.paymentConfig.limits;
    const providerLimits = providerConfig.limits || {};

    // 单笔交易限额
    const minAmount = Math.max(
      limits.minDeposit || 100,
      providerLimits.minAmount || 100
    );
    const maxAmount = Math.min(
      limits.maxDeposit || 5000000,
      providerLimits.maxAmount || 5000000
    );

    if (amount < minAmount) {
      return {
        valid: false,
        error: `交易金额不能低于 ${minAmount / 100} 卢比`,
        code: 'AMOUNT_TOO_SMALL',
        limits: { minAmount, maxAmount }
      };
    }

    if (amount > maxAmount) {
      return {
        valid: false,
        error: `交易金额不能超过 ${maxAmount / 100} 卢比`,
        code: 'AMOUNT_TOO_LARGE',
        limits: { minAmount, maxAmount }
      };
    }

    return {
      valid: true,
      limits: { minAmount, maxAmount }
    };
  }

  /**
   * 验证日限额
   */
  async validateDailyLimits(amount, type, merchantId, providerName, merchantConfig, providerConfig) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查询今日已完成的交易总额
    const todayTransactions = await Transaction.find({
      merchantId,
      provider: providerName,
      type,
      status: 'SUCCESS',
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const newTotal = todayTotal + amount;

    // 获取日限额
    const dailyLimit = Math.min(
      merchantConfig.paymentConfig.limits.dailyLimit || 50000000,
      providerConfig.limits?.dailyLimit || 50000000
    );

    if (newTotal > dailyLimit) {
      return {
        valid: false,
        error: `今日${type === 'DEPOSIT' ? '充值' : '提现'}总额将超过限额 ${dailyLimit / 100} 卢比`,
        code: 'DAILY_LIMIT_EXCEEDED',
        limits: {
          dailyLimit,
          todayTotal: todayTotal / 100,
          newTotal: newTotal / 100,
          remaining: (dailyLimit - todayTotal) / 100
        }
      };
    }

    return {
      valid: true,
      limits: {
        dailyLimit,
        todayTotal: todayTotal / 100,
        newTotal: newTotal / 100,
        remaining: (dailyLimit - todayTotal) / 100
      }
    };
  }

  /**
   * 验证月限额
   */
  async validateMonthlyLimits(amount, type, merchantId, providerName, merchantConfig, providerConfig) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 查询本月已完成的交易总额
    const monthTransactions = await Transaction.find({
      merchantId,
      provider: providerName,
      type,
      status: 'SUCCESS',
      createdAt: { $gte: monthStart, $lt: nextMonth }
    });

    const monthTotal = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const newTotal = monthTotal + amount;

    // 获取月限额
    const monthlyLimit = Math.min(
      merchantConfig.paymentConfig.limits.monthlyLimit || 500000000,
      providerConfig.limits?.monthlyLimit || 500000000
    );

    if (newTotal > monthlyLimit) {
      return {
        valid: false,
        error: `本月${type === 'DEPOSIT' ? '充值' : '提现'}总额将超过限额 ${monthlyLimit / 100} 卢比`,
        code: 'MONTHLY_LIMIT_EXCEEDED',
        limits: {
          monthlyLimit,
          monthTotal: monthTotal / 100,
          newTotal: newTotal / 100,
          remaining: (monthlyLimit - monthTotal) / 100
        }
      };
    }

    return {
      valid: true,
      limits: {
        monthlyLimit,
        monthTotal: monthTotal / 100,
        newTotal: newTotal / 100,
        remaining: (monthlyLimit - monthTotal) / 100
      }
    };
  }

  /**
   * 验证风险限额（大额交易）
   */
  async validateRiskLimits(amount, type, merchantId, providerName, merchantConfig, providerConfig) {
    // 大额交易阈值（例如：100万卢比）
    const largeAmountThreshold = 100000000; // 100万卢比（以分为单位）
    
    if (amount >= largeAmountThreshold) {
      // 检查是否有大额交易权限
      if (!merchantConfig.paymentConfig.limits.allowLargeTransactions) {
        return {
          valid: false,
          error: '商户未开通大额交易权限',
          code: 'LARGE_TRANSACTION_NOT_ALLOWED',
          limits: { largeAmountThreshold: largeAmountThreshold / 100 }
        };
      }

      // 检查大额交易频率限制
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLargeTransactions = await Transaction.find({
        merchantId,
        provider: providerName,
        type,
        amount: { $gte: largeAmountThreshold },
        status: 'SUCCESS',
        createdAt: { $gte: last24Hours }
      });

      const maxLargeTransactionsPerDay = merchantConfig.paymentConfig.limits.maxLargeTransactionsPerDay || 3;
      if (recentLargeTransactions.length >= maxLargeTransactionsPerDay) {
        return {
          valid: false,
          error: `今日大额交易次数已达上限 ${maxLargeTransactionsPerDay} 次`,
          code: 'LARGE_TRANSACTION_FREQUENCY_LIMIT',
          limits: {
            maxLargeTransactionsPerDay,
            todayLargeTransactions: recentLargeTransactions.length
          }
        };
      }
    }

    return {
      valid: true,
      limits: {
        largeAmountThreshold: largeAmountThreshold / 100,
        allowLargeTransactions: merchantConfig.paymentConfig.limits.allowLargeTransactions || false
      }
    };
  }

  /**
   * 获取商户配置
   */
  async getMerchantConfig(merchantId) {
    const cacheKey = `merchant_${merchantId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const merchant = await require('../models/merchant').findOne({ merchantId });
    
    if (merchant) {
      this.cache.set(cacheKey, {
        data: merchant,
        timestamp: Date.now()
      });
    }

    return merchant;
  }

  /**
   * 获取支付提供商配置
   */
  async getProviderConfig(merchantId, providerName) {
    const cacheKey = `provider_${merchantId}_${providerName}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const config = await PaymentConfig.findOne({
      merchantId,
      'provider.name': providerName
    });

    if (config) {
      this.cache.set(cacheKey, {
        data: config,
        timestamp: Date.now()
      });
    }

    return config;
  }

  /**
   * 清理过期缓存
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取限额统计信息
   */
  async getLimitStats(merchantId, providerName, type = 'DEPOSIT') {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // 今日交易统计
      const todayTransactions = await Transaction.find({
        merchantId,
        provider: providerName,
        type,
        status: 'SUCCESS',
        createdAt: { $gte: today }
      });

      // 本月交易统计
      const monthTransactions = await Transaction.find({
        merchantId,
        provider: providerName,
        type,
        status: 'SUCCESS',
        createdAt: { $gte: monthStart }
      });

      const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const monthTotal = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);

      // 获取限额配置
      const merchantConfig = await this.getMerchantConfig(merchantId);
      const providerConfig = await this.getProviderConfig(merchantId, providerName);

      const dailyLimit = Math.min(
        merchantConfig?.paymentConfig?.limits?.dailyLimit || 50000000,
        providerConfig?.limits?.dailyLimit || 50000000
      );

      const monthlyLimit = Math.min(
        merchantConfig?.paymentConfig?.limits?.monthlyLimit || 500000000,
        providerConfig?.limits?.monthlyLimit || 500000000
      );

      return {
        today: {
          total: todayTotal / 100,
          limit: dailyLimit / 100,
          remaining: (dailyLimit - todayTotal) / 100,
          usage: (todayTotal / dailyLimit * 100).toFixed(2)
        },
        month: {
          total: monthTotal / 100,
          limit: monthlyLimit / 100,
          remaining: (monthlyLimit - monthTotal) / 100,
          usage: (monthTotal / monthlyLimit * 100).toFixed(2)
        },
        transactions: {
          today: todayTransactions.length,
          month: monthTransactions.length
        }
      };

    } catch (error) {
      console.error('获取限额统计失败:', error);
      throw error;
    }
  }

  /**
   * 预检查限额（用于前端实时验证）
   */
  async preCheckLimits(amount, type, merchantId, providerName) {
    const validation = await this.validateTransactionLimits(
      { amount, type, currency: 'INR' },
      merchantId,
      providerName
    );

    if (validation.valid) {
      return {
        ...validation,
        preCheck: true,
        message: '限额预检查通过'
      };
    }

    return {
      ...validation,
      preCheck: false,
      message: '限额预检查失败'
    };
  }
}

module.exports = LimitValidationService;
