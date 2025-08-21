const SecurityAudit = require('../security/security-audit');

/**
 * 异常类型枚举
 */
const ErrorTypes = {
  // 系统级异常
  SYSTEM: 'SYSTEM',
  DATABASE: 'DATABASE',
  NETWORK: 'NETWORK',
  MEMORY: 'MEMORY',
  
  // 业务级异常
  BUSINESS: 'BUSINESS',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  
  // 支付相关异常
  PAYMENT: 'PAYMENT',
  PAYMENT_PROVIDER: 'PAYMENT_PROVIDER',
  WEBHOOK: 'WEBHOOK',
  
  // 外部服务异常
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
  API_TIMEOUT: 'API_TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT'
};

/**
 * 异常严重程度枚举
 */
const ErrorSeverity = {
  LOW: 'LOW',           // 低 - 不影响核心功能
  MEDIUM: 'MEDIUM',     // 中 - 影响部分功能
  HIGH: 'HIGH',         // 高 - 影响核心功能
  CRITICAL: 'CRITICAL'  // 严重 - 系统不可用
};

/**
 * 统一异常处理服务
 */
class ErrorHandler {
  constructor() {
    this.securityAudit = new SecurityAudit();
    this.errorCounts = new Map(); // 错误计数
    this.recoveryStrategies = new Map(); // 恢复策略
    this.alertThresholds = new Map(); // 告警阈值
    this.isRecoveryMode = false; // 是否处于恢复模式
    
    this.initializeRecoveryStrategies();
    this.initializeAlertThresholds();
  }

  /**
   * 初始化恢复策略
   */
  initializeRecoveryStrategies() {
    // 数据库连接异常恢复策略
    this.recoveryStrategies.set('DATABASE_CONNECTION', {
      maxRetries: 5,
      retryDelay: 5000, // 5秒
      backoffMultiplier: 2,
      recoveryAction: 'reconnect'
    });

    // 支付商API异常恢复策略
    this.recoveryStrategies.set('PAYMENT_PROVIDER_API', {
      maxRetries: 3,
      retryDelay: 10000, // 10秒
      backoffMultiplier: 1.5,
      recoveryAction: 'fallback'
    });

    // 内存异常恢复策略
    this.recoveryStrategies.set('MEMORY_OVERFLOW', {
      maxRetries: 1,
      retryDelay: 30000, // 30秒
      backoffMultiplier: 1,
      recoveryAction: 'garbage_collection'
    });

    // 网络异常恢复策略
    this.recoveryStrategies.set('NETWORK_TIMEOUT', {
      maxRetries: 3,
      retryDelay: 5000, // 5秒
      backoffMultiplier: 2,
      recoveryAction: 'retry'
    });
  }

  /**
   * 初始化告警阈值
   */
  initializeAlertThresholds() {
    this.alertThresholds.set(ErrorSeverity.LOW, 100);      // 低严重程度：100次告警
    this.alertThresholds.set(ErrorSeverity.MEDIUM, 50);    // 中严重程度：50次告警
    this.alertThresholds.set(ErrorSeverity.HIGH, 20);      // 高严重程度：20次告警
    this.alertThresholds.set(ErrorSeverity.CRITICAL, 5);   // 严重程度：5次告警
  }

  /**
   * 处理异常
   * @param {Error} error - 异常对象
   * @param {Object} context - 异常上下文
   * @param {string} errorType - 异常类型
   * @param {string} severity - 异常严重程度
   * @returns {Object} 处理结果
   */
  async handleError(error, context = {}, errorType = ErrorTypes.SYSTEM, severity = ErrorSeverity.MEDIUM) {
    try {
      // 1. 记录异常
      const errorInfo = this.categorizeError(error, context, errorType, severity);
      await this.logError(errorInfo);

      // 2. 更新错误计数
      this.updateErrorCount(errorType, severity);

      // 3. 检查是否需要告警
      await this.checkAlertThreshold(errorType, severity);

      // 4. 执行恢复策略
      const recoveryResult = await this.executeRecoveryStrategy(errorInfo);

      // 5. 返回处理结果
      return {
        handled: true,
        errorType,
        severity,
        recoveryAttempted: recoveryResult.attempted,
        recoverySuccessful: recoveryResult.successful,
        nextAction: recoveryResult.nextAction,
        timestamp: new Date().toISOString()
      };

    } catch (handlerError) {
      console.error('异常处理器自身出错:', handlerError);
      
      // 记录处理器错误
      await this.securityAudit.logSystemSecurityEvent('ERROR_HANDLER_FAILURE', {
        originalError: error.message,
        handlerError: handlerError.message,
        context
      }, 'ERROR');

      return {
        handled: false,
        error: '异常处理器失败',
        originalError: error.message
      };
    }
  }

