const LimitValidationService = require('../services/limit-validation-service');

const limitValidationService = new LimitValidationService();

/**
 * 限额验证中间件
 * 在创建订单或交易前自动验证限额
 */
const validateTransactionLimits = (options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        amountField = 'amount',
        typeField = 'type',
        merchantIdField = 'merchantId',
        providerField = 'provider',
        currencyField = 'currency',
        skipValidation = false
      } = options;

      // 如果跳过验证，直接继续
      if (skipValidation) {
        return next();
      }

      // 获取交易数据
      const amount = req.body[amountField];
      const type = req.body[typeField] || 'DEPOSIT';
      const merchantId = req.body[merchantIdField] || req.merchant?.merchantId;
      const provider = req.body[providerField];
      const currency = req.body[currencyField] || 'INR';

      // 验证必要字段
      if (!amount || !merchantId || !provider) {
        return res.status(400).json({
          success: false,
          error: '缺少必要的交易信息',
          code: 'MISSING_TRANSACTION_INFO',
          required: { amount: !!amount, merchantId: !!merchantId, provider: !!provider }
        });
      }

      // 验证金额格式
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: '无效的交易金额',
          code: 'INVALID_AMOUNT',
          amount
        });
      }

      // 验证交易类型
      if (!['DEPOSIT', 'WITHDRAWAL'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: '无效的交易类型',
          code: 'INVALID_TRANSACTION_TYPE',
          type,
          allowed: ['DEPOSIT', 'WITHDRAWAL']
        });
      }

      // 验证货币
      if (currency !== 'INR') {
        return res.status(400).json({
          success: false,
          error: '仅支持印度卢比(INR)',
          code: 'UNSUPPORTED_CURRENCY',
          currency,
          supported: ['INR']
        });
      }

      // 执行限额验证
      const validationResult = await limitValidationService.validateTransactionLimits(
        { amount, type, currency },
        merchantId,
        provider
      );

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: validationResult.error,
          code: validationResult.code,
          limits: validationResult.limits,
          details: validationResult.details
        });
      }

      // 验证通过，将限额信息添加到请求对象中
      req.limitValidation = {
        passed: true,
        limits: validationResult.limits,
        timestamp: new Date()
      };

      next();

    } catch (error) {
      console.error('限额验证中间件错误:', error);
      return res.status(500).json({
        success: false,
        error: '限额验证服务异常',
        code: 'LIMIT_VALIDATION_ERROR',
        details: error.message
      });
    }
  };
};

/**
 * 限额预检查中间件
 * 用于前端实时验证，不阻止请求继续
 */
const preCheckTransactionLimits = (options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        amountField = 'amount',
        typeField = 'type',
        merchantIdField = 'merchantId',
        providerField = 'provider'
      } = options;

      // 获取交易数据
      const amount = req.body[amountField];
      const type = req.body[typeField] || 'DEPOSIT';
      const merchantId = req.body[merchantIdField] || req.merchant?.merchantId;
      const provider = req.body[providerField];

      // 如果缺少必要字段，跳过预检查
      if (!amount || !merchantId || !provider) {
        return next();
      }

      // 执行预检查
      const preCheckResult = await limitValidationService.preCheckLimits(
        amount, type, merchantId, provider
      );

      // 将预检查结果添加到请求对象中
      req.limitPreCheck = preCheckResult;

      next();

    } catch (error) {
      console.error('限额预检查中间件错误:', error);
      // 预检查失败不影响主流程，继续执行
      next();
    }
  };
};

/**
 * 限额统计中间件
 * 为响应添加限额统计信息
 */
const addLimitStats = (options = {}) => {
  return async (req, res, next) => {
    try {
      const {
        merchantIdField = 'merchantId',
        providerField = 'provider',
        typeField = 'type'
      } = options;

      const merchantId = req.body[merchantIdField] || req.merchant?.merchantId;
      const provider = req.body[providerField];
      const type = req.body[typeField] || 'DEPOSIT';

      if (merchantId && provider) {
        // 获取限额统计
        const limitStats = await limitValidationService.getLimitStats(
          merchantId, provider, type
        );

        // 将统计信息添加到请求对象中
        req.limitStats = limitStats;
      }

      next();

    } catch (error) {
      console.error('限额统计中间件错误:', error);
      // 统计失败不影响主流程，继续执行
      next();
    }
  };
};

/**
 * 限额验证结果装饰器
 * 为响应添加限额验证信息
 */
const decorateLimitValidationResponse = (req, res, next) => {
  // 保存原始的json方法
  const originalJson = res.json;

  // 重写json方法，添加限额信息
  res.json = function(data) {
    let enhancedData = data;

    // 如果响应成功且有限额验证信息，添加限额详情
    if (data && data.success && req.limitValidation) {
      enhancedData = {
        ...data,
        limitValidation: {
          passed: req.limitValidation.passed,
          timestamp: req.limitValidation.timestamp,
          limits: req.limitValidation.limits
        }
      };
    }

    // 如果有限额统计信息，添加到响应中
    if (req.limitStats) {
      enhancedData = {
        ...enhancedData,
        limitStats: req.limitStats
      };
    }

    // 如果有限额预检查结果，添加到响应中
    if (req.limitPreCheck) {
      enhancedData = {
        ...enhancedData,
        limitPreCheck: req.limitPreCheck
      };
    }

    // 调用原始的json方法
    return originalJson.call(this, enhancedData);
  };

  next();
};

module.exports = {
  validateTransactionLimits,
  preCheckTransactionLimits,
  addLimitStats,
  decorateLimitValidationResponse,
  limitValidationService
};
