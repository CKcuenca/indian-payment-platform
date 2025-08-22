const mongoose = require('mongoose');
const crypto = require('crypto');
const { getIndianTimeISO } = require('../utils/timeUtils');

/**
 * 支付状态管理器
 * 实现分布式锁、状态机、幂等性和事务一致性
 */
class PaymentStateManager {
  constructor() {
    this.lockTimeout = 30000; // 30秒锁超时
    this.retryAttempts = 3;   // 重试次数
    this.retryDelay = 1000;   // 重试延迟
  }

  /**
   * 支付状态状态机定义
   */
  static STATE_MACHINE = {
    PENDING: {
      allowedTransitions: ['PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT', 'EXPIRED', 'RISK_BLOCKED'],
      canTransition: (order) => true,
      onEnter: async (order, session) => {
        // 设置订单创建时间
        return { createdAt: getIndianTimeISO() };
      }
    },
    PROCESSING: {
      allowedTransitions: ['SUCCESS', 'FAILED', 'PARTIAL_SUCCESS', 'DISPUTED', 'MANUAL_REVIEW', 'TIMEOUT'],
      canTransition: (order) => order.status === 'PENDING',
      onEnter: async (order, session) => {
        // 设置处理开始时间
        return { 
          processingStartedAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    SUCCESS: {
      allowedTransitions: ['REFUNDED', 'PARTIAL_REFUNDED', 'DISPUTED', 'REVERSED'],
      canTransition: (order) => ['PENDING', 'PROCESSING'].includes(order.status),
      onEnter: async (order, session) => {
        // 更新商户余额
        await mongoose.model('Merchant').findOneAndUpdate(
          { merchantId: order.merchantId },
          { 
            $inc: { 
              'balance.available': order.amount,
              'balance.frozen': -order.amount
            },
            $set: { updatedAt: getIndianTimeISO() }
          },
          { session }
        );
        
        return { 
          paidAt: getIndianTimeISO(),
          completedAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    FAILED: {
      allowedTransitions: ['CANCELLED', 'DISPUTED', 'MANUAL_REVIEW'],
      canTransition: (order) => ['PENDING', 'PROCESSING'].includes(order.status),
      onEnter: async (order, session) => {
        // 释放冻结的余额
        if (order.status === 'PROCESSING') {
          await mongoose.model('Merchant').findOneAndUpdate(
            { merchantId: order.merchantId },
            { 
              $inc: { 'balance.frozen': -order.amount },
              $set: { updatedAt: getIndianTimeISO() }
            },
            { session }
          );
        }
        
        return { 
          failedAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    CANCELLED: {
      allowedTransitions: ['DISPUTED'],
      canTransition: (order) => ['PENDING', 'PROCESSING'].includes(order.status),
      onEnter: async (order, session) => {
        // 释放冻结的余额
        if (order.status === 'PROCESSING') {
          await mongoose.model('Merchant').findOneAndUpdate(
            { merchantId: order.merchantId },
            { 
              $inc: { 'balance.frozen': -order.amount },
              $set: { updatedAt: getIndianTimeISO() }
            },
            { session }
          );
        }
        
        return { 
          cancelledAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO() 
        };
      }
    },
    TIMEOUT: {
      allowedTransitions: ['CANCELLED', 'DISPUTED', 'MANUAL_REVIEW'],
      canTransition: (order) => ['PENDING', 'PROCESSING'].includes(order.status),
      onEnter: async (order, session) => {
        // 释放冻结的余额
        if (order.status === 'PROCESSING') {
          await mongoose.model('Merchant').findOneAndUpdate(
            { merchantId: order.merchantId },
            { 
              $inc: { 'balance.frozen': -order.amount },
              $set: { updatedAt: getIndianTimeISO() }
            },
            { session }
          );
        }
        
        return { 
          timeoutAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    EXPIRED: {
      allowedTransitions: ['CANCELLED', 'DISPUTED'],
      canTransition: (order) => ['PENDING', 'PROCESSING'].includes(order.status),
      onEnter: async (order, session) => {
        // 释放冻结的余额
        if (order.status === 'PROCESSING') {
          await mongoose.model('Merchant').findOneAndUpdate(
            { merchantId: order.merchantId },
            { 
              $inc: { 'balance.frozen': -order.amount },
              $set: { updatedAt: getIndianTimeISO() }
            },
            { session }
          );
        }
        
        return { 
          expiredAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    REFUNDED: {
      allowedTransitions: ['DISPUTED'],
      canTransition: (order) => order.status === 'SUCCESS',
      onEnter: async (order, session) => {
        // 扣除商户余额
        await mongoose.model('Merchant').findOneAndUpdate(
          { merchantId: order.merchantId },
          { 
            $inc: { 'balance.available': -order.amount },
            $set: { updatedAt: getIndianTimeISO() }
          },
          { session }
        );
        
        return { 
          refundedAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    DISPUTED: {
      allowedTransitions: ['DISPUTE_RESOLVED', 'REFUNDED', 'PARTIAL_REFUNDED'],
      canTransition: (order) => true,
      onEnter: async (order, session) => {
        return { 
          disputedAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    DISPUTE_RESOLVED: {
      allowedTransitions: ['REFUNDED', 'PARTIAL_REFUNDED'],
      canTransition: (order) => order.status === 'DISPUTED',
      onEnter: async (order, session) => {
        return { 
          disputeResolvedAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    RISK_BLOCKED: {
      allowedTransitions: ['MANUAL_REVIEW', 'CANCELLED', 'DISPUTED'],
      canTransition: (order) => ['PENDING', 'PROCESSING'].includes(order.status),
      onEnter: async (order, session) => {
        return { 
          riskBlockedAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    },
    MANUAL_REVIEW: {
      allowedTransitions: ['SUCCESS', 'FAILED', 'CANCELLED', 'DISPUTED'],
      canTransition: (order) => ['PROCESSING', 'RISK_BLOCKED'].includes(order.status),
      onEnter: async (order, session) => {
        return { 
          manualReviewAt: getIndianTimeISO(),
          statusUpdatedAt: getIndianTimeISO()
        };
      }
    }
  };

  /**
   * 获取分布式锁
   */
  async acquireLock(orderId, operationId) {
    const lockKey = `payment_lock:${orderId}`;
    const lockValue = operationId;
    const lockExpiry = Date.now() + this.lockTimeout;

    try {
      // 尝试获取锁
      const result = await mongoose.connection.db.collection('locks').updateOne(
        { 
          _id: lockKey,
          $or: [
            { expiresAt: { $lt: new Date() } },  // 锁已过期
            { _id: { $exists: false } }           // 锁不存在
          ]
        },
        {
          $set: {
            _id: lockKey,
            operationId: lockValue,
            expiresAt: new Date(lockExpiry),
            acquiredAt: new Date()
          }
        },
        { upsert: true }
      );

      if (result.modifiedCount > 0 || result.upsertedCount > 0) {
        return { success: true, lockKey, lockValue };
      }

      // 检查是否是我们自己的锁
      const existingLock = await mongoose.connection.db.collection('locks').findOne({ _id: lockKey });
      if (existingLock && existingLock.operationId === lockValue) {
        return { success: true, lockKey, lockValue, existing: true };
      }

      return { success: false, reason: 'Lock already acquired by another operation' };
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return { success: false, reason: 'Lock acquisition failed', error: error.message };
    }
  }

  /**
   * 释放分布式锁
   */
  async releaseLock(lockKey, lockValue) {
    try {
      await mongoose.connection.db.collection('locks').deleteOne({
        _id: lockKey,
        operationId: lockValue
      });
      return { success: true };
    } catch (error) {
      console.error('Error releasing lock:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成操作ID（幂等性保证）
   */
  generateOperationId(orderId, newStatus, additionalData = {}) {
    const data = `${orderId}:${newStatus}:${JSON.stringify(additionalData)}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 检查操作是否已经执行过（幂等性检查）
   */
  async isOperationExecuted(orderId, operationId) {
    try {
      const order = await mongoose.model('Order').findOne({ 
        orderId,
        'operations.operationId': operationId
      });
      return !!order;
    } catch (error) {
      console.error('Error checking operation execution:', error);
      return false;
    }
  }

  /**
   * 记录操作执行（幂等性记录）
   */
  async recordOperation(orderId, operationId, operationData) {
    try {
      await mongoose.model('Order').updateOne(
        { orderId },
        {
          $push: {
            operations: {
              operationId,
              ...operationData,
              executedAt: new Date()
            }
          }
        }
      );
      return true;
    } catch (error) {
      console.error('Error recording operation:', error);
      return false;
    }
  }

  /**
   * 验证状态转换
   */
  validateStateTransition(fromStatus, toStatus, order) {
    const stateConfig = PaymentStateManager.STATE_MACHINE[toStatus];
    
    if (!stateConfig) {
      return { valid: false, reason: `Invalid target status: ${toStatus}` };
    }

    if (!stateConfig.allowedTransitions.includes(fromStatus)) {
      return { 
        valid: false, 
        reason: `Cannot transition from ${fromStatus} to ${toStatus}` 
      };
    }

    if (stateConfig.canTransition && !stateConfig.canTransition(order)) {
      return { 
        valid: false, 
        reason: `State transition condition not met for ${toStatus}` 
      };
    }

    return { valid: true };
  }

  /**
   * 更新支付状态（主要方法）
   */
  async updatePaymentStatus(orderId, newStatus, additionalData = {}, options = {}) {
    const operationId = this.generateOperationId(orderId, newStatus, additionalData);
    let lockAcquired = false;
    let lockKey = null;
    let lockValue = null;

    try {
      // 1. 幂等性检查
      if (await this.isOperationExecuted(orderId, operationId)) {
        console.log(`Operation ${operationId} already executed for order ${orderId}`);
        return { 
          success: true, 
          message: 'Operation already executed',
          operationId,
          status: newStatus
        };
      }

      // 2. 获取分布式锁
      const lockResult = await this.acquireLock(orderId, operationId);
      if (!lockResult.success) {
        return { 
          success: false, 
          error: 'Failed to acquire lock',
          reason: lockResult.reason 
        };
      }

      lockAcquired = true;
      lockKey = lockResult.lockKey;
      lockValue = lockResult.lockValue;

      // 3. 获取当前订单状态
      const order = await mongoose.model('Order').findOne({ orderId });
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // 4. 验证状态转换
      const validation = this.validateStateTransition(order.status, newStatus, order);
      if (!validation.valid) {
        throw new Error(`Invalid state transition: ${validation.reason}`);
      }

      // 5. 执行状态转换
      try {
        // 获取状态转换的额外数据
        const stateConfig = PaymentStateManager.STATE_MACHINE[newStatus];
        const stateData = stateConfig.onEnter ? 
          await stateConfig.onEnter(order) : {};

        // 更新订单状态
        const updateData = {
          status: newStatus,
          updatedAt: getIndianTimeISO(),
          ...stateData,
          ...additionalData
        };

        const updatedOrder = await mongoose.model('Order').findOneAndUpdate(
          { orderId },
          updateData,
          { new: true }
        );

        // 更新交易记录
        await mongoose.model('Transaction').findOneAndUpdate(
          { orderId },
          {
            status: newStatus,
            updatedAt: getIndianTimeISO(),
            completedAt: ['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(newStatus) ? 
              getIndianTimeISO() : null
          }
        );

        // 记录操作
        await this.recordOperation(orderId, operationId, {
          fromStatus: order.status,
          toStatus: newStatus,
          additionalData,
          executedBy: options.executedBy || 'system'
        });

        return {
          success: true,
          order: updatedOrder,
          operationId,
          status: newStatus,
          message: `Order status updated from ${order.status} to ${newStatus}`
        };

      } catch (error) {
        console.error('Error during state transition:', error);
        throw error;
      }

    } catch (error) {
      console.error(`Error updating payment status for order ${orderId}:`, error);
      return {
        success: false,
        error: error.message,
        operationId
      };
    } finally {
      // 释放锁
      if (lockAcquired && lockKey && lockValue) {
        await this.releaseLock(lockKey, lockValue);
      }
    }
  }

  /**
   * 批量更新支付状态
   */
  async batchUpdatePaymentStatus(updates, options = {}) {
    const results = [];
    
    for (const update of updates) {
      const { orderId, newStatus, additionalData = {} } = update;
      const result = await this.updatePaymentStatus(orderId, newStatus, additionalData, options);
      results.push({ orderId, ...result });
    }

    return results;
  }

  /**
   * 获取订单状态历史
   */
  async getOrderStatusHistory(orderId) {
    try {
      const order = await mongoose.model('Order').findOne({ orderId });
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      return {
        success: true,
        currentStatus: order.status,
        operations: order.operations || [],
        statusHistory: order.statusHistory || []
      };
    } catch (error) {
      console.error('Error getting order status history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清理过期的锁
   */
  async cleanupExpiredLocks() {
    try {
      const result = await mongoose.connection.db.collection('locks').deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      console.log(`Cleaned up ${result.deletedCount} expired locks`);
      return { success: true, cleanedCount: result.deletedCount };
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentStateManager;
