/**
 * DhPay支付通道配置
 */

const dhpayConfig = {
  // 生产环境配置
  production: {
    baseUrl: process.env.DHPAY_PRODUCTION_URL || 'https://api.dhpay.com',
    mchId: process.env.DHPAY_PRODUCTION_MCH_ID || '',
    secretKey: process.env.DHPAY_PRODUCTION_SECRET_KEY || '',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // 测试环境配置
  test: {
    baseUrl: process.env.DHPAY_TEST_URL || 'https://test-api.dhpay.com',
    mchId: process.env.DHPAY_TEST_MCH_ID || '10000',
    secretKey: process.env.DHPAY_TEST_SECRET_KEY || 'test_secret_key',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // 开发环境配置
  development: {
    baseUrl: process.env.DHPAY_DEV_URL || 'https://dev-api.dhpay.com',
    mchId: process.env.DHPAY_DEV_MCH_ID || '10000',
    secretKey: process.env.DHPAY_DEV_SECRET_KEY || 'dev_secret_key',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // 通用配置
  common: {
    // 产品ID配置
    productIds: {
      deposit: '3001',    // 代收产品ID
      withdraw: '3002'    // 代付产品ID
    },

    // 状态映射
    statusMapping: {
      'PENDING': 'PENDING',
      'PROCESSING': 'PROCESSING', 
      'SUCCESS': 'SUCCESS',
      'FAILED': 'FAILED',
      'CANCELLED': 'CANCELLED'
    },

    // 货币配置
    currencies: ['INR'],

    // 金额限制（分）
    amountLimits: {
      min: 1,           // 最小1分
      max: 1000000      // 最大10000元
    },

    // 费率配置
    fees: {
      deposit: 0.005,   // 代收0.5%
      withdraw: 0.01    // 代付1%
    },

    // 超时配置
    timeouts: {
      createOrder: 30000,    // 创建订单30秒
      queryOrder: 30000,     // 查询订单30秒
      callback: 10000        // 回调处理10秒
    },

    // 重试配置
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000
    },

    // 日志配置
    logging: {
      enabled: true,
      level: 'info',
      includeSensitiveData: false
    }
  }
};

/**
 * 获取DhPay配置
 * @param {string} environment - 环境名称 (production|test|development)
 * @returns {object} 配置对象
 */
function getDhPayConfig(environment = 'development') {
  const envConfig = dhpayConfig[environment] || dhpayConfig.development;
  const commonConfig = dhpayConfig.common;
  
  return {
    ...commonConfig,
    ...envConfig
  };
}

/**
 * 验证DhPay配置
 * @param {object} config - 配置对象
 * @returns {object} 验证结果
 */
function validateDhPayConfig(config) {
  const errors = [];
  const warnings = [];

  // 必需字段验证
  if (!config.baseUrl) {
    errors.push('baseUrl is required');
  }

  if (!config.mchId) {
    errors.push('mchId is required');
  }

  if (!config.secretKey) {
    errors.push('secretKey is required');
  }

  // URL格式验证
  if (config.baseUrl && !config.baseUrl.startsWith('https://')) {
    warnings.push('baseUrl should use HTTPS for security');
  }

  // 超时验证
  if (config.timeout && config.timeout < 5000) {
    warnings.push('timeout should be at least 5000ms');
  }

  // 重试次数验证
  if (config.retryAttempts && config.retryAttempts > 10) {
    warnings.push('retryAttempts should not exceed 10');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 获取DhPay环境变量配置
 * @returns {object} 环境变量配置
 */
function getDhPayEnvConfig() {
  return {
    DHPAY_PRODUCTION_URL: process.env.DHPAY_PRODUCTION_URL,
    DHPAY_PRODUCTION_MCH_ID: process.env.DHPAY_PRODUCTION_MCH_ID,
    DHPAY_PRODUCTION_SECRET_KEY: process.env.DHPAY_PRODUCTION_SECRET_KEY,
    DHPAY_TEST_URL: process.env.DHPAY_TEST_URL,
    DHPAY_TEST_MCH_ID: process.env.DHPAY_TEST_MCH_ID,
    DHPAY_TEST_SECRET_KEY: process.env.DHPAY_TEST_SECRET_KEY,
    DHPAY_DEV_URL: process.env.DHPAY_DEV_URL,
    DHPAY_DEV_MCH_ID: process.env.DHPAY_DEV_MCH_ID,
    DHPAY_DEV_SECRET_KEY: process.env.DHPAY_DEV_SECRET_KEY
  };
}

/**
 * 生成DhPay配置示例
 * @returns {object} 配置示例
 */
function getDhPayConfigExample() {
  return {
    production: {
      baseUrl: 'https://api.dhpay.com',
      mchId: 'your_production_mch_id',
      secretKey: 'your_production_secret_key',
      timeout: 30000
    },
    test: {
      baseUrl: 'https://test-api.dhpay.com',
      mchId: 'your_test_mch_id',
      secretKey: 'your_test_secret_key',
      timeout: 30000
    },
    development: {
      baseUrl: 'https://dev-api.dhpay.com',
      mchId: 'your_dev_mch_id',
      secretKey: 'your_dev_secret_key',
      timeout: 30000
    }
  };
}

module.exports = {
  dhpayConfig,
  getDhPayConfig,
  validateDhPayConfig,
  getDhPayEnvConfig,
  getDhPayConfigExample
};
