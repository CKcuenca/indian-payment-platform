const mongoose = require('mongoose');
const { getIndianTimeISO } = require('../utils/timeUtils');

class OrderStatusService {
  /**
   * 订单状态转换规则
   */
  static STATUS_TRANSITIONS = {
    PENDING: ['PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT', 'EXPIRED', 'RISK_BLOCKED'],
    PROCESSING: ['SUCCESS', 'FAILED', 'PARTIAL_SUCCESS', 'DISPUTED', 'MANUAL_REVIEW'],
    SUCCESS: ['REFUNDED', 'PARTIAL_REFUNDED', 'DISPUTED', 'REVERSED'],
    FAILED: ['CANCELLED', 'DISPUTED'],
    CANCELLED: ['DISPUTED'],
    TIMEOUT: ['CANCELLED', 'DISPUTED'],
    PARTIAL_SUCCESS: ['REFUNDED', 'PARTIAL_REFUNDED', 'DISPUTED'],
    REFUNDED: ['DISPUTED'],
    PARTIAL_REFUNDED: ['DISPUTED'],
    DISPUTED: ['DISPUTE_RESOLVED', 'REFUNDED', 'PARTIAL_REFUNDED'],
    DISPUTE_RESOLVED: ['REFUNDED', 'PARTIAL_REFUNDED'],
    RISK_BLOCKED: ['MANUAL_REVIEW', 'CANCELLED', 'DISPUTED'],
    MANUAL_REVIEW: ['SUCCESS', 'FAILED', 'CANCELLED', 'DISPUTED'],
    REVERSED: ['DISPUTED'],
    EXPIRED: ['CANCELLED', 'DISPUTED']
  };

  /**
   * 检查状态转换是否有效
   */
  static isValidTransition(fromStatus, toStatus) {
    const allowedTransitions = this.STATUS_TRANSITIONS[fromStatus] || [];
    return allowedTransitions.includes(toStatus);
  }

  /**
   * 更新订单状态
   */
  static async updateOrderStatus(orderId, newStatus, additionalData = {}) {
    try {
      const Order = mongoose.model('Order');
      const Transaction = mongoose.model('Transaction');
      
      // 获取当前订单
      const order = await Order.findOne({ orderId });
      if (!order) {
        throw new Error('Order not found');
      }

      // 检查状态转换是否有效
      if (!this.isValidTransition(order.status, newStatus)) {
        throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
      }

      // 准备更新数据
      const updateData = {
        status: newStatus,
        updatedAt: getIndianTimeISO(),
        ...additionalData
      };

      // 根据新状态设置特定字段
      switch (newStatus) {
        case 'SUCCESS':
          updateData.paidAt = getIndianTimeISO();
          updateData.completedAt = getIndianTimeISO();
          break;
        case 'TIMEOUT':
          updateData.timeoutAt = getIndianTimeISO();
          break;
        case 'EXPIRED':
          updateData.expiredAt = getIndianTimeISO();
          break;
        case 'REFUNDED':
          updateData.refund = {
            ...order.refund,
            refundedAt: getIndianTimeISO(),
            ...additionalData.refund
          };
          break;
        case 'DISPUTED':
          updateData.dispute = {
            ...order.dispute,
            raisedAt: getIndianTimeISO(),
            ...additionalData.dispute
          };
          break;
        case 'DISPUTE_RESOLVED':
          updateData.dispute = {
            ...order.dispute,
            resolvedAt: getIndianTimeISO(),
            ...additionalData.dispute
          };
          break;
        case 'RISK_BLOCKED':
          updateData.riskInfo = {
            ...order.riskInfo,
            ...additionalData.riskInfo
          };
          break;
        case 'MANUAL_REVIEW':
          updateData.riskInfo = {
            ...order.riskInfo,
            reviewedAt: getIndianTimeISO(),
            ...additionalData.riskInfo
          };
          break;
      }

      // 更新订单
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId },
        updateData,
        { new: true }
      );

