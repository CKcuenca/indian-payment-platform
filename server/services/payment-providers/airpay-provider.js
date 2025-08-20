const BasePaymentProvider = require('./base-provider');
const axios = require('axios');
const crypto = require('crypto');

/**
 * AirPay支付服务提供者
 */
class AirPayProvider extends BasePaymentProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.sandbox ? 
      'https://sandbox.airpay.co.in/api' : 
      'https://api.airpay.co.in/api';
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
  }

  async initialize() {
    // 验证配置
    if (!this.merchantId || !this.apiKey || !this.secretKey) {
      throw new Error('AirPay configuration is incomplete');
    }
    console.log('AirPay provider initialized');
  }

  /**
   * 创建支付订单
   */
  async createPayment(params) {
    try {
      const paymentData = {
        merchant_id: this.merchantId,
        order_id: params.orderId,
        amount: (params.amount / 100).toFixed(2), // 转换为元
        currency: params.currency || 'INR',
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
        return_url: params.returnUrl,
        notify_url: params.notifyUrl,
        timestamp: Date.now(),
        ...params.extra
      };

      // 生成签名
      const signature = this.generateSignature(paymentData);
      paymentData.signature = signature;

      // 调用AirPay API
      const response = await axios.post(`${this.baseUrl}/payment/initiate`, paymentData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        data: {
          orderId: params.orderId,
          paymentUrl: response.data.payment_url,
          transactionId: response.data.transaction_id,
          status: 'PENDING'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.response?.data?.error_code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(orderId) {
    try {
      const queryData = {
        merchant_id: this.merchantId,
        order_id: orderId,
        timestamp: Date.now()
      };

      const signature = this.generateSignature(queryData);
      queryData.signature = signature;

      const response = await axios.post(`${this.baseUrl}/payment/status`, queryData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        data: {
          orderId: orderId,
          status: this.getPaymentStatus(response.data.status),
          amount: response.data.amount,
          transactionId: response.data.transaction_id,
          paidAt: response.data.paid_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.response?.data?.error_code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * 发起代付
   */
  async payout(params) {
    try {
      const payoutData = {
        merchant_id: this.merchantId,
        order_id: params.orderId,
        amount: (params.amount / 100).toFixed(2),
        currency: params.currency || 'INR',
        bank_account: params.bankAccount,
        customer_name: params.customerName,
        timestamp: Date.now(),
        ...params.extra
      };

      const signature = this.generateSignature(payoutData);
      payoutData.signature = signature;

      const response = await axios.post(`${this.baseUrl}/payout/initiate`, payoutData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        data: {
          orderId: params.orderId,
          payoutId: response.data.payout_id,
          status: 'PROCESSING'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.response?.data?.error_code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * 查询代付状态
   */
  async queryPayout(orderId) {
    try {
      const queryData = {
        merchant_id: this.merchantId,
        order_id: orderId,
        timestamp: Date.now()
      };

      const signature = this.generateSignature(queryData);
      queryData.signature = signature;

      const response = await axios.post(`${this.baseUrl}/payout/status`, queryData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        data: {
          orderId: orderId,
          status: this.getPayoutStatus(response.data.status),
          amount: response.data.amount,
          payoutId: response.data.payout_id,
          completedAt: response.data.completed_at
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.response?.data?.error_code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * 处理支付回调
   */
  async handlePaymentCallback(request) {
    try {
      const callbackData = request.body;
      
      // 验证签名
      const isValid = await this.verifySignature(callbackData, callbackData.signature);
      if (!isValid) {
        return { success: false, error: 'Invalid signature' };
      }

      return {
        success: true,
        data: {
          orderId: callbackData.order_id,
          status: this.getPaymentStatus(callbackData.status),
          amount: callbackData.amount,
          transactionId: callbackData.transaction_id,
          paidAt: callbackData.paid_at
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理代付回调
   */
  async handlePayoutCallback(request) {
    try {
      const callbackData = request.body;
      
      const isValid = await this.verifySignature(callbackData, callbackData.signature);
      if (!isValid) {
        return { success: false, error: 'Invalid signature' };
      }

      return {
        success: true,
        data: {
          orderId: callbackData.order_id,
          status: this.getPayoutStatus(callbackData.status),
          amount: callbackData.amount,
          payoutId: callbackData.payout_id,
          completedAt: callbackData.completed_at
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成签名
   */
  generateSignature(params) {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .filter(key => key !== 'signature')
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signString)
      .digest('hex');
  }

  /**
   * 验证签名
   */
  async verifySignature(params, signature) {
    const expectedSignature = this.generateSignature(params);
    return expectedSignature === signature;
  }

  /**
   * 获取支付状态
   */
  getPaymentStatus(status) {
    const statusMap = {
      'SUCCESS': 'SUCCESS',
      'FAILED': 'FAILED',
      'PENDING': 'PENDING',
      'CANCELLED': 'CANCELLED'
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * 获取代付状态
   */
  getPayoutStatus(status) {
    const statusMap = {
      'SUCCESS': 'SUCCESS',
      'FAILED': 'FAILED',
      'PROCESSING': 'PROCESSING',
      'PENDING': 'PENDING'
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * 获取错误信息
   */
  getErrorMessage(errorCode) {
    const errorMessages = {
      'INVALID_SIGNATURE': 'Invalid signature',
      'INVALID_AMOUNT': 'Invalid amount',
      'ORDER_NOT_FOUND': 'Order not found',
      'INSUFFICIENT_BALANCE': 'Insufficient balance',
      'BANK_ACCOUNT_INVALID': 'Invalid bank account'
    };
    return errorMessages[errorCode] || 'Unknown error';
  }
}

module.exports = AirPayProvider;
