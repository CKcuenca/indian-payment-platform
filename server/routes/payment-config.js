const express = require('express');
const router = express.Router();
const paymentConfigController = require('../controllers/payment-config-controller');
const jwt = require('jsonwebtoken');

// JWT认证中间件（支持管理员）
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '访问令牌缺失'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: '访问令牌无效'
      });
    }
    req.user = user;
    next();
  });
};

// 获取所有支付配置
router.get('/', authenticateToken, paymentConfigController.getAllConfigs);

// 获取支付统计
router.get('/stats/summary', authenticateToken, paymentConfigController.getPaymentStats);

// 更新支付统计
router.post('/stats/update', authenticateToken, paymentConfigController.updatePaymentStats);

// 重置额度
router.post('/reset/:type', authenticateToken, paymentConfigController.resetLimits);

// 获取单个支付配置
router.get('/:id', authenticateToken, paymentConfigController.getConfigById);

// 创建支付配置
router.post('/', authenticateToken, paymentConfigController.createConfig);

// 更新支付配置
router.put('/:id', authenticateToken, paymentConfigController.updateConfig);

// 删除支付配置
router.delete('/:id', authenticateToken, paymentConfigController.deleteConfig);

// 更新额度使用
router.post('/:id/usage', authenticateToken, paymentConfigController.updateUsage);

module.exports = router;
