const express = require('express');
const router = express.Router();
const paymentConfigController = require('../controllers/payment-config-controller');

// 获取所有支付配置
router.get('/', paymentConfigController.getAllConfigs);

// 获取支付统计
router.get('/stats/summary', paymentConfigController.getPaymentStats);

// 更新支付统计
router.post('/stats/update', paymentConfigController.updatePaymentStats);

// 重置额度
router.post('/reset/:type', paymentConfigController.resetLimits);

// 获取单个支付配置
router.get('/:id', paymentConfigController.getConfigById);

// 创建支付配置
router.post('/', paymentConfigController.createConfig);

// 更新支付配置
router.put('/:id', paymentConfigController.updateConfig);

// 删除支付配置
router.delete('/:id', paymentConfigController.deleteConfig);

// 更新额度使用
router.post('/:id/usage', paymentConfigController.updateUsage);

module.exports = router;
