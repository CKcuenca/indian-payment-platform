const express = require('express');
const router = express.Router();
const PaymentStatusSyncService = require('../services/payment-status-sync');
const { apiKeyAuth } = require('../middleware/auth');

// 创建状态同步服务实例
const statusSyncService = new PaymentStatusSyncService();

/**
 * 启动状态同步服务
 */
router.post('/start', apiKeyAuth, async (req, res) => {
  try {
    statusSyncService.start();
    
    res.json({
      success: true,
      message: '支付状态同步服务已启动',
      data: statusSyncService.getStatus()
    });
  } catch (error) {
    console.error('启动状态同步服务失败:', error);
    res.status(500).json({
      success: false,
      error: '启动状态同步服务失败'
    });
  }
});

/**
 * 停止状态同步服务
 */
router.post('/stop', apiKeyAuth, async (req, res) => {
  try {
    statusSyncService.stop();
    
    res.json({
      success: true,
      message: '支付状态同步服务已停止',
      data: statusSyncService.getStatus()
    });
  } catch (error) {
    console.error('停止状态同步服务失败:', error);
    res.status(500).json({
      success: false,
      error: '停止状态同步服务失败'
    });
  }
});

/**
 * 紧急停止状态同步服务
 */
router.post('/emergency-stop', apiKeyAuth, async (req, res) => {
  try {
    statusSyncService.emergencyStop();
    
    res.json({
      success: true,
      message: '支付状态同步服务已紧急停止',
      data: statusSyncService.getStatus()
    });
  } catch (error) {
    console.error('紧急停止状态同步服务失败:', error);
    res.status(500).json({
      success: false,
      error: '紧急停止状态同步服务失败'
    });
  }
});

/**
 * 获取同步服务状态
 */
router.get('/status', apiKeyAuth, async (req, res) => {
  try {
    const status = statusSyncService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取同步服务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取同步服务状态失败'
    });
  }
});

/**
 * 手动同步指定订单
 */
router.post('/sync-order/:orderId', apiKeyAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await statusSyncService.syncSpecificOrder(orderId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: { orderId }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('手动同步订单失败:', error);
    res.status(500).json({
      success: false,
      error: '手动同步订单失败'
    });
  }
});

/**
 * 手动执行一次完整同步
 */
router.post('/sync-all', apiKeyAuth, async (req, res) => {
  try {
    // 异步执行同步，不等待完成
    statusSyncService.syncPendingOrders();
    
    res.json({
      success: true,
      message: '已触发订单状态同步，请稍后查看结果',
      data: {
        syncStarted: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('触发订单状态同步失败:', error);
    res.status(500).json({
      success: false,
      error: '触发订单状态同步失败'
    });
  }
});

/**
 * 获取同步统计信息
 */
router.get('/stats', apiKeyAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // 统计各状态订单数量
    const Order = require('../models/order');
    const statusStats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // 统计同步失败的订单
    const syncFailedOrders = await Order.find({
      status: 'SYNC_FAILED',
      ...query
    }).select('orderId amount provider createdAt updatedAt');

    res.json({
      success: true,
      data: {
        statusStats,
        syncFailedOrders,
        period: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('获取同步统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取同步统计信息失败'
    });
  }
});

/**
 * 重置同步失败订单
 */
router.post('/reset-failed-orders', apiKeyAuth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '必须提供订单ID数组'
      });
    }

    const Order = require('../models/order');
    
    // 重置订单状态为PENDING
    const result = await Order.updateMany(
      { 
        orderId: { $in: orderIds },
        status: 'SYNC_FAILED'
      },
      {
        status: 'PENDING',
        updatedAt: new Date(),
        $unset: { 'paymentDetails.syncError': 1 }
      }
    );

    // 清理重试记录
    orderIds.forEach(orderId => {
      statusSyncService.retryAttempts.delete(orderId);
    });

    res.json({
      success: true,
      message: `已重置 ${result.modifiedCount} 个同步失败的订单`,
      data: {
        modifiedCount: result.modifiedCount,
        orderIds
      }
    });
  } catch (error) {
    console.error('重置同步失败订单失败:', error);
    res.status(500).json({
      success: false,
      error: '重置同步失败订单失败'
    });
  }
});

/**
 * 配置同步服务参数
 */
router.put('/config', apiKeyAuth, async (req, res) => {
  try {
    const { maxRetryAttempts, retryDelay, syncInterval } = req.body;
    
    if (maxRetryAttempts !== undefined) {
      statusSyncService.maxRetryAttempts = Math.max(1, Math.min(10, maxRetryAttempts));
    }
    
    if (retryDelay !== undefined) {
      statusSyncService.retryDelay = Math.max(1 * 60 * 1000, Math.min(60 * 60 * 1000, retryDelay));
    }
    
    res.json({
      success: true,
      message: '同步服务配置已更新',
      data: {
        maxRetryAttempts: statusSyncService.maxRetryAttempts,
        retryDelay: statusSyncService.retryDelay,
        syncInterval: statusSyncService.syncInterval
      }
    });
  } catch (error) {
    console.error('更新同步服务配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新同步服务配置失败'
    });
  }
});

/**
 * 查询过期订单
 */
router.get('/expired-orders', apiKeyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = {
      status: { $in: ['PENDING', 'PROCESSING'] },
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    };
    
    if (status === 'handled') {
      query.expiredHandled = true;
    } else if (status === 'unhandled') {
      query.expiredHandled = { $ne: true };
    }
    
    // 查询过期订单
    const Order = require('../models/order');
    const expiredOrders = await Order.find(query)
      .populate('paymentConfig', 'provider.name accountId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // 统计总数
    const total = await Order.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        orders: expiredOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('查询过期订单失败:', error);
    res.status(500).json({
      success: false,
      error: '查询过期订单失败'
    });
  }
});

/**
 * 手动处理过期订单
 */
router.post('/process-expired', apiKeyAuth, async (req, res) => {
  try {
    await statusSyncService.handleExpiredOrders();
    
    res.json({
      success: true,
      message: '过期订单处理完成',
      data: statusSyncService.getStatus()
    });
  } catch (error) {
    console.error('手动处理过期订单失败:', error);
    res.status(500).json({
      success: false,
      error: '手动处理过期订单失败'
    });
  }
});

module.exports = router;