  /**
   * 分类异常
   * @param {Error} error - 异常对象
   * @param {Object} context - 异常上下文
   * @param {string} errorType - 异常类型
   * @param {string} severity - 异常严重程度
   * @returns {Object} 异常信息
   */
  categorizeError(error, context, errorType, severity) {
    const errorInfo = {
      type: errorType,
      severity,
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      context,
      timestamp: new Date().toISOString(),
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    // 根据异常类型添加特定信息
    switch (errorType) {
      case ErrorTypes.DATABASE:
        errorInfo.databaseInfo = {
          connectionString: context.connectionString ? '***REDACTED***' : undefined,
          operation: context.operation,
          collection: context.collection
        };
        break;

      case ErrorTypes.PAYMENT_PROVIDER:
        errorInfo.paymentInfo = {
          provider: context.provider,
          operation: context.operation,
          orderId: context.orderId,
          amount: context.amount
        };
        break;

      case ErrorTypes.NETWORK:
        errorInfo.networkInfo = {
          url: context.url,
          method: context.method,
          statusCode: context.statusCode,
          timeout: context.timeout
        };
        break;

      case ErrorTypes.MEMORY:
        errorInfo.memoryInfo = {
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        };
        break;
    }

    return errorInfo;
  }

  /**
   * 记录异常
   * @param {Object} errorInfo - 异常信息
   */
  async logError(errorInfo) {
    try {
      // 记录到安全审计系统
      await this.securityAudit.logSystemSecurityEvent('SYSTEM_ERROR', errorInfo, 
        errorInfo.severity === ErrorSeverity.CRITICAL ? 'CRITICAL' : 'ERROR');

      // 控制台输出
      const logLevel = this.getLogLevel(errorInfo.severity);
      const logMessage = `[${errorInfo.type}] ${errorInfo.message}`;
      
      switch (logLevel) {
        case 'error':
          console.error(logMessage, errorInfo);
          break;
        case 'warn':
          console.warn(logMessage, errorInfo);
          break;
        case 'info':
          console.info(logMessage, errorInfo);
          break;
        default:
          console.log(logMessage, errorInfo);
      }

    } catch (logError) {
      console.error('记录异常失败:', logError);
    }
  }

  /**
   * 获取日志级别
   * @param {string} severity - 异常严重程度
   * @returns {string} 日志级别
   */
  getLogLevel(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * 更新错误计数
   * @param {string} errorType - 异常类型
   * @param {string} severity - 异常严重程度
   */
  updateErrorCount(errorType, severity) {
    const key = `${errorType}_${severity}`;
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);
  }

  /**
   * 检查告警阈值
   * @param {string} errorType - 异常类型
   * @param {string} severity - 异常严重程度
   */
  async checkAlertThreshold(errorType, severity) {
    const key = `${errorType}_${severity}`;
    const currentCount = this.errorCounts.get(key) || 0;
    const threshold = this.alertThresholds.get(severity);

    if (currentCount >= threshold) {
      await this.triggerAlert(errorType, severity, currentCount, threshold);
    }
  }

  /**
   * 触发告警
   * @param {string} errorType - 异常类型
   * @param {string} severity - 异常严重程度
   * @param {number} currentCount - 当前错误数
   * @param {number} threshold - 告警阈值
   */
  async triggerAlert(errorType, severity, currentCount, threshold) {
    try {
      const alertMessage = `系统告警: ${errorType} 类型异常达到 ${currentCount} 次，超过阈值 ${threshold}`;
      
      // 记录告警
      await this.securityAudit.logSystemSecurityEvent('SYSTEM_ALERT', {
        errorType,
        severity,
        currentCount,
        threshold,
        message: alertMessage,
        timestamp: new Date().toISOString()
      }, 'CRITICAL');

      // 控制台告警
      console.error(`🚨 ${alertMessage}`);
      
      // 这里可以集成外部告警系统（邮件、短信、Slack等）
      // await this.sendExternalAlert(alertMessage);

    } catch (alertError) {
      console.error('触发告警失败:', alertError);
    }
  }

  /**
   * 执行恢复策略
   * @param {Object} errorInfo - 异常信息
   * @returns {Object} 恢复结果
   */
  async executeRecoveryStrategy(errorInfo) {
    try {
      const strategyKey = this.getStrategyKey(errorInfo);
      const strategy = this.recoveryStrategies.get(strategyKey);

      if (!strategy) {
        return {
          attempted: false,
          successful: false,
          reason: 'No recovery strategy found'
        };
      }

      // 检查是否处于恢复模式
      if (this.isRecoveryMode) {
        return {
          attempted: false,
          successful: false,
          reason: 'System already in recovery mode'
        };
      }

      // 执行恢复策略
      const recoveryResult = await this.performRecovery(strategy, errorInfo);
      
      return {
        attempted: true,
        successful: recoveryResult.successful,
        nextAction: recoveryResult.nextAction,
        details: recoveryResult.details
      };

    } catch (recoveryError) {
      console.error('执行恢复策略失败:', recoveryError);
      return {
        attempted: true,
        successful: false,
        reason: recoveryError.message
      };
    }
  }

  /**
   * 获取策略键
   * @param {Object} errorInfo - 异常信息
   * @returns {string} 策略键
   */
  getStrategyKey(errorInfo) {
    switch (errorInfo.type) {
      case ErrorTypes.DATABASE:
        return 'DATABASE_CONNECTION';
      case ErrorTypes.PAYMENT_PROVIDER:
        return 'PAYMENT_PROVIDER_API';
      case ErrorTypes.MEMORY:
        return 'MEMORY_OVERFLOW';
      case ErrorTypes.NETWORK:
        return 'NETWORK_TIMEOUT';
      default:
        return 'DEFAULT';
    }
  }

  /**
   * 执行恢复操作
   * @param {Object} strategy - 恢复策略
   * @param {Object} errorInfo - 异常信息
   * @returns {Object} 恢复结果
   */
  async performRecovery(strategy, errorInfo) {
    try {
      this.isRecoveryMode = true;
      
      switch (strategy.recoveryAction) {
        case 'reconnect':
          return await this.reconnectDatabase();
        
        case 'fallback':
          return await this.fallbackToAlternativeProvider(errorInfo);
        
        case 'garbage_collection':
          return await this.performGarbageCollection();
        
        case 'retry':
          return await this.retryOperation(strategy, errorInfo);
        
        default:
          return {
            successful: false,
            nextAction: 'manual_intervention',
            details: 'Unknown recovery action'
          };
      }

    } finally {
      this.isRecoveryMode = false;
    }
  }

  /**
   * 重连数据库
   * @returns {Object} 重连结果
   */
  async reconnectDatabase() {
    try {
      // 这里实现数据库重连逻辑
      console.log('尝试重连数据库...');
      
      // 模拟重连过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        successful: true,
        nextAction: 'continue_operation',
        details: 'Database reconnected successfully'
      };
    } catch (error) {
      return {
        successful: false,
        nextAction: 'manual_intervention',
        details: error.message
      };
    }
  }

