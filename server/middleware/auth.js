const jwt = require('jsonwebtoken');
const Merchant = require('../models/merchant');

/**
 * 商户认证中间件
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // 验证JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找商户
    const merchant = await Merchant.findOne({ 
      merchantId: decoded.merchantId, 
      status: 'ACTIVE' 
    });
    
    if (!merchant) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * API Key认证中间件
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    console.log('API Key received:', apiKey);
    console.log('All headers:', req.headers);
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // 查找商户
    const merchant = await Merchant.findOne({ 
      apiKey: apiKey, 
      status: 'ACTIVE' 
    });
    
    console.log('Merchant found:', merchant ? {name: merchant.name, apiKey: merchant.apiKey, status: merchant.status} : 'Not found');
    
    if (!merchant) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  authMiddleware,
  apiKeyAuth
};
