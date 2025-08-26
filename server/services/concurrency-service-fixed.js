const mongoose = require('mongoose');
const { getIndianTimeISO } = require('../utils/timeUtils');

class ConcurrencyService {
  /**
   * 使用顺序操作处理订单创建
   */
  static async createOrderWithTransaction(orderData, merchantId) {
    try {
      // 1. 锁定商户记录进行限额检查
      const merchant = await mongoose.model('Merchant').findOneAndUpdate(
        { 
          merchantId, 
          status: 'ACTIVE' 
        },
        { $inc: { 'balance.frozen': orderData.amount } },
        { 
          new: true,
          runValidators: true 
        }
      );

      if (!merchant) {
        throw new Error('Merchant not found or inactive');
      }

      // 2. 检查限额
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyUsage = await mongoose.model('Transaction').aggregate([
        {
          $match: {
            merchantId,
            type: 'DEPOSIT',
            status: { $in: ['PENDING', 'SUCCESS'] },
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const dailyTotal = (dailyUsage[0]?.totalAmount || 0) + orderData.amount;
      
      if (dailyTotal > merchant.paymentConfig.limits.maxDeposit) {
        // 回滚冻结的余额
        await mongoose.model('Merchant').findOneAndUpdate(
          { merchantId },
          { $inc: { 'balance.frozen': -orderData.amount } }
        );
        throw new Error('Daily deposit limit exceeded');
      }

      // 3. 创建订单
      const order = new mongoose.model('Order')(orderData);
      await order.save();

      // 4. 创建交易记录
      const transaction = new mongoose.model('Transaction')({
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId: order.orderId,
        merchantId,
        type: orderData.type || 'DEPOSIT',
        amount: orderData.amount,
        fee: orderData.fee,
        currency: orderData.currency,
        status: 'PENDING',
        provider: orderData.provider,
        // 添加必需的余额字段
        balanceChange: orderData.type === 'WITHDRAWAL' ? -orderData.amount : orderData.amount,
        balanceSnapshot: {
          before: merchant.balance.available,
          after: orderData.type === 'WITHDRAWAL' ? 
            merchant.balance.available - orderData.amount : 
            merchant.balance.available + orderData.amount
        },
        createdAt: getIndianTimeISO(),
        updatedAt: getIndianTimeISO()
      });
      
      await transaction.save();
      
      return {
        success: true,
        order,
        transaction
      };
      
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * 处理订单状态更新
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

      // 更新订单状态
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId },
        {
          status: newStatus,
          updatedAt: getIndianTimeISO(),
          ...additionalData
        },
        { new: true }
      );

      // 更新交易记录状态
      await Transaction.findOneAndUpdate(
        { orderId },
        {
          status: newStatus,
          updatedAt: getIndianTimeISO()
        }
      );

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
   * 批量处理订单状态更新
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
   * 获取商户实时限额使用情况
   */
  static async getMerchantUsage(merchantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [dailyUsage, monthlyUsage] = await Promise.all([
      mongoose.model('Transaction').aggregate([
        {
          $match: {
            merchantId,
            type: 'DEPOSIT',
            status: { $in: ['PENDING', 'SUCCESS'] },
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      mongoose.model('Transaction').aggregate([
        {
          $match: {
            merchantId,
            type: 'DEPOSIT',
            status: { $in: ['PENDING', 'SUCCESS'] },
            createdAt: { 
              $gte: new Date(today.getFullYear(), today.getMonth(), 1) 
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      daily: {
        amount: dailyUsage[0]?.totalAmount || 0,
        count: dailyUsage[0]?.count || 0
      },
      monthly: {
        amount: monthlyUsage[0]?.totalAmount || 0,
        count: monthlyUsage[0]?.count || 0
      }
    };
  }

  /**
   * 检查并清理过期订单 - 修复版本，不使用事务
   */
  static async cleanupExpiredOrders() {
    const expiredTime = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
    
    const expiredOrders = await mongoose.model('Order').find({
      status: 'PENDING',
      createdAt: { $lt: expiredTime }
    });

    if (expiredOrders.length > 0) {
      try {
        // 移除事务，使用普通操作
        for (const order of expiredOrders) {
          // 直接更新订单状态，不使用事务
          await mongoose.model('Order').findOneAndUpdate(
            { orderId: order.orderId },
            { 
              status: 'CANCELLED',
              updatedAt: getIndianTimeISO(),
              error: {
                code: 'TIMEOUT',
                message: 'Order expired'
              }
            }
          );

          // 更新交易记录
          await mongoose.model('Transaction').findOneAndUpdate(
            { orderId: order.orderId },
            { 
              status: 'CANCELLED',
              updatedAt: getIndianTimeISO(),
              error: {
                code: 'TIMEOUT',
                message: 'Order expired'
              }
            }
          );

          // 释放冻结的余额
          await mongoose.model('Merchant').findOneAndUpdate(
            { merchantId: order.merchantId },
            { 
              $inc: { 'balance.frozen': -order.amount }
            }
          );
        }
        
        console.log(`Cleaned up ${expiredOrders.length} expired orders`);
        
      } catch (error) {
        console.error('Error cleaning up expired orders:', error);
      }
    }
  }
}

module.exports = ConcurrencyService;
