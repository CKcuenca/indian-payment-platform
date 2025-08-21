const Order = require('../models/order');
const Transaction = require('../models/transaction');
const PaymentConfig = require('../models/PaymentConfig');
const PassPayProvider = require('./payment-providers/passpay-provider');

/**
 * 支付状态同步服务
 */
class PaymentStatusSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.retryAttempts = new Map(); // 记录重试次数
    this.maxRetryAttempts = 3; // 最大重试次数
    this.retryDelay = 5 * 60 * 1000; // 重试延迟5分钟
  }

  /**
   * 启动状态同步服务
   */
  start() {
    if (this.isRunning) {
      console.log('支付状态同步服务已在运行中');
      return;
    }

    console.log('启动支付状态同步服务...');
    this.isRunning = true;

    // 立即执行一次同步
    this.syncPendingOrders();

    // 设置定时同步（每10分钟执行一次）
    this.syncInterval = setInterval(() => {
      this.syncPendingOrders();
    }, 10 * 60 * 1000);

    console.log('支付状态同步服务已启动，每10分钟同步一次');
  }

  /**
   * 停止状态同步服务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('停止支付状态同步服务...');
    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    console.log('支付状态同步服务已停止');
  }

  /**
   * 紧急停止服务（立即停止所有操作）
   */
  emergencyStop() {
    console.log('紧急停止状态同步服务...');
    this.isRunning = false;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // 清理重试记录
    this.retryAttempts.clear();
    
    console.log('状态同步服务已紧急停止');
  }

  /**
   * 同步待处理订单状态
   */
  async syncPendingOrders() {
    try {
      console.log('开始同步待处理订单状态...');

      // 分批处理，避免一次性加载过多数据
      const batchSize = 100; // 每批处理100个订单
      let processedCount = 0;
      let totalProcessed = 0;

      do {
        // 查找需要同步的订单（分批查询）
        const pendingOrders = await Order.find({
          status: { $in: ['PENDING', 'PROCESSING'] },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 最近24小时的订单
          _id: { $gt: this.lastProcessedId || '000000000000000000000000' }, // 分页查询
          // 排除已标记为同步失败的订单
          syncStatus: { $ne: 'SYNC_FAILED' }
        })
        .populate('paymentConfig')
        .sort({ _id: 1 })
        .limit(batchSize);

        if (pendingOrders.length === 0) {
          break;
        }

        console.log(`处理第 ${Math.floor(totalProcessed / batchSize) + 1} 批，共 ${pendingOrders.length} 个订单`);

        // 按支付商分组处理
        const ordersByProvider = this.groupOrdersByProvider(pendingOrders);

        for (const [providerName, orders] of Object.entries(ordersByProvider)) {
          await this.syncOrdersByProvider(providerName, orders);
        }

        // 更新最后处理的ID
        this.lastProcessedId = pendingOrders[pendingOrders.length - 1]._id;
        processedCount = pendingOrders.length;
        totalProcessed += processedCount;

        // 添加批次间延迟，避免资源占用过高
        if (processedCount === batchSize) {
          console.log(`批次处理完成，等待5秒后处理下一批...`);
          await this.delay(5000);
        }

        // 检查内存使用情况
        await this.checkMemoryUsage();

      } while (processedCount === batchSize);

      console.log(`订单状态同步完成，共处理 ${totalProcessed} 个订单`);
      this.lastSyncTime = new Date();

      // 处理过期订单（超过24小时未完成的订单）
      await this.handleExpiredOrders();
    } catch (error) {
      console.error('同步订单状态失败:', error);
      // 记录错误，但不影响下次同步
      this.lastError = {
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 按支付商分组订单
   */
  groupOrdersByProvider(orders) {
    const grouped = {};
    
    orders.forEach(order => {
      const provider = order.provider || 'unknown';
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(order);
    });

    return grouped;
  }

  /**
   * 同步指定支付商的订单状态
   */
  async syncOrdersByProvider(providerName, orders) {
    try {
      console.log(`同步 ${providerName} 的 ${orders.length} 个订单`);

      switch (providerName.toLowerCase()) {
        case 'passpay':
          await this.syncPassPayOrders(orders);
          break;
        case 'airpay':
          await this.syncAirPayOrders(orders);
          break;
        case 'cashfree':
          await this.syncCashfreeOrders(orders);
          break;
        case 'razorpay':
          await this.syncRazorpayOrders(orders);
          break;
        case 'paytm':
          await this.syncPaytmOrders(orders);
          break;
        default:
          console.log(`暂不支持 ${providerName} 的状态同步`);
      }
    } catch (error) {
      console.error(`同步 ${providerName} 订单状态失败:`, error);
    }
  }

  /**
   * 同步PassPay订单状态
   */
  async syncPassPayOrders(orders) {
    try {
      // 获取PassPay配置
      const passpayConfig = await PaymentConfig.findOne({
        'provider.name': 'passpay',
        status: 'ACTIVE'
      });

      if (!passpayConfig) {
        console.log('未找到有效的PassPay配置');
        return;
      }

      const passpay = new PassPayProvider(passpayConfig);

      // 使用并发控制，避免同时发起过多请求
      const concurrencyLimit = 5; // 最多同时处理5个订单
      const chunks = this.chunkArray(orders, concurrencyLimit);

      for (const chunk of chunks) {
        // 并发处理一批订单
        const promises = chunk.map(order => 
          this.syncSinglePassPayOrder(order, passpay)
            .catch(error => {
              console.error(`同步PassPay订单 ${order.orderId} 失败:`, error);
              return this.handleSyncError(order, error);
            })
        );

        // 等待当前批次完成
        await Promise.allSettled(promises);
        
        // 批次间延迟，避免API限流
        if (chunks.length > 1) {
          console.log(`批次处理完成，等待2秒后处理下一批...`);
          await this.delay(2000);
        }
      }
    } catch (error) {
      console.error('同步PassPay订单状态失败:', error);
    }
  }

  /**
   * 同步单个PassPay订单
   */
  async syncSinglePassPayOrder(order, passpay) {
    try {
      // 检查是否有tradeNo
      if (!order.paymentDetails?.tradeNo) {
        console.log(`订单 ${order.orderId} 没有tradeNo，跳过同步`);
        return;
      }

      // 查询PassPay订单状态
      const result = await passpay.queryCollectionOrderStatus(
        order.orderId,
        order.paymentDetails.tradeNo
      );

      if (result.success) {
        // 更新订单状态
        await this.updateOrderStatus(order, result.data);
        console.log(`订单 ${order.orderId} 状态已更新: ${result.data.status}`);
      } else {
        console.log(`查询订单 ${order.orderId} 状态失败: ${result.error}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(order, statusData) {
    try {
      const updateData = {
        status: statusData.status,
        updatedAt: new Date(),
        'paymentDetails.utr': statusData.utr
      };

      if (statusData.status === 'SUCCESS') {
        updateData.paidAt = new Date();
      }

      await Order.findByIdAndUpdate(order._id, updateData);

      // 更新或创建交易记录
      await this.updateTransactionRecord(order, statusData);
    } catch (error) {
      console.error(`更新订单 ${order.orderId} 状态失败:`, error);
    }
  }

  /**
   * 更新交易记录
   */
  async updateTransactionRecord(order, statusData) {
    try {
      const transactionData = {
        orderId: order._id,
        transactionId: statusData.tradeNo,
        amount: order.amount,
        status: statusData.status,
        provider: order.provider,
        utr: statusData.utr,
        providerTradeNo: statusData.tradeNo,
        updatedAt: new Date()
      };

      await Transaction.findOneAndUpdate(
        { transactionId: statusData.tradeNo },
        transactionData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error(`更新交易记录失败:`, error);
    }
  }

  /**
   * 处理同步错误
   */
  async handleSyncError(order, error) {
    try {
      const orderId = order.orderId;
      const currentAttempts = this.retryAttempts.get(orderId) || 0;

      if (currentAttempts < this.maxRetryAttempts) {
        // 增加重试次数
        this.retryAttempts.set(orderId, currentAttempts + 1);

        // 延迟重试
        setTimeout(async () => {
          try {
            console.log(`重试同步订单 ${orderId}，第 ${currentAttempts + 1} 次尝试`);
            await this.syncPendingOrders();
          } catch (retryError) {
            console.error(`重试同步订单 ${orderId} 失败:`, retryError);
          }
        }, this.retryDelay);

        console.log(`订单 ${orderId} 将在 ${this.retryDelay / 1000 / 60} 分钟后重试`);
      } else {
        // 达到最大重试次数，标记为失败
        console.log(`订单 ${orderId} 达到最大重试次数，标记为同步失败`);
        await this.markOrderSyncFailed(order);
        
        // 清理重试记录
        this.retryAttempts.delete(orderId);
      }
    } catch (error) {
      console.error('处理同步错误失败:', error);
    }
  }

  /**
   * 标记订单同步失败
   */
  async markOrderSyncFailed(order) {
    try {
      await Order.findByIdAndUpdate(order._id, {
        status: 'SYNC_FAILED',
        updatedAt: new Date(),
        'paymentDetails.syncError': '状态同步失败，达到最大重试次数'
      });
    } catch (error) {
      console.error(`标记订单 ${order.orderId} 同步失败时出错:`, error);
    }
  }

  /**
   * 手动同步指定订单
   */
  async syncSpecificOrder(orderId) {
    try {
      const order = await Order.findOne({ orderId }).populate('paymentConfig');
      
      if (!order) {
        throw new Error('订单不存在');
      }

      const ordersByProvider = this.groupOrdersByProvider([order]);
      const providerName = order.provider;

      if (ordersByProvider[providerName]) {
        await this.syncOrdersByProvider(providerName, ordersByProvider[providerName]);
        return { success: true, message: '订单状态同步完成' };
      } else {
        throw new Error(`不支持的支付商: ${providerName}`);
      }
    } catch (error) {
      console.error(`手动同步订单 ${orderId} 失败:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取同步服务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      retryAttempts: Object.fromEntries(this.retryAttempts),
      lastSyncTime: this.lastSyncTime || null
    };
  }

  /**
   * 检查内存使用情况
   */
  async checkMemoryUsage() {
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      console.log(`内存使用情况:`, memUsageMB);

      // 如果内存使用过高，强制垃圾回收
      if (memUsageMB.heapUsed > 500) { // 超过500MB
        console.log('内存使用过高，执行垃圾回收...');
        if (global.gc) {
          global.gc();
          console.log('垃圾回收完成');
        } else {
          console.log('垃圾回收不可用，建议使用 --expose-gc 启动参数');
        }
      }

      // 如果内存使用过高，暂停同步
      if (memUsageMB.heapUsed > 800) { // 超过800MB
        console.log('内存使用过高，暂停同步30秒...');
        await this.delay(30000);
      }
    } catch (error) {
      console.error('检查内存使用情况失败:', error);
    }
  }

  /**
   * 处理过期订单（超过24小时未完成的订单）
   */
  async handleExpiredOrders() {
    try {
      console.log('开始处理过期订单...');
      
      // 查找超过24小时未完成的订单
      const expiredOrders = await Order.find({
        status: { $in: ['PENDING', 'PROCESSING'] },
        createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        // 排除已经处理过的过期订单
        expiredHandled: { $ne: true }
      });

      if (expiredOrders.length === 0) {
        console.log('没有过期订单需要处理');
        return;
      }

      console.log(`找到 ${expiredOrders.length} 个过期订单`);

      // 批量更新过期订单状态
      const updatePromises = expiredOrders.map(order => {
        const updateData = {
          status: 'EXPIRED',
          expiredAt: new Date(),
          expiredHandled: true,
          syncStatus: 'EXPIRED',
          // 添加过期原因
          expiredReason: '订单超过24小时未完成，自动标记为过期'
        };

        // 同时更新交易记录
        const transactionUpdate = Transaction.findOneAndUpdate(
          { orderId: order.orderId },
          {
            status: 'EXPIRED',
            updatedAt: new Date(),
            notes: '订单过期，自动更新状态'
          },
          { new: true, upsert: true }
        );

        return Promise.all([
          Order.findByIdAndUpdate(order._id, updateData, { new: true }),
          transactionUpdate
        ]);
      });

      await Promise.all(updatePromises);
      console.log(`成功处理 ${expiredOrders.length} 个过期订单`);

      // 记录过期订单统计
      this.lastExpiredCount = expiredOrders.length;
      this.lastExpiredProcessTime = new Date();

    } catch (error) {
      console.error('处理过期订单失败:', error);
    }
  }

  /**
   * 数组分块方法
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 其他支付商的同步方法（待实现）
  async syncAirPayOrders(orders) {
    console.log('AirPay状态同步功能待实现');
  }

  async syncCashfreeOrders(orders) {
    console.log('Cashfree状态同步功能待实现');
  }

  async syncRazorpayOrders(orders) {
    console.log('Razorpay状态同步功能待实现');
  }

  async syncPaytmOrders(orders) {
    console.log('Paytm状态同步功能待实现');
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
      retryAttempts: Object.fromEntries(this.retryAttempts),
      maxRetryAttempts: this.maxRetryAttempts,
      retryDelay: this.retryDelay,
      // 过期订单统计
      lastExpiredCount: this.lastExpiredCount,
      lastExpiredProcessTime: this.lastExpiredProcessTime
    };
  }
}

module.exports = PaymentStatusSyncService;
