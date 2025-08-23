const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const PassPaySyncService = require('../services/passpay-sync-service');

// 创建同步服务实例
const passpaySyncService = new PassPaySyncService();

/**
 * 手动同步指定订单
 * POST /api/passpay-sync/sync-order
 * 参数: appid, orderid, sign
 */
router.post('/sync-order', mgAuthMiddleware, async (req, res) => {
  try {
    const { orderid } = req.verifiedParams;
    
    if (!orderid) {
      return res.json(errorResponse(400, '缺少必要参数：orderid'));
    }
    
    // 执行手动同步
    const result = await passpaySyncService.syncSpecificOrder(orderid);
    
    if (result.success) {
      res.json(successResponse({
        orderid,
        message: result.message
      }, '订单同步成功'));
    } else {
      res.json(errorResponse(500, `订单同步失败: ${result.error}`));
    }
    
  } catch (error) {
    console.error('手动同步订单失败:', error);
    res.json(errorResponse(500, '订单同步失败'));
  }
});

/**
 * 获取同步服务状态
 * POST /api/passpay-sync/status
 * 参数: appid, sign
 */
router.post('/status', mgAuthMiddleware, async (req, res) => {
  try {
    const status = passpaySyncService.getStatus();
    
    res.json(successResponse({
      is_running: status.isRunning,
      sync_interval_seconds: status.syncInterval / 1000,
      last_sync: status.lastSync
    }, '获取同步服务状态成功'));
    
  } catch (error) {
    console.error('获取同步服务状态失败:', error);
    res.json(errorResponse(500, '获取状态失败'));
  }
});

/**
 * 启动同步服务
 * POST /api/passpay-sync/start
 * 参数: appid, sign
 */
router.post('/start', mgAuthMiddleware, async (req, res) => {
  try {
    passpaySyncService.start();
    
    res.json(successResponse({
      message: '同步服务已启动'
    }, '同步服务启动成功'));
    
  } catch (error) {
    console.error('启动同步服务失败:', error);
    res.json(errorResponse(500, '启动服务失败'));
  }
});

/**
 * 停止同步服务
 * POST /api/passpay-sync/stop
 * 参数: appid, sign
 */
router.post('/stop', mgAuthMiddleware, async (req, res) => {
  try {
    passpaySyncService.stop();
    
    res.json(successResponse({
      message: '同步服务已停止'
    }, '同步服务停止成功'));
    
  } catch (error) {
    console.error('停止同步服务失败:', error);
    res.json(errorResponse(500, '停止服务失败'));
  }
});

/**
 * 立即执行一次同步
 * POST /api/passpay-sync/sync-now
 * 参数: appid, sign
 */
router.post('/sync-now', mgAuthMiddleware, async (req, res) => {
  try {
    // 立即执行同步
    await passpaySyncService.syncAllOrders();
    
    res.json(successResponse({
      message: '立即同步已执行'
    }, '立即同步执行成功'));
    
  } catch (error) {
    console.error('立即同步失败:', error);
    res.json(errorResponse(500, '立即同步失败'));
  }
});

module.exports = router;
