const BasePaymentProvider = require('./base-provider');

/**
 * 模拟支付服务提供者（用于测试）
 */
class MockProvider extends BasePaymentProvider {
  constructor(config) {
    super(config);
    this.name = 'mock';
  }

  async initialize() {
    console.log('Mock provider initialized');
  }

  async createPayment(params) {
    try {
      // 模拟支付URL
      const paymentUrl = `http://localhost:3000/mock-payment?orderId=${params.orderId}&amount=${params.amount}`;
      
      return {
        success: true,
        data: {
          orderId: params.orderId,
          paymentUrl: paymentUrl,
          transactionId: `MOCK_${Date.now()}`,
          status: 'PENDING'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'MOCK_ERROR'
      };
    }
  }

  async queryOrder(orderId) {
    // 模拟订单状态查询
    const statuses = ['PENDING', 'SUCCESS', 'FAILED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      success: true,
      data: {
        orderId: orderId,
        status: randomStatus,
        amount: 10000,
        transactionId: `MOCK_${Date.now()}`,
        paidAt: randomStatus === 'SUCCESS' ? new Date().toISOString() : null
      }
    };
  }

  async payout(params) {
    try {
      return {
        success: true,
        data: {
          orderId: params.orderId,
          payoutId: `MOCK_PAYOUT_${Date.now()}`,
          status: 'PROCESSING'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'MOCK_PAYOUT_ERROR'
      };
    }
  }

  async queryPayout(orderId) {
    const statuses = ['PROCESSING', 'SUCCESS', 'FAILED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      success: true,
      data: {
        orderId: orderId,
        status: randomStatus,
        amount: 5000,
        payoutId: `MOCK_PAYOUT_${Date.now()}`,
        completedAt: randomStatus === 'SUCCESS' ? new Date().toISOString() : null
      }
    };
  }

  async handlePaymentCallback(request) {
    return {
      success: true,
      data: {
        orderId: request.body.orderId || 'MOCK_ORDER',
        status: 'SUCCESS',
        amount: 10000,
        transactionId: `MOCK_${Date.now()}`,
        paidAt: new Date().toISOString()
      }
    };
  }

  async handlePayoutCallback(request) {
    return {
      success: true,
      data: {
        orderId: request.body.orderId || 'MOCK_ORDER',
        status: 'SUCCESS',
        amount: 5000,
        payoutId: `MOCK_PAYOUT_${Date.now()}`,
        completedAt: new Date().toISOString()
      }
    };
  }

  async verifySignature(params, signature) {
    return true; // 模拟验证总是成功
  }

  async generateSignature(params) {
    return 'mock_signature_' + Date.now();
  }

  getPaymentStatus(status) {
    return status;
  }

  getPayoutStatus(status) {
    return status;
  }

  getErrorMessage(errorCode) {
    return 'Mock error: ' + errorCode;
  }
}

module.exports = MockProvider;