      // 更新对应的交易记录
      await Transaction.findOneAndUpdate(
        { orderId },
        { 
          status: newStatus,
          updatedAt: getIndianTimeISO(),
          completedAt: ['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(newStatus) ? getIndianTimeISO() : null
        }
      );

      // 处理余额变更
      await this.handleBalanceChange(updatedOrder, newStatus);
      
      return {
        success: true,
        order: updatedOrder
      };
      
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * 处理余额变更
   */
  static async handleBalanceChange(order, newStatus) {
    const Merchant = mongoose.model('Merchant');
    
    switch (newStatus) {
      case 'SUCCESS':
        // 订单成功，增加可用余额
        await Merchant.findOneAndUpdate(
          { merchantId: order.merchantId },
          { 
            $inc: { 
              'balance.available': order.amount,
              'balance.frozen': -order.amount
            }
          }
        );
        break;
        
      case 'FAILED':
      case 'CANCELLED':
      case 'TIMEOUT':
      case 'EXPIRED':
        // 订单失败，释放冻结余额
        await Merchant.findOneAndUpdate(
          { merchantId: order.merchantId },
          { 
            $inc: { 'balance.frozen': -order.amount }
          }
        );
        break;
        
      case 'REFUNDED':
        // 订单退款，减少可用余额
        const refundAmount = order.refund?.amount || order.amount;
        await Merchant.findOneAndUpdate(
          { merchantId: order.merchantId },
          { 
            $inc: { 'balance.available': -refundAmount }
          }
        );
        break;
        
      case 'PARTIAL_REFUNDED':
        // 部分退款
        const partialRefundAmount = order.refund?.amount || 0;
        await Merchant.findOneAndUpdate(
          { merchantId: order.merchantId },
          { 
            $inc: { 'balance.available': -partialRefundAmount }
          }
        );
        break;
    }
  }

  /**
   * 批量更新订单状态
   */
  static async batchUpdateOrderStatus(updates) {
    try {
      const results = [];
      
      for (const update of updates) {
        const { orderId, newStatus, additionalData } = update;
        
        const result = await this.updateOrderStatus(orderId, newStatus, additionalData);
        results.push(result);
      }
      
      return results;
      
    } catch (error) {
      console.error('Error in batch update:', error);
      throw error;
    }
  }

  /**
   * 处理订单超时
   */
  static async handleOrderTimeout(orderId) {
    try {
      await this.updateOrderStatus(orderId, 'TIMEOUT', {
        error: {
          code: 'TIMEOUT',
          message: 'Order payment timeout'
        }
      });
    } catch (error) {
      console.error(`Error handling timeout for order ${orderId}:`, error);
    }
  }

  /**
   * 处理订单过期
   */
  static async handleOrderExpiration(orderId) {
    try {
      await this.updateOrderStatus(orderId, 'EXPIRED', {
        error: {
          code: 'EXPIRED',
          message: 'Order has expired'
        }
      });
    } catch (error) {
      console.error(`Error handling expiration for order ${orderId}:`, error);
    }
  }

  /**
   * 处理退款
   */
  static async handleRefund(orderId, refundAmount, reason, operator) {
    try {
      const Order = mongoose.model('Order');
      const order = await Order.findOne({ orderId });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.status !== 'SUCCESS' && order.status !== 'PARTIAL_SUCCESS') {
        throw new Error('Order is not in success status');
      }
      
      const newStatus = refundAmount >= order.amount ? 'REFUNDED' : 'PARTIAL_REFUNDED';
      
      await this.updateOrderStatus(orderId, newStatus, {
        refund: {
          amount: refundAmount,
          reason,
          operator
        }
      });
    } catch (error) {
      console.error(`Error handling refund for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * 处理争议
   */
  static async handleDispute(orderId, reason, operator) {
    try {
      await this.updateOrderStatus(orderId, 'DISPUTED', {
        dispute: {
          reason,
          operator
        }
      });
    } catch (error) {
      console.error(`Error handling dispute for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * 解决争议
   */
  static async resolveDispute(orderId, resolution, operator) {
    try {
      await this.updateOrderStatus(orderId, 'DISPUTE_RESOLVED', {
        dispute: {
          resolution,
          operator
        }
      });
    } catch (error) {
      console.error(`Error resolving dispute for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * 风控拦截
   */
  static async blockOrder(orderId, riskLevel, riskFactors, blockedReason) {
    try {
      await this.updateOrderStatus(orderId, 'RISK_BLOCKED', {
        riskInfo: {
          riskLevel,
          riskFactors,
          blockedReason
        }
      });
    } catch (error) {
      console.error(`Error blocking order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * 获取订单状态统计
   */
  static async getOrderStatusStats(merchantId = null) {
    const Order = mongoose.model('Order');
    
    const matchStage = merchantId ? { merchantId } : {};
    
    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    return stats;
  }
}

module.exports = OrderStatusService; 