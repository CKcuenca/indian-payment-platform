const SignatureUtil = require('../utils/signature');
const Merchant = require('../models/merchant');

/**
 * 获取客户端真实IP地址
 */
function getClientIP(req) {
  const forwardedIpsStr = req.headers['x-forwarded-for'];
  if (forwardedIpsStr) {
    const forwardedIps = forwardedIpsStr.split(',');
    return forwardedIps[0].trim();
  }
  return req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip ||
         '127.0.0.1';
}

/**
 * MG支付标准认证中间件
 * 验证商户身份和请求签名
 */
const mgAuthMiddleware = async (req, res, next) => {
  try {
    // 获取请求参数
    const { appid, sign, ...otherParams } = req.body;
    
    // 检查必要参数
    if (!appid) {
      return res.status(400).json({
        code: 400,
        message: '缺少商户ID (appid)',
        data: null
      });
    }
    
    if (!sign) {
      return res.status(400).json({
        code: 400,
        message: '缺少签名参数 (sign)',
        data: null
      });
    }
    
    // 查找商户
    const merchant = await Merchant.findOne({ merchantId: appid, status: 'ACTIVE' });
    if (!merchant) {
      return res.status(401).json({
        code: 401,
        message: '商户不存在或未激活',
        data: null
      });
    }
    
    // IP白名单验证
    const clientIP = getClientIP(req);
    const ipValidation = merchant.isIPAllowed(clientIP);
    
    if (!ipValidation.allowed) {
      console.log(`❌ IP白名单验证失败: ${clientIP} - ${ipValidation.reason}`);
      
      // 记录安全事件
      const SecurityAudit = require('../services/security/security-audit');
      const securityAudit = new SecurityAudit();
      await securityAudit.logSecurityEvent('IP_ACCESS_DENIED', {
        merchantId: appid,
        clientIP,
        reason: ipValidation.reason,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      }, 'WARN');
      
      return res.status(403).json({
        code: 403,
        message: 'IP地址不在白名单中',
        data: null
      });
    }
    
    // IP访问成功，保存商户（更新使用统计）
    if (ipValidation.matchedEntry) {
      await merchant.save();
    }
    
    // 验证签名
    const allParams = { appid, ...otherParams };
    console.log('🔍 签名验证调试信息:');
    console.log('接收到的参数:', allParams);
    console.log('商户密钥:', merchant.secretKey);
    console.log('接收到的签名:', sign);
    
    const isValidSignature = SignatureUtil.verifySignature(allParams, merchant.secretKey, sign);
    console.log('签名验证结果:', isValidSignature);
    
    if (!isValidSignature) {
      return res.status(401).json({
        code: 400,
        message: '签名验证失败',
        data: null
      });
    }
    
    // 将商户信息添加到请求对象
    req.merchant = merchant;
    req.verifiedParams = allParams;
    
    next();
  } catch (error) {
    console.error('MG认证中间件错误:', error);
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
};

/**
 * 生成标准响应格式
 */
const createResponse = (code, message, data = null) => {
  return {
    code,
    message,
    data,
    timestamp: Date.now()
  };
};

/**
 * 成功响应
 */
const successResponse = (data, message = '操作成功') => {
  return createResponse(200, message, data);
};

/**
 * 错误响应
 */
const errorResponse = (code, message, data = null) => {
  return createResponse(code, message, data);
};

module.exports = {
  mgAuthMiddleware,
  createResponse,
  successResponse,
  errorResponse
};