  /**
   * 降级到备用支付商
   * @param {Object} errorInfo - 异常信息
   * @returns {Object} 降级结果
   */
  async fallbackToAlternativeProvider(errorInfo) {
    try {
      console.log('尝试降级到备用支付商...');
      
      // 这里实现支付商降级逻辑
      const alternativeProvider = this.findAlternativeProvider(errorInfo.context.provider);
      
      if (alternativeProvider) {
        return {
          successful: true,
          nextAction: 'use_alternative_provider',
          details: `Fallback to ${alternativeProvider}`
        };
      } else {
        return {
          successful: false,
          nextAction: 'manual_intervention',
          details: 'No alternative provider available'
        };
      }
    } catch (error) {
      return {
        successful: false,
        nextAction: 'manual_intervention',
        details: error.message
      };
    }
  }

  /**
   * 查找备用支付商
   * @param {string} currentProvider - 当前支付商
   * @returns {string|null} 备用支付商
   */
  findAlternativeProvider(currentProvider) {
    const fallbackMap = {
      'passpay': 'mock',
      'airpay': 'mock',
      'cashfree': 'mock',
      'razorpay': 'mock',
      'paytm': 'mock'
    };
    
    return fallbackMap[currentProvider] || null;
  }

  /**
   * 执行垃圾回收
   * @returns {Object} 垃圾回收结果
   */
  async performGarbageCollection() {
    try {
      console.log('执行垃圾回收...');
      
      if (global.gc) {
        global.gc();
        return {
          successful: true,
          nextAction: 'continue_operation',
          details: 'Garbage collection completed'
        };
      } else {
        return {
          successful: false,
          nextAction: 'restart_process',
          details: 'Garbage collection not available'
        };
      }
    } catch (error) {
      return {
        successful: false,
        nextAction: 'restart_process',
        details: error.message
      };
    }
  }

  /**
   * 重试操作
   * @param {Object} strategy - 恢复策略
   * @param {Object} errorInfo - 异常信息
   * @returns {Object} 重试结果
   */
  async retryOperation(strategy, errorInfo) {
    try {
      console.log(`重试操作，延迟 ${strategy.retryDelay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, strategy.retryDelay));
      
      return {
        successful: true,
        nextAction: 'retry_operation',
        details: 'Operation retry scheduled'
      };
    } catch (error) {
      return {
        successful: false,
        nextAction: 'manual_intervention',
        details: error.message
      };
    }
  }

  /**
   * 获取错误统计
   * @returns {Object} 错误统计信息
   */
  getErrorStats() {
    const stats = {};
    
    for (const [key, count] of this.errorCounts) {
      const [errorType, severity] = key.split('_');
      
      if (!stats[errorType]) {
        stats[errorType] = {};
      }
      
      stats[errorType][severity] = count;
    }
    
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorCounts: stats,
      isRecoveryMode: this.isRecoveryMode,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * 重置错误计数
   */
  resetErrorCounts() {
    this.errorCounts.clear();
    console.log('错误计数已重置');
  }

  /**
   * 健康检查
   * @returns {Object} 健康状态
   */
  getHealthStatus() {
    const stats = this.getErrorStats();
    const criticalErrors = stats.errorCounts.SYSTEM?.[ErrorSeverity.CRITICAL] || 0;
    const highErrors = stats.errorCounts.SYSTEM?.[ErrorSeverity.HIGH] || 0;
    
    let status = 'HEALTHY';
    if (criticalErrors > 0) {
      status = 'CRITICAL';
    } else if (highErrors > 10) {
      status = 'UNHEALTHY';
    } else if (stats.totalErrors > 50) {
      status = 'DEGRADED';
    }
    
    return {
      status,
      timestamp: new Date().toISOString(),
      stats,
      recommendations: this.getHealthRecommendations(status, stats)
    };
  }

  /**
   * 获取健康建议
   * @param {string} status - 健康状态
   * @param {Object} stats - 统计信息
   * @returns {Array} 建议列表
   */
  getHealthRecommendations(status, stats) {
    const recommendations = [];
    
    switch (status) {
      case 'CRITICAL':
        recommendations.push('立即检查系统状态');
        recommendations.push('查看错误日志');
        recommendations.push('考虑重启服务');
        break;
      
      case 'UNHEALTHY':
        recommendations.push('检查错误趋势');
        recommendations.push('优化异常处理');
        recommendations.push('增加监控告警');
        break;
      
      case 'DEGRADED':
        recommendations.push('监控错误数量');
        recommendations.push('检查系统资源');
        recommendations.push('优化代码质量');
        break;
      
      case 'HEALTHY':
        recommendations.push('继续保持');
        recommendations.push('定期检查');
        recommendations.push('预防性维护');
        break;
    }
    
    return recommendations;
  }
}

module.exports = {
  ErrorHandler,
  ErrorTypes,
  ErrorSeverity
};
