const Order = require('../models/order');
const PaymentConfig = require('../models/PaymentConfig');
const PassPayClient = require('./passpay-client');

/**
 * PassPay状态同步服务
 * 定期同步PassPay的订单状态，确保数据一致性
 */
class PassPaySyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.syncIntervalMs = 5 * 60 * 1000; // 5分钟同步一次
    this.maxRetries = 3;
    this.retryDelay = 30 * 1000; // 30秒重试延迟
  }

  /**
   * 启动同步服务
   */
  start() {
    if (this.isRunning) {
      console.log('PassPay同步服务已在运行中');
      return;
    }

    console.log('🚀 启动PassPay状态同步服务...');
    this.isRunning = true;

    // 立即执行一次同步
    this.syncAllOrders();

    // 设置定时同步
    this.syncInterval = setInterval(() => {
      this.syncAllOrders();
    }, this.syncIntervalMs);

    console.log(`✅ PassPay同步服务已启动，同步间隔: ${this.syncIntervalMs / 1000}秒`);
  }

  /**
   * 停止同步服务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 停止PassPay状态同步服务...');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    console.log('✅ PassPay同步服务已停止');
  }

  /**
   * 同步所有待同步的订单
   */
  async syncAllOrders() {
    try {
      console.log('🔄 开始同步PassPay订单状态...');

      // 获取PassPay配置
      const passpayConfig = await PaymentConfig.findOne({
        'provider.name': 'passpay'
      });

      if (!passpayConfig) {
        console.log('⚠️ PassPay配置未找到，跳过同步');
        return;
      }

      // 查找需要同步的订单
      const ordersToSync = await Order.find({
        'provider.name': 'passpay',
        status: { $in: ['PENDING', 'PROCESSING'] },
        updatedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // 10分钟前更新的订单
      }).limit(50); // 每次最多同步50个订单

      if (ordersToSync.length === 0) {
        console.log('✅ 没有需要同步的订单');
        return;
      }

      console.log(`📋 找到 ${ordersToSync.length} 个需要同步的订单`);

      // 创建PassPay客户端
      const passpayClient = new PassPayClient(passpayConfig);

      // 批量同步订单状态
      const syncPromises = ordersToSync.map(order => 
        this.syncOrderStatus(order, passpayClient)
      );

      const results = await Promise.allSettled(syncPromises);
      
      // 统计同步结果
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`📊 同步完成: 成功 ${successful} 个, 失败 ${failed} 个`);

    } catch (error) {
      console.error('❌ PassPay订单同步失败:', error);
    }
  }

  /**
   * 同步单个订单状态
   */
  async syncOrderStatus(order, passpayClient) {
    try {
      // 根据订单类型调用不同的查询接口
      let passpayResult;
      
      if (order.type === 'DEPOSIT') {
        // 代收订单
        passpayResult = await passpayClient.queryCollectionOrderStatus(
          order.orderId,
          order.provider.transactionId
        );
      } else if (order.type === 'WITHDRAWAL') {
        // 代付订单
        passpayResult = await passpayClient.queryPayoutOrderStatus(
          order.orderId,
          order.provider.transactionId
        );
      } else {
        console.log(`⚠️ 未知订单类型: ${order.type}, 订单ID: ${order.orderId}`);
        return;
      }

      if (!passpayResult.success) {
        console.log(`⚠️ 查询订单状态失败: ${order.orderId}, 错误: ${passpayResult.error}`);
        return;
      }

      // 检查状态是否有变化
      const newStatus = passpayResult.data.status;
      if (newStatus !== order.status) {
        console.log(`🔄 订单状态更新: ${order.orderId} ${order.status} -> ${newStatus}`);

        // 更新订单状态
        order.status = newStatus;
        order.updatedAt = new Date();

        // 如果支付成功，设置支付时间
        if (newStatus === 'SUCCESS' && order.type === 'DEPOSIT') {
          order.paidAt = new Date();
        }

        // 添加状态历史记录
        order.statusHistory.push({
          status: newStatus,
          timestamp: new Date(),
          reason: 'PassPay定时同步',
          executedBy: 'system'
        });

        await order.save();

        // 如果商户有回调地址，发送通知
        if (order.notifyUrl) {
          await this.sendStatusNotification(order, passpayResult.data);
        }

        console.log(`✅ 订单状态同步成功: ${order.orderId}`);
      } else {
        console.log(`ℹ️ 订单状态无变化: ${order.orderId} (${newStatus})`);
      }

    } catch (error) {
      console.error(`❌ 同步订单状态失败: ${order.orderId}`, error);
      throw error;
    }
  }

  /**
   * 发送状态变更通知给商户
   */
  async sendStatusNotification(order, passpayData) {
    try {
      const axios = require('axios');
      
      const notificationData = {
        orderid: order.orderId,
        amount: order.amount.toString(),
        status: order.status,
        trade_no: order.provider.transactionId,
        message: '订单状态已更新'
      };

      // 如果是代收订单且有UTR，添加UTR信息
      if (order.type === 'DEPOSIT' && passpayData.utr) {
        notificationData.utr = passpayData.utr;
      }

      const response = await axios.post(order.notifyUrl, notificationData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log(`✅ 商户通知发送成功: ${order.orderId} -> ${order.notifyUrl}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      console.error(`❌ 商户通知发送失败: ${order.orderId}`, error.message);
    }
  }

  /**
   * 手动同步指定订单
   */
  async syncSpecificOrder(orderId) {
    try {
      console.log(`🔄 手动同步订单: ${orderId}`);

      const order = await Order.findOne({ orderId });
      if (!order) {
        throw new Error('订单不存在');
      }

      if (order.provider.name !== 'passpay') {
        throw new Error('非PassPay订单，无法同步');
      }

      // 获取PassPay配置
      const passpayConfig = await PaymentConfig.findOne({
        'provider.name': 'passpay'
      });

      if (!passpayConfig) {
        throw new Error('PassPay配置未找到');
      }

      // 创建PassPay客户端并同步
      const passpayClient = new PassPayClient(passpayConfig);
      await this.syncOrderStatus(order, passpayClient);

      console.log(`✅ 订单手动同步完成: ${orderId}`);
      return { success: true, message: '同步完成' };

    } catch (error) {
      console.error(`❌ 订单手动同步失败: ${orderId}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取同步服务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncIntervalMs,
      lastSync: this.lastSyncTime
    };
  }
}

module.exports = PassPaySyncService;
