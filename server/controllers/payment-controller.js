const paymentManager = require('../services/payment-service');
const Order = require('../models/order');
const Transaction = require('../models/transaction');
const Merchant = require('../models/merchant');
const ConcurrencyService = require('../services/concurrency-service');
const OrderStatusService = require('../services/order-status-service');
const { v4: uuidv4 } = require('uuid');

class PaymentController {
  /**
   * 创建支付订单
   */
  static async createPayment(req, res) {
    try {
      const {
        merchantId,
        amount,
        currency = 'INR',
        customerEmail,
        customerPhone,
        returnUrl,
        notifyUrl,
        provider = 'mock', // 默认使用mock提供者
        description
      } = req.body;

      // 生成订单ID
      const orderId = Order.generateOrderId();

      // 计算手续费
      const fee = Math.round(amount * 0.01); // 默认1%手续费

      // 使用并发服务创建订单
      const orderData = {
        orderId,
        merchantId,
        type: 'DEPOSIT',
        amount,
        currency,
        fee,
        provider: {
          name: provider
        },
        customer: {
          email: customerEmail,
          phone: customerPhone
        },
        callback: {
          successUrl: returnUrl,
          failureUrl: returnUrl,
          notifyUrl: notifyUrl
        }
      };

      const result = await ConcurrencyService.createOrderWithTransaction(orderData, merchantId);
      const { order, transaction } = result;

      // 调用支付服务
      const paymentResult = await paymentManager.createPayment(provider, {
        orderId,
        amount,
        currency,
        customerEmail,
        customerPhone,
        returnUrl,
        notifyUrl,
        extra: {
          description: description || 'Game deposit'
        }
      });

      if (!paymentResult.success) {
        order.status = 'FAILED';
        order.error = {
          code: paymentResult.code,
          message: paymentResult.error
        };
        await order.save();

        return res.status(400).json({
          error: 'Payment initiation failed',
          details: paymentResult.error
        });
      }

      // 更新订单信息
      order.provider.transactionId = paymentResult.data.transactionId;
      order.provider.providerOrderId = paymentResult.data.transactionId;
      await order.save();

      res.json({
        success: true,
        data: {
          orderId: order.orderId,
          paymentUrl: paymentResult.data.paymentUrl,
          amount: order.amount,
          currency: order.currency,
          status: order.status
        }
      });

    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * 查询订单状态
   */
  static async queryOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { merchantId } = req.query;

      // 验证商户
      const merchant = await Merchant.findOne({ merchantId, status: 'ACTIVE' });
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found or inactive' });
      }

      // 查询订单
      const order = await Order.findOne({ orderId, merchantId });
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // 如果订单还在处理中，查询最新状态
      if (order.status === 'PENDING' || order.status === 'PROCESSING') {
        const queryResult = await paymentManager.queryOrder(order.provider.name, orderId);
        
        if (queryResult.success) {
          order.status = queryResult.data.status;
          order.provider.transactionId = queryResult.data.transactionId;
          if (queryResult.data.paidAt) {
            order.paidAt = new Date(queryResult.data.paidAt);
          }
          await order.save();
        }
      }

      res.json({
        success: true,
        data: {
          orderId: order.orderId,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          fee: order.fee,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          error: order.error
        }
      });

    } catch (error) {
      console.error('Query order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * 更新订单状态
   */
  static async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, providerTransactionId, additionalData = {} } = req.body;

      const updateData = { ...additionalData };
      if (providerTransactionId) {
        updateData['provider.providerOrderId'] = providerTransactionId;
      }

      const result = await OrderStatusService.updateOrderStatus(orderId, status, updateData);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        error: 'Failed to update order status',
        message: error.message
      });
    }
  }

  /**
   * 批量更新订单状态
   */
  static async batchUpdateOrderStatus(req, res) {
    try {
      const { updates } = req.body;

      const results = await OrderStatusService.batchUpdateOrderStatus(updates);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error batch updating order status:', error);
      res.status(500).json({
        error: 'Failed to batch update order status',
        message: error.message
      });
    }
  }

  /**
   * 获取可用支付提供者
   */
  static async getAvailableProviders(req, res) {
    try {
      const providers = paymentManager.getAvailableProviders();
      
      res.json({
        success: true,
        data: providers
      });

    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * 处理退款
   */
  static async handleRefund(req, res) {
    try {
      const { orderId } = req.params;
      const { refundAmount, reason, operator } = req.body;

      const result = await OrderStatusService.handleRefund(orderId, refundAmount, reason, operator);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error handling refund:', error);
      res.status(500).json({
        error: 'Failed to process refund',
        message: error.message
      });
    }
  }

  /**
   * 处理争议
   */
  static async handleDispute(req, res) {
    try {
      const { orderId } = req.params;
      const { reason, operator } = req.body;

      const result = await OrderStatusService.handleDispute(orderId, reason, operator);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error handling dispute:', error);
      res.status(500).json({
        error: 'Failed to process dispute',
        message: error.message
      });
    }
  }

  /**
   * 解决争议
   */
  static async resolveDispute(req, res) {
    try {
      const { orderId } = req.params;
      const { resolution, operator } = req.body;

      const result = await OrderStatusService.resolveDispute(orderId, resolution, operator);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      res.status(500).json({
        error: 'Failed to resolve dispute',
        message: error.message
      });
    }
  }

  /**
   * 风控拦截
   */
  static async blockOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { riskLevel, riskFactors, blockedReason } = req.body;

      const result = await OrderStatusService.blockOrder(orderId, riskLevel, riskFactors, blockedReason);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error blocking order:', error);
      res.status(500).json({
        error: 'Failed to block order',
        message: error.message
      });
    }
  }

  /**
   * 获取订单状态统计
   */
  static async getOrderStatusStats(req, res) {
    try {
      const { merchantId } = req.query;
      const stats = await OrderStatusService.getOrderStatusStats(merchantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting order status stats:', error);
      res.status(500).json({
        error: 'Failed to get order status stats',
        message: error.message
      });
    }
  }
}

module.exports = PaymentController;
