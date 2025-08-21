const express = require('express');
const router = express.Router();

// 调试路由 - 不需要认证
router.get('/merchants', async (req, res) => {
  try {
    const Merchant = require('../models/merchant');
    const merchants = await Merchant.find({}).select('name merchantId apiKey status createdAt');
    
    res.json({
      success: true,
      data: {
        total: merchants.length,
        merchants: merchants.map(m => ({
          name: m.name,
          merchantId: m.merchantId,
          apiKey: m.apiKey,
          status: m.status,
          createdAt: m.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/test-api-key', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing API key'
      });
    }
    
    const Merchant = require('../models/merchant');
    const merchant = await Merchant.findOne({ apiKey: apiKey });
    
    if (!merchant) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        providedKey: apiKey
      });
    }
    
    res.json({
      success: true,
      data: {
        name: merchant.name,
        merchantId: merchant.merchantId,
        status: merchant.status,
        permissions: merchant.permissions
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    }
  });
});

module.exports = router;
