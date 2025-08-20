const ConcurrencyService = require('./concurrency-service');

class SchedulerService {
  constructor() {
    this.cleanupInterval = null;
    this.monitoringInterval = null;
  }

  /**
   * 启动定时任务
   */
  start() {
    console.log('Starting scheduler service...');
    
    // 清理过期订单 - 每5分钟执行一次
    this.cleanupInterval = setInterval(async () => {
      try {
        await ConcurrencyService.cleanupExpiredOrders();
      } catch (error) {
        console.error('Error in cleanup task:', error);
      }
    }, 5 * 60 * 1000);

    // 系统监控 - 每10分钟执行一次
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorSystemHealth();
      } catch (error) {
        console.error('Error in monitoring task:', error);
      }
    }, 10 * 60 * 1000);

    console.log('Scheduler service started successfully');
  }

  /**
   * 停止定时任务
   */
  stop() {
    console.log('Stopping scheduler service...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Scheduler service stopped');
  }

  /**
   * 监控系统健康状态
   */
  async monitorSystemHealth() {
    try {
      const mongoose = require('mongoose');
      
      // 检查数据库连接
      if (mongoose.connection.readyState !== 1) {
        console.error('Database connection is not ready');
        return;
      }

      // 检查待处理订单数量
      const Order = mongoose.model('Order');
      const pendingOrders = await Order.countDocuments({ status: 'PENDING' });
      const processingOrders = await Order.countDocuments({ status: 'PROCESSING' });

      console.log(`System health check - Pending orders: ${pendingOrders}, Processing orders: ${processingOrders}`);

      // 如果待处理订单过多，发出警告
      if (pendingOrders > 100) {
        console.warn(`High number of pending orders: ${pendingOrders}`);
      }

      // 检查长时间处理中的订单
      const longProcessingOrders = await Order.find({
        status: 'PROCESSING',
        updatedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // 10分钟前
      });

      if (longProcessingOrders.length > 0) {
        console.warn(`Found ${longProcessingOrders.length} orders processing for too long`);
      }

    } catch (error) {
      console.error('Error in system health monitoring:', error);
    }
  }

  /**
   * 手动执行清理任务
   */
  async manualCleanup() {
    try {
      console.log('Manual cleanup started...');
      await ConcurrencyService.cleanupExpiredOrders();
      console.log('Manual cleanup completed');
    } catch (error) {
      console.error('Error in manual cleanup:', error);
      throw error;
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    try {
      const mongoose = require('mongoose');
      const Order = mongoose.model('Order');
      const Transaction = mongoose.model('Transaction');

      const [orderStats, transactionStats] = await Promise.all([
        Order.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Transaction.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      return {
        database: {
          connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          collections: {
            orders: orderStats,
            transactions: transactionStats
          }
        },
        scheduler: {
          cleanupInterval: this.cleanupInterval ? 'running' : 'stopped',
          monitoringInterval: this.monitoringInterval ? 'running' : 'stopped'
        }
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      throw error;
    }
  }
}

module.exports = SchedulerService; 