const { ErrorHandler, ErrorTypes, ErrorSeverity } = require('../services/error-handling/error-handler');

// 创建全局异常处理器实例
const errorHandler = new ErrorHandler();

/**
 * 异步异常包装器
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 全局异常处理中间件
 */
const globalErrorHandler = (err, req, res, next) => {
  // 避免重复处理
  if (res.headersSent) {
    return next(err);
  }

  // 确定异常类型和严重程度
  const { errorType, severity } = categorizeError(err, req);
  
  // 使用异常处理器处理
  errorHandler.handleError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params
  }, errorType, severity);

  // 根据异常类型返回相应的响应
  const response = formatErrorResponse(err, errorType, severity);
  
  res.status(response.statusCode).json(response.body);
};

/**
 * 分类异常
 * @param {Error} err - 异常对象
 * @param {Object} req - 请求对象
 * @returns {Object} 异常类型和严重程度
 */
function categorizeError(err, req) {
  let errorType = ErrorTypes.SYSTEM;
  let severity = ErrorSeverity.MEDIUM;

  // 根据异常名称分类
  if (err.name === 'ValidationError') {
    errorType = ErrorTypes.VALIDATION;
    severity = ErrorSeverity.LOW;
  } else if (err.name === 'CastError') {
    errorType = ErrorTypes.VALIDATION;
    severity = ErrorSeverity.LOW;
  } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    errorType = ErrorTypes.DATABASE;
    severity = ErrorSeverity.HIGH;
  } else if (err.name === 'JsonWebTokenError') {
    errorType = ErrorTypes.AUTHENTICATION;
    severity = ErrorSeverity.MEDIUM;
  } else if (err.name === 'TokenExpiredError') {
    errorType = ErrorTypes.AUTHENTICATION;
    severity = ErrorSeverity.LOW;
  } else if (err.code === 'ECONNREFUSED') {
    errorType = ErrorTypes.NETWORK;
    severity = ErrorSeverity.HIGH;
  } else if (err.code === 'ETIMEDOUT') {
    errorType = ErrorTypes.API_TIMEOUT;
    severity = ErrorSeverity.MEDIUM;
  } else if (err.code === 'ENOTFOUND') {
    errorType = ErrorTypes.NETWORK;
    severity = ErrorSeverity.MEDIUM;
  } else if (err.code === 'ECONNRESET') {
    errorType = ErrorTypes.NETWORK;
    severity = ErrorSeverity.MEDIUM;
  } else if (err.code === 'ENOMEM') {
    errorType = ErrorTypes.MEMORY;
    severity = ErrorSeverity.CRITICAL;
  } else if (err.code === 'EMFILE') {
    errorType = ErrorTypes.SYSTEM;
    severity = ErrorSeverity.HIGH;
  }

  // 根据请求路径进一步分类
  if (req.url.includes('/api/payment/')) {
    errorType = ErrorTypes.PAYMENT;
  } else if (req.url.includes('/api/webhook/')) {
    errorType = ErrorTypes.WEBHOOK;
  } else if (req.url.includes('/api/auth/')) {
    errorType = ErrorTypes.AUTHENTICATION;
  }

  return { errorType, severity };
}

/**
 * 格式化错误响应
 * @param {Error} err - 异常对象
 * @param {string} errorType - 异常类型
 * @param {string} severity - 异常严重程度
 * @returns {Object} 格式化的响应
 */
function formatErrorResponse(err, errorType, severity) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // 根据异常类型设置状态码
  switch (errorType) {
    case ErrorTypes.VALIDATION:
      statusCode = 400;
      message = 'Validation Error';
      break;
    case ErrorTypes.AUTHENTICATION:
      statusCode = 401;
      message = 'Authentication Failed';
      break;
    case ErrorTypes.AUTHORIZATION:
      statusCode = 403;
      message = 'Access Denied';
      break;
    case ErrorTypes.PAYMENT:
      statusCode = 400;
      message = 'Payment Error';
      break;
    case ErrorTypes.WEBHOOK:
      statusCode = 400;
      message = 'Webhook Error';
      break;
    case ErrorTypes.DATABASE:
      statusCode = 503;
      message = 'Service Temporarily Unavailable';
      break;
    case ErrorTypes.NETWORK:
      statusCode = 503;
      message = 'Service Temporarily Unavailable';
      break;
    case ErrorTypes.API_TIMEOUT:
      statusCode = 408;
      message = 'Request Timeout';
      break;
    case ErrorTypes.RATE_LIMIT:
      statusCode = 429;
      message = 'Too Many Requests';
      break;
    default:
      statusCode = 500;
      message = 'Internal Server Error';
  }

  // 开发环境显示详细错误信息
  if (isDevelopment) {
    details = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    };
  }

  // 生产环境隐藏敏感信息
  if (process.env.NODE_ENV === 'production') {
    // 隐藏数据库连接字符串等敏感信息
    if (err.message && err.message.includes('mongodb://')) {
      message = 'Database connection error';
    }
  }

  return {
    statusCode,
    body: {
      success: false,
      error: {
        type: errorType,
        severity,
        message,
        code: err.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      },
      ...(details && { details })
    }
  };
}

