const express = require('express');
const { body, param, query } = require('express-validator');
const { apiKeyAuth } = require('../middleware/auth');
const PaymentStateManager = require('../services/payment-state-manager');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();
const paymentStateManager = new PaymentStateManager();

/**
 * 更新支付状态
 * POST /api/payment-state/:orderId/status
 */
router.post('/:orderId/status', [
  apiKeyAuth,
  param('orderId').isString().notEmpty().withMessage('Order ID is required'),
  body('status').isIn([
    'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED',
    'TIMEOUT', 'PARTIAL_SUCCESS', 'REFUNDED', 'PARTIAL_REFUNDED',
    'DISPUTED', 'DISPUTE_RESOLVED', 'RISK_BLOCKED', 'MANUAL_REVIEW',
    'REVERSED', 'EXPIRED'
  ]).withMessage('Invalid status'),
  body('additionalData').optional().isObject().withMessage('Additional data must be an object'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('executedBy').optional().isString().withMessage('Executed by must be a string'),
  validateRequest
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, additionalData = {}, reason, executedBy } = req.body;
    const merchant = req.merchant;

    // 构建更新数据
    const updateData = { ...additionalData };
    if (reason) {
      updateData.reason = reason;
    }

    // 更新支付状态
    const result = await paymentStateManager.updatePaymentStatus(
      orderId, 
      status, 
      updateData, 
      { executedBy: executedBy || merchant.merchantId }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        operationId: result.operationId
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        orderId,
        newStatus: status,
        operationId: result.operationId,
        order: result.order
      }
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status',
      message: error.message
    });
  }
});

/**
 * 批量更新支付状态
 * POST /api/payment-state/batch-status
 */
router.post('/batch-status', [
  apiKeyAuth,
  body('updates').isArray({ min: 1, max: 100 }).withMessage('Updates must be an array with 1-100 items'),
  body('updates.*.orderId').isString().notEmpty().withMessage('Order ID is required'),
  body('updates.*.status').isIn([
    'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED',
    'TIMEOUT', 'PARTIAL_SUCCESS', 'REFUNDED', 'PARTIAL_REFUNDED',
    'DISPUTED', 'DISPUTE_RESOLVED', 'RISK_BLOCKED', 'MANUAL_REVIEW',
    'REVERSED', 'EXPIRED'
  ]).withMessage('Invalid status'),
  body('updates.*.additionalData').optional().isObject().withMessage('Additional data must be an object'),
  body('executedBy').optional().isString().withMessage('Executed by must be a string'),
  validateRequest
], async (req, res) => {
  try {
    const { updates, executedBy } = req.body;
    const merchant = req.merchant;

    // 批量更新支付状态
    const results = await paymentStateManager.batchUpdatePaymentStatus(
      updates, 
      { executedBy: executedBy || merchant.merchantId }
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Batch update completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }
    });

  } catch (error) {
    console.error('Error in batch status update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch status update',
      message: error.message
    });
  }
});

/**
 * 获取订单状态历史
 * GET /api/payment-state/:orderId/history
 */
router.get('/:orderId/history', [
  apiKeyAuth,
  param('orderId').isString().notEmpty().withMessage('Order ID is required'),
  validateRequest
], async (req, res) => {
  try {
    const { orderId } = req.params;

    const history = await paymentStateManager.getOrderStatusHistory(orderId);

    if (!history.success) {
      return res.status(404).json({
        success: false,
        error: history.error
      });
    }

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error getting order status history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get order status history',
      message: error.message
    });
  }
});

/**
 * 验证状态转换
 * POST /api/payment-state/:orderId/validate-transition
 */
router.post('/:orderId/validate-transition', [
  apiKeyAuth,
  param('orderId').isString().notEmpty().withMessage('Order ID is required'),
  body('targetStatus').isIn([
    'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED',
    'TIMEOUT', 'PARTIAL_SUCCESS', 'REFUNDED', 'PARTIAL_REFUNDED',
    'DISPUTED', 'DISPUTE_RESOLVED', 'RISK_BLOCKED', 'MANUAL_REVIEW',
    'REVERSED', 'EXPIRED'
  ]).withMessage('Invalid target status'),
  validateRequest
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const { targetStatus } = req.body;

    // 获取当前订单
    const order = await mongoose.model('Order').findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // 验证状态转换
    const validation = paymentStateManager.validateStateTransition(
      order.status, 
      targetStatus, 
      order
    );

    res.json({
      success: true,
      data: {
        orderId,
        currentStatus: order.status,
        targetStatus,
        isValid: validation.valid,
        reason: validation.reason,
        allowedTransitions: PaymentStateManager.STATE_MACHINE[order.status]?.allowedTransitions || []
      }
    });

  } catch (error) {
    console.error('Error validating status transition:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate status transition',
      message: error.message
    });
  }
});

/**
 * 获取状态机信息
 * GET /api/payment-state/state-machine
 */
router.get('/state-machine', [
  apiKeyAuth
], async (req, res) => {
  try {
    const stateMachine = PaymentStateManager.STATE_MACHINE;
    
    // 构建状态机信息
    const stateInfo = Object.keys(stateMachine).map(status => ({
      status,
      allowedTransitions: stateMachine[status].allowedTransitions,
      description: getStatusDescription(status)
    }));

    res.json({
      success: true,
      data: {
        states: stateInfo,
        totalStates: stateInfo.length
      }
    });

  } catch (error) {
    console.error('Error getting state machine info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get state machine info',
      message: error.message
    });
  }
});

/**
 * 清理过期的锁
 * POST /api/payment-state/cleanup-locks
 */
router.post('/cleanup-locks', [
  apiKeyAuth
], async (req, res) => {
  try {
    const result = await paymentStateManager.cleanupExpiredLocks();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Cleaned up ${result.cleanedCount} expired locks`,
      data: result
    });

  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired locks',
      message: error.message
    });
  }
});

/**
 * 获取状态描述
 */
function getStatusDescription(status) {
  const descriptions = {
    PENDING: '订单已创建，等待用户支付',
    PROCESSING: '用户已支付，正在处理',
    SUCCESS: '支付成功，资金已到账',
    FAILED: '支付失败',
    CANCELLED: '用户或系统取消',
    TIMEOUT: '支付超时',
    PARTIAL_SUCCESS: '部分成功，部分金额到账',
    REFUNDED: '订单已退款',
    PARTIAL_REFUNDED: '部分退款，部分金额已退款',
    DISPUTED: '订单存在争议',
    DISPUTE_RESOLVED: '争议处理完成',
    RISK_BLOCKED: '被风控系统拦截',
    MANUAL_REVIEW: '需要人工审核',
    REVERSED: '交易被冲正',
    EXPIRED: '订单已过期'
  };
  
  return descriptions[status] || '未知状态';
}

module.exports = router;
