const mongoose = require('mongoose');
const { getIndianTimeISO } = require('../utils/timeUtils');

class ConcurrencyService {
  /**
   * 使用顺序操作处理订单创建，避免事务问题
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
        type: 'DEPOSIT',
        amount: orderData.amount,
        fee: orderData.fee,
        currency: orderData.currency,
        status: 'PENDING',
        provider: orderData.provider,
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
      // 如果出错，尝试回滚冻结的余额
      try {
        await mongoose.model('Merchant').findOneAndUpdate(
          { merchantId },
          { $inc: { 'balance.frozen': -orderData.amount } }
        );
      } catch (rollbackError) {
        console.error('Failed to rollback frozen balance:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * 处理订单状态更新
   */
  static async updateOrderStatus(orderId, newStatus, additionalData = {}) {
    try {
      // 1. 更新订单状态
      const order = await mongoose.model('Order').findOneAndUpdate(
        { orderId },
        { 
          status: newStatus,
          updatedAt: getIndianTimeISO(),
          ...additionalData
        },
        { new: true }
      );

      if (!order) {
        throw new Error('Order not found');
      }

      // 2. 更新交易记录
      await mongoose.model('Transaction').findOneAndUpdate(
        { orderId },
        { 
          status: newStatus,
          updatedAt: getIndianTimeISO(),
          ...additionalData
        }
      );

      // 3. 如果订单成功，释放冻结余额并增加可用余额
      if (newStatus === 'SUCCESS') {
        await mongoose.model('Merchant').findOneAndUpdate(
          { merchantId: order.merchantId },
          { 
            $inc: { 
              'balance.frozen': -order.amount,
              'balance.available': order.amount
            }
          }
        );
      }

      // 4. 如果订单失败或取消，释放冻结余额
      if (['FAILED', 'CANCELLED'].includes(newStatus)) {
        await mongoose.model('Merchant').findOneAndUpdate(
          { merchantId: order.merchantId },
          { $inc: { 'balance.frozen': -order.amount } }
        );
      }

      return {
        success: true,
        order
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
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const results = [];
      
      for (const update of updates) {
        const { orderId, newStatus, additionalData } = update;
        
        const result = await this.updateOrderStatus(orderId, newStatus, additionalData);
        results.push(result);
      }
      
      await session.commitTransaction();
      return results;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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
