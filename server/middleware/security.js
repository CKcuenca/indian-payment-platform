const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const SecurityAudit = require('../services/security/security-audit');

// 创建安全审计实例
const securityAudit = new SecurityAudit();

/**
 * 增强的安全中间件配置
 */
const securityMiddleware = {
  /**
   * 基础安全头配置
   */
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }),

  /**
   * IP白名单中间件
   */
  ipWhitelist: (allowedIPs = []) => {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'];
      
      // 如果设置了IP白名单，则验证
      if (allowedIPs.length > 0) {
        if (!allowedIPs.includes(clientIP)) {
          securityAudit.logSuspiciousActivity(req, 'IP_NOT_IN_WHITELIST', { clientIP, allowedIPs });
          return res.status(403).json({
            success: false,
            error: 'Access denied: IP not in whitelist'
          });
        }
      }
      
      next();
    };
  },

  /**
   * 请求签名验证中间件
   */
  signatureValidation: (options = {}) => {
    const {
      requiredFields = [],
      secretKeyField = 'secretKey',
      signatureField = 'sign',
      algorithm = 'sha256',
      timestampField = 'timestamp',
      nonceField = 'nonce'
    } = options;

    return async (req, res, next) => {
      try {
        const params = { ...req.body, ...req.query };
        
        // 检查必需字段
        for (const field of requiredFields) {
          if (!params[field]) {
            await securityAudit.logSignatureValidation(params, false, `缺少必需字段: ${field}`, req);
            return res.status(400).json({
              success: false,
              error: `缺少必需字段: ${field}`,
              code: 'MISSING_REQUIRED_FIELD'
            });
          }
        }

        // 检查签名字段
        if (!params[signatureField]) {
          await securityAudit.logSignatureValidation(params, false, '缺少签名字段', req);
          return res.status(400).json({
            success: false,
            error: '缺少签名字段',
            code: 'MISSING_SIGNATURE'
          });
        }

        // 时间戳验证
        if (timestampField && params[timestampField]) {
          const timestamp = parseInt(params[timestampField]);
          const now = Date.now();
          const tolerance = 5 * 60 * 1000; // 5分钟容差
          
          if (Math.abs(now - timestamp) > tolerance) {
            await securityAudit.logSignatureValidation(params, false, '请求时间戳超出允许范围', req);
            return res.status(400).json({
              success: false,
              error: '请求时间戳超出允许范围',
              code: 'TIMESTAMP_EXPIRED'
            });
          }
        }

        // Nonce验证（防重放攻击）
        if (nonceField && params[nonceField]) {
          // 这里可以实现Redis缓存检查nonce是否已被使用
          // 暂时跳过此检查
        }

        // 获取密钥（从配置或环境变量）
        const secretKey = params[secretKeyField] || process.env.DEFAULT_SECRET_KEY;
        if (!secretKey) {
          await securityAudit.logSignatureValidation(params, false, '无法获取密钥', req);
          return res.status(500).json({
            success: false,
            error: '系统配置错误',
            code: 'CONFIGURATION_ERROR'
          });
        }

        // 验证签名
        const SignatureValidator = require('../services/security/signature-validator');
        const validator = new SignatureValidator();
        
        const validationResult = await validator.validateSignature(
          params,
          secretKey,
          params[signatureField],
          algorithm
        );

        if (!validationResult.valid) {
          await securityAudit.logSignatureValidation(params, false, validationResult.error, req);
          return res.status(400).json({
            success: false,
            error: validationResult.error,
            code: validationResult.code
          });
        }

        // 签名验证成功
        await securityAudit.logSignatureValidation(params, true, null, req);
        next();

      } catch (error) {
        await securityAudit.logSignatureValidation(req.body || req.query, false, error.message, req);
        return res.status(500).json({
          success: false,
          error: '签名验证过程出错',
          code: 'VALIDATION_ERROR'
        });
      }
    };
  },

  /**
   * 增强的限流中间件
   */
  enhancedRateLimit: (options = {}) => {
    const {
      windowMs = 15 * 60 * 1000, // 15分钟
      max = 100, // 最大请求数
      message = '请求过于频繁，请稍后再试',
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = (req) => req.ip,
      handler = (req, res) => {
        securityAudit.logRateLimitExceeded(req, `IP ${req.ip} 超过限流阈值`);
        res.status(429).json({
          success: false,
          error: message,
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }
    } = options;

    return rateLimit({
      windowMs,
      max,
      message,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator,
      handler
    });
  },

  /**
   * 请求大小限制中间件
   */
  requestSizeLimit: (limit = '10mb') => {
    return (req, res, next) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      const maxSize = this.parseSize(limit);
      
      if (contentLength > maxSize) {
        securityAudit.logSuspiciousActivity(req, 'REQUEST_SIZE_EXCEEDED', {
          contentLength,
          maxSize,
          limit
        });
        
        return res.status(413).json({
          success: false,
          error: '请求体过大',
          code: 'REQUEST_TOO_LARGE'
        });
      }
      
      next();
    };
  },

  /**
   * 解析大小字符串为字节数
   */
  parseSize: (sizeStr) => {
    const units = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };
    
    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
    if (match) {
      const [, value, unit] = match;
      return Math.floor(parseFloat(value) * units[unit]);
    }
    
    return parseInt(sizeStr) || 1024 * 1024; // 默认1MB
  },

  /**
   * 安全日志中间件
   */
  securityLogging: () => {
    return (req, res, next) => {
      // 记录请求开始时间
      req.startTime = Date.now();
      
      // 记录请求信息
      const requestInfo = {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      };
      
      // 记录可疑请求
      if (this.isSuspiciousRequest(req)) {
        securityAudit.logSuspiciousActivity(req, 'SUSPICIOUS_REQUEST_PATTERN', requestInfo);
      }
      
      // 响应完成后记录
      res.on('finish', () => {
        const responseTime = Date.now() - req.startTime;
        const responseInfo = {
          ...requestInfo,
          statusCode: res.statusCode,
          responseTime,
          contentLength: res.get('content-length') || 0
        };
        
        // 记录异常响应
        if (res.statusCode >= 400) {
          securityAudit.logSecurityEvent('HTTP_ERROR_RESPONSE', responseInfo, 'WARN');
        }
      });
      
      next();
    };
  },

  /**
   * 判断是否为可疑请求
   */
  isSuspiciousRequest: (req) => {
    const suspiciousPatterns = [
      /\.\.\//, // 路径遍历攻击
      /<script/i, // XSS攻击
      /union\s+select/i, // SQL注入
      /eval\s*\(/i, // 代码注入
      /javascript:/i, // JavaScript协议
      /data:text\/html/i, // 数据URI攻击
    ];
    
    const url = req.url.toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    // 检查URL中的可疑模式
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }
    
    // 检查User-Agent中的可疑模式
    const suspiciousUserAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'scanner',
      'bot',
      'crawler'
    ];
    
    for (const agent of suspiciousUserAgents) {
      if (userAgent.includes(agent)) {
        return true;
      }
    }
    
    return false;
  }
};

module.exports = securityMiddleware;
