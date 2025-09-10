const crypto = require('crypto');
const axios = require('axios');
const { getIndianTimeISO } = require('../../utils/timeUtils');

class DhPayProvider {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.mchId = config.mchId;
    this.secretKey = config.secretKey;
    this.productId = {
      deposit: '3001',  // 代收产品ID
      withdraw: '3002'  // 代付产品ID
    };
  }

  /**
   * 初始化提供者
   */
  async initialize() {
    try {
      console.log('DhPay provider initializing...');
      
      // 测试API连接
      const testResult = await this.testConnection();
      
      if (testResult.success) {
        console.log('✅ DhPay provider initialized successfully');
        return true;
      } else {
        console.warn('⚠️ DhPay API connection test failed, but continuing initialization');
        return true; // 即使连接测试失败也继续初始化
      }
    } catch (error) {
      console.error('❌ DhPay provider initialization failed:', error);
      return false;
    }
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    try {
      const testParams = {
        mchId: this.mchId,
        timestamp: Date.now().toString()
      };
      
      testParams.sign = this.generateSignature(testParams);
      
      const response = await axios.post(`${this.baseUrl}/v1.0/api/test/connection`, testParams, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return {
        success: true,
        message: 'Connection test successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection test failed'
      };
    }
  }

  /**
   * 生成签名
   */
  generateSignature(params) {
    // 1. 过滤空值参数
    const filteredParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
        filteredParams[key] = value;
      }
    }

    // 2. 按参数名ASCII码从小到大排序
    const sortedKeys = Object.keys(filteredParams).sort();
    
    // 3. 使用URL键值对格式拼接
    const stringA = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');
    
    // 4. 拼接密钥 - 修复：按照DhPay文档要求拼接&secretKey=
    const stringSignTemp = stringA + '&secretKey=' + this.secretKey;
    
    // 5. MD5加密并转大写
    const sign = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
    
    return sign;
  }

  /**
   * 验证签名
   */
  verifySignature(params, sign) {
    const calculatedSign = this.generateSignature(params);
    return calculatedSign === sign;
  }

  /**
   * 创建代收订单 (标准接口名称)
   */
  async createCollectionOrder(orderData) {
    return await this.createPayment(orderData);
  }

  /**
   * 创建支付订单
   */
  async createPayment(orderData) {
    try {
      // 在测试环境下返回模拟结果
      if (this.config.environment === 'test') {
        console.log('🧪 DhPay测试模式，返回模拟结果');
        return {
          success: true,
          orderId: `DHPAY_${Date.now()}`,
          paymentUrl: `https://test-api.dhpay.com/pay?orderid=${orderData.orderId}`,
          payParams: {},
          cardInfo: null,
          provider: 'dhpay',
          rawResponse: {
            retCode: 'SUCCESS',
            retMsg: '订单创建成功',
            payOrderId: `DHPAY_${Date.now()}`,
            payUrl: `https://test-api.dhpay.com/pay?orderid=${orderData.orderId}`
          }
        };
      }

      const requestData = {
        mchId: this.mchId,
        productId: this.productId.deposit,
        mchOrderNo: orderData.orderId,
        amount: Math.round(orderData.amount * 100), // 转换为分
        clientIp: orderData.clientIp || '0.0.0.0',
        notifyUrl: orderData.notifyUrl,
        returnUrl: orderData.returnUrl,
        subject: orderData.subject || 'Payment',
        body: orderData.description || 'Payment for order',
        param1: orderData.param1 || '',
        param2: orderData.param2 || '',
        validateUserName: orderData.customerName || '',
        requestCardInfo: false
      };

      // 生成签名
      requestData.sign = this.generateSignature(requestData);

      console.log('DhPay createPayment request:', requestData);

      // 发送请求
      const response = await axios.post(`${this.baseUrl}/v1.0/api/order/create`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('DhPay createPayment response:', response.data);

      if (response.data.retCode === 'SUCCESS') {
        return {
          success: true,
          orderId: response.data.payOrderId,
          paymentUrl: response.data.payUrl,
          payParams: response.data.payParams || {},
          cardInfo: response.data.cardInfo || null,
          provider: 'dhpay',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.retMsg || 'Payment creation failed',
          errorCode: response.data.retCode,
          provider: 'dhpay'
        };
      }
    } catch (error) {
      console.error('DhPay createPayment error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
        provider: 'dhpay'
      };
    }
  }

  /**
   * 创建提现订单
   */
  async createWithdraw(withdrawData) {
    try {
      const requestData = {
        mchId: this.mchId,
        productId: this.productId.withdraw,
        mchOrderNo: withdrawData.orderId,
        amount: Math.round(withdrawData.amount * 100), // 转换为分
        clientIp: withdrawData.clientIp || '0.0.0.0',
        notifyUrl: withdrawData.notifyUrl,
        returnUrl: withdrawData.returnUrl,
        subject: withdrawData.subject || 'Withdrawal',
        body: withdrawData.description || 'Withdrawal request',
        param1: withdrawData.param1 || '',
        param2: withdrawData.param2 || '',
        validateUserName: withdrawData.customerName || '',
        requestCardInfo: false
      };

      // 生成签名
      requestData.sign = this.generateSignature(requestData);

      console.log('DhPay createWithdraw request:', requestData);

      // 发送请求
      const response = await axios.post(`${this.baseUrl}/v1.0/api/order/create`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('DhPay createWithdraw response:', response.data);

      if (response.data.retCode === 'SUCCESS') {
        return {
          success: true,
          orderId: response.data.payOrderId,
          paymentUrl: response.data.payUrl,
          payParams: response.data.payParams || {},
          provider: 'dhpay',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.retMsg || 'Withdrawal creation failed',
          errorCode: response.data.retCode,
          provider: 'dhpay'
        };
      }
    } catch (error) {
      console.error('DhPay createWithdraw error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
        provider: 'dhpay'
      };
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrderStatus(orderId) {
    try {
      const requestData = {
        mchId: this.mchId,
        mchOrderNo: orderId
      };

      // 生成签名
      requestData.sign = this.generateSignature(requestData);

      console.log('DhPay queryOrderStatus request:', requestData);

      // 发送请求
      const response = await axios.post(`${this.baseUrl}/v1.0/api/order/query`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('DhPay queryOrderStatus response:', response.data);

      if (response.data.retCode === 'SUCCESS') {
        return {
          success: true,
          orderId: response.data.mchOrderNo,
          status: this.mapDhPayStatus(response.data.status),
          amount: response.data.amount / 100, // 转换为元
          fee: response.data.fee ? response.data.fee / 100 : 0,
          currency: response.data.currency || 'INR',
          provider: 'dhpay',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.retMsg || 'Order query failed',
          errorCode: response.data.retCode,
          provider: 'dhpay'
        };
      }
    } catch (error) {
      console.error('DhPay queryOrderStatus error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
        provider: 'dhpay'
      };
    }
  }

  /**
   * 查询商户余额
   */
  async queryBalance() {
    try {
      const requestData = {
        mchId: this.mchId
      };

      // 生成签名
      requestData.sign = this.generateSignature(requestData);

      console.log('DhPay queryBalance request:', requestData);

      // 发送请求
      const response = await axios.post(`${this.baseUrl}/v1.0/api/order/queryMerchantBalance`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('DhPay queryBalance response:', response.data);

      if (response.data.retCode === 'SUCCESS') {
        return {
          success: true,
          balance: response.data.balance / 100, // 转换为元
          currency: response.data.currency || 'INR',
          provider: 'dhpay',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.retMsg || 'Balance query failed',
          errorCode: response.data.retCode,
          provider: 'dhpay'
        };
      }
    } catch (error) {
      console.error('DhPay queryBalance error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
        provider: 'dhpay'
      };
    }
  }

  /**
   * 查询UTR
   */
  async queryUtr(orderId) {
    try {
      const requestData = {
        mchId: this.mchId,
        mchOrderNo: orderId
      };

      // 生成签名
      requestData.sign = this.generateSignature(requestData);

      console.log('DhPay queryUtr request:', requestData);

      // 发送请求
      const response = await axios.post(`${this.baseUrl}/v1.0/api/order/queryUtr`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('DhPay queryUtr response:', response.data);

      if (response.data.retCode === 'SUCCESS') {
        return {
          success: true,
          orderId: response.data.mchOrderNo,
          utr: response.data.utr,
          provider: 'dhpay',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.retMsg || 'UTR query failed',
          errorCode: response.data.retCode,
          provider: 'dhpay'
        };
      }
    } catch (error) {
      console.error('DhPay queryUtr error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
        provider: 'dhpay'
      };
    }
  }

  /**
   * 查询UPI
   */
  async queryUpi(orderId) {
    try {
      const requestData = {
        mchId: this.mchId,
        mchOrderNo: orderId
      };

      // 生成签名
      requestData.sign = this.generateSignature(requestData);

      console.log('DhPay queryUpi request:', requestData);

      // 发送请求
      const response = await axios.post(`${this.baseUrl}/v1.0/api/order/queryUpi`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('DhPay queryUpi response:', response.data);

      if (response.data.retCode === 'SUCCESS') {
        return {
          success: true,
          orderId: response.data.mchOrderNo,
          upi: response.data.upi,
          provider: 'dhpay',
          rawResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.retMsg || 'UPI query failed',
          errorCode: response.data.retCode,
          provider: 'dhpay'
        };
      }
    } catch (error) {
      console.error('DhPay queryUpi error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
        provider: 'dhpay'
      };
    }
  }

  /**
   * 处理回调通知
   */
  async handleCallback(callbackData) {
    try {
      console.log('DhPay callback received:', callbackData);

      // 验证签名
      const receivedSign = callbackData.sign;
      const isValid = this.verifySignature(callbackData, receivedSign);

      if (!isValid) {
        console.error('DhPay callback signature verification failed');
        return {
          success: false,
          error: 'Invalid signature',
          provider: 'dhpay'
        };
      }

      // 解析回调数据
      const result = {
        success: true,
        orderId: callbackData.mchOrderNo,
        status: this.mapDhPayStatus(callbackData.status),
        amount: callbackData.amount ? callbackData.amount / 100 : 0,
        fee: callbackData.fee ? callbackData.fee / 100 : 0,
        currency: callbackData.currency || 'INR',
        utr: callbackData.utr,
        upi: callbackData.upi,
        param1: callbackData.param1,
        param2: callbackData.param2,
        provider: 'dhpay',
        rawCallback: callbackData
      };

      console.log('DhPay callback processed:', result);
      return result;

    } catch (error) {
      console.error('DhPay handleCallback error:', error);
      return {
        success: false,
        error: error.message || 'Callback processing failed',
        provider: 'dhpay'
      };
    }
  }

  /**
   * 映射DhPay状态到系统状态
   */
  mapDhPayStatus(dhpayStatus) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PROCESSING': 'PROCESSING',
      'SUCCESS': 'SUCCESS',
      'FAILED': 'FAILED',
      'CANCELLED': 'CANCELLED'
    };

    return statusMap[dhpayStatus] || 'UNKNOWN';
  }

  /**
   * 获取提供者信息
   */
  getProviderInfo() {
    return {
      name: 'DhPay',
      code: 'dhpay',
      version: '1.0',
      supportedFeatures: ['deposit', 'withdraw', 'query', 'balance', 'utr', 'upi'],
      currencies: ['INR'],
      minAmount: 1, // 1分
      maxAmount: 1000000, // 10000元
      fees: {
        deposit: '0.5%',
        withdraw: '1%'
      }
    };
  }
}

module.exports = DhPayProvider;
