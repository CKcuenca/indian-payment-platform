/**
 * 安全配置文件
 */
module.exports = {
  // 签名验证配置
  signature: {
    // 支持的签名算法
    algorithms: ['md5', 'sha1', 'sha256', 'sha512', 'hmac-sha256'],
    
    // 时间戳容差（毫秒）
    timestampTolerance: 5 * 60 * 1000, // 5分钟
    
    // 默认签名算法
    defaultAlgorithm: 'sha256',
    
    // 密钥配置
    keys: {
      // 默认密钥（环境变量）
      default: process.env.DEFAULT_SECRET_KEY || 'your-default-secret-key',
      
      // PassPay密钥（环境变量）
      passpay: process.env.PASSPAY_SECRET_KEY || 'your-passpay-secret-key',
      
      // 其他支付商密钥
      airpay: process.env.AIRPAY_SECRET_KEY || 'your-airpay-secret-key',
      cashfree: process.env.CASHFREE_SECRET_KEY || 'your-cashfree-secret-key',
      razorpay: process.env.RAZORPAY_SECRET_KEY || 'your-razorpay-secret-key',
      paytm: process.env.PAYTM_SECRET_KEY || 'your-paytm-secret-key'
    }
  },

  // 限流配置
  rateLimit: {
    // 全局限流
    global: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 最大请求数
      message: '请求过于频繁，请稍后再试'
    },
    
    // API限流
    api: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 200, // 最大请求数
      message: 'API请求过于频繁，请稍后再试'
    },
    
    // 认证限流
    auth: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 5, // 最大登录尝试次数
      message: '登录尝试次数过多，请稍后再试'
    },
    
    // Webhook限流
    webhook: {
      windowMs: 1 * 60 * 1000, // 1分钟
      max: 30, // 最大回调次数
      message: 'Webhook回调过于频繁'
    }
  },

  // IP白名单配置
  ipWhitelist: {
    // 是否启用IP白名单
    enabled: process.env.ENABLE_IP_WHITELIST === 'true',
    
    // 允许的IP地址
    allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [],
    
    // 支付商IP白名单
    providers: {
      passpay: process.env.PASSPAY_WHITELIST_IPS ? process.env.PASSPAY_WHITELIST_IPS.split(',') : [],
      airpay: process.env.AIRPAY_WHITELIST_IPS ? process.env.AIRPAY_WHITELIST_IPS.split(',') : [],
      cashfree: process.env.CASHFREE_WHITELIST_IPS ? process.env.CASHFREE_WHITELIST_IPS.split(',') : [],
      razorpay: process.env.RAZORPAY_WHITELIST_IPS ? process.env.RAZORPAY_WHITELIST_IPS.split(',') : [],
      paytm: process.env.PAYTM_WHITELIST_IPS ? process.env.PAYTM_WHITELIST_IPS.split(',') : []
    }
  },

  // 请求大小限制
  requestSize: {
    // 默认限制
    default: '10mb',
    
    // 文件上传限制
    fileUpload: '50mb',
    
    // Webhook回调限制
    webhook: '5mb'
  },

  // 安全头配置
  headers: {
    // 内容安全策略
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
    
    // HSTS配置
    hsts: {
      maxAge: 31536000, // 1年
      includeSubDomains: true,
      preload: true
    },
    
    // 引用策略
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  },

  // 日志配置
  logging: {
    // 安全日志
    security: {
      enabled: true,
      level: process.env.SECURITY_LOG_LEVEL || 'INFO',
      maxSize: '10mb',
      maxFiles: 5,
      directory: 'logs/security'
    },
    
    // 审计日志
    audit: {
      enabled: true,
      level: process.env.AUDIT_LOG_LEVEL || 'INFO',
      maxSize: '10mb',
      maxFiles: 10,
      directory: 'logs/audit'
    }
  },

  // 加密配置
  encryption: {
    // JWT密钥
    jwt: {
      secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
      expiresIn: '24h',
      refreshExpiresIn: '7d'
    },
    
    // 密码加密
    password: {
      saltRounds: 12,
      algorithm: 'bcrypt'
    }
  },

  // 会话配置
  session: {
    // 会话密钥
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    
    // 会话超时
    timeout: 24 * 60 * 60 * 1000, // 24小时
    
    // 是否启用安全cookie
    secure: process.env.NODE_ENV === 'production',
    
    // 是否启用httpOnly
    httpOnly: true
  },

  // 环境特定配置
  environment: {
    development: {
      enableSecurityLogs: true,
      enableIPWhitelist: false,
      enableRateLimit: true,
      enableHTTPS: false
    },
    
    production: {
      enableSecurityLogs: true,
      enableIPWhitelist: true,
      enableRateLimit: true,
      enableHTTPS: true
    },
    
    test: {
      enableSecurityLogs: false,
      enableIPWhitelist: false,
      enableRateLimit: false,
      enableHTTPS: false
    }
  }
};
