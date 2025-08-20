const SignatureUtil = require('../utils/signature');
const Merchant = require('../models/merchant');

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
    
    // 验证签名
    const allParams = { appid, ...otherParams };
    const isValidSignature = SignatureUtil.verifySignature(allParams, merchant.secretKey, sign);
    
    if (!isValidSignature) {
      return res.status(401).json({
        code: 401,
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