/**
 * 生成请求ID
 * @returns {string} 请求ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 业务逻辑异常类
 */
class BusinessError extends Error {
  constructor(message, code = 'BUSINESS_ERROR', statusCode = 400, severity = ErrorSeverity.MEDIUM) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
  }
}

/**
 * 验证异常类
 */
class ValidationError extends Error {
  constructor(message, field = null, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
    this.severity = ErrorSeverity.LOW;
  }
}

/**
 * 支付异常类
 */
class PaymentError extends Error {
  constructor(message, provider = null, orderId = null, code = 'PAYMENT_ERROR') {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.provider = provider;
    this.orderId = orderId;
    this.severity = ErrorSeverity.MEDIUM;
  }
}

/**
 * 数据库异常类
 */
class DatabaseError extends Error {
  constructor(message, operation = null, collection = null, code = 'DATABASE_ERROR') {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.operation = operation;
    this.collection = collection;
    this.severity = ErrorSeverity.HIGH;
  }
}

/**
 * 网络异常类
 */
class NetworkError extends Error {
  constructor(message, url = null, method = null, code = 'NETWORK_ERROR') {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.url = url;
    this.method = method;
    this.severity = ErrorSeverity.MEDIUM;
  }
}

/**
 * 重试装饰器
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @param {Function} retryCondition - 重试条件函数
 * @returns {Function} 装饰器函数
 */
function withRetry(maxRetries = 3, delay = 1000, retryCondition = null) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args) {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          lastError = error;
          
          // 检查是否应该重试
          if (retryCondition && !retryCondition(error)) {
            throw error;
          }
          
          // 最后一次尝试失败，抛出异常
          if (attempt === maxRetries) {
            break;
          }
          
          // 等待后重试
          console.log(`重试第 ${attempt} 次，延迟 ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 指数退避
          delay *= 2;
        }
      }
      
      throw lastError;
    };

    return descriptor;
  };
}

/**
 * 超时装饰器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Function} 装饰器函数
 */
function withTimeout(timeout = 30000) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      });

      const methodPromise = method.apply(this, args);
      
      return Promise.race([methodPromise, timeoutPromise]);
    };

    return descriptor;
  };
}

/**
 * 断路器装饰器
 * @param {number} failureThreshold - 失败阈值
 * @param {number} recoveryTimeout - 恢复超时（毫秒）
 * @returns {Function} 装饰器函数
 */
function withCircuitBreaker(failureThreshold = 5, recoveryTimeout = 60000) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    // 断路器状态
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    let failureCount = 0;
    let lastFailureTime = 0;

    descriptor.value = async function(...args) {
      // 检查断路器状态
      if (state === 'OPEN') {
        if (Date.now() - lastFailureTime > recoveryTimeout) {
          state = 'HALF_OPEN';
          console.log('断路器状态: HALF_OPEN');
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
      }

      try {
        const result = await method.apply(this, args);
        
        // 成功调用，重置断路器
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failureCount = 0;
          console.log('断路器状态: CLOSED');
        }
        
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = Date.now();
        
        // 达到失败阈值，打开断路器
        if (failureCount >= failureThreshold) {
          state = 'OPEN';
          console.log('断路器状态: OPEN');
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

module.exports = {
  globalErrorHandler,
  asyncHandler,
  BusinessError,
  ValidationError,
  PaymentError,
  DatabaseError,
  NetworkError,
  withRetry,
  withTimeout,
  withCircuitBreaker,
  errorHandler
};
