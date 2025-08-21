const { validationResult } = require('express-validator');

/**
 * 验证请求中间件
 * 检查express-validator的验证结果，如果有错误则返回400状态码
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * 自定义验证规则
 */
const customValidators = {
  /**
   * 检查是否为有效的MongoDB ObjectId
   */
  isMongoId: (value) => {
    if (!value) return false;
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    return objectIdPattern.test(value);
  },
  
  /**
   * 检查是否为有效的金额（正数）
   */
  isPositiveAmount: (value) => {
    if (typeof value !== 'number') return false;
    return value > 0;
  },
  
  /**
   * 检查是否为有效的手机号（印度格式）
   */
  isIndianPhone: (value) => {
    if (!value) return false;
    const phonePattern = /^[6-9]\d{9}$/;
    return phonePattern.test(value);
  },
  
  /**
   * 检查是否为有效的邮箱
   */
  isEmail: (value) => {
    if (!value) return false;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  },
  
  /**
   * 检查是否为有效的日期字符串
   */
  isDateString: (value) => {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
  
  /**
   * 检查是否为有效的JSON字符串
   */
  isJsonString: (value) => {
    if (typeof value !== 'string') return false;
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * 异步验证中间件
 * 用于需要异步验证的场景
 */
const asyncValidate = (validator) => {
  return async (req, res, next) => {
    try {
      await validator(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 条件验证中间件
 * 根据条件决定是否进行验证
 */
const conditionalValidate = (condition, validators) => {
  return (req, res, next) => {
    if (condition(req)) {
      return validators(req, res, next);
    }
    next();
  };
};

/**
 * 清理验证错误中间件
 * 清理req.body中的验证错误信息
 */
const cleanValidationErrors = (req, res, next) => {
  if (req.validationErrors) {
    delete req.validationErrors;
  }
  next();
};

module.exports = {
  validateRequest,
  customValidators,
  asyncValidate,
  conditionalValidate,
  cleanValidationErrors
};
