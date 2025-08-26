const BaseProvider = require('./base-provider');
const crypto = require('crypto');

/**
 * UNISPAY 唤醒支付提供商
 * 支持印度唤醒支付类型（9111: 印度一类唤醒）
 */
class UnispayProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.providerName = 'unispay';
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.unispay.com' 
      : 'https://test-api.unispay.com';
    this.mchNo = config.accountId;
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
  }

  /**
   * 生成签名
   * @param {Object} params 参数对象
   * @returns {string} 签名
   */
  generateSignature(params) {
    // 移除sign字段
    const { sign, ...signParams } = params;
    
    // 按字母顺序排序
    const sortedKeys = Object.keys(signParams).sort();
    
    // 构建签名字符串
    let signStr = '';
    sortedKeys.forEach(key => {
      if (signParams[key] !== undefined && signParams[key] !== null && signParams[key] !== '') {
        signStr += `${key}=${signParams[key]}&`;
      }
    });
    
    // 添加密钥
    signStr += `key=${this.secretKey}`;
    
    // 生成MD5签名
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  }

  /**
   * 验证签名
   * @param {Object} params 参数对象
   * @param {string} receivedSign 接收到的签名
   * @returns {boolean} 签名是否有效
   */
  verifySignature(params, receivedSign) {
    const calculatedSign = this.generateSignature(params);
    return calculatedSign === receivedSign;
  }

  /**
   * 创建唤醒支付订单
   * @param {Object} orderData 订单数据
   * @returns {Promise<Object>} 支付结果
   */
  async createCollectionOrder(orderData) {
    try {
      const { orderId, amount, currency = 'INR', customerPhone, description, notifyUrl, returnUrl } = orderData;
      
      // 构建请求参数
      const requestParams = {
        mchNo: this.mchNo,
        mchOrderId: orderId,
        payType: '9111', // 印度一类唤醒
        amount: Math.round(amount * 100), // 转换为分
        currency: currency,
        subject: description || '游戏充值',
        body: `订单${orderId}充值`,
        notifyUrl: notifyUrl,
        returnUrl: returnUrl,
        clientIp: '127.0.0.1', // 客户端IP
        reqTime: Math.floor(Date.now() / 1000), // 请求时间戳
        version: '1.0'
      };

      // 生成签名
      requestParams.sign = this.generateSignature(requestParams);

      // 发送请求到UNISPAY
      const response = await this.makeRequest('/api/order/create', requestParams);
      
      if (response.code === 0) {
        return {
          success: true,
          orderId: orderId,
          paymentUrl: response.data.payUrl || null,
          upiTransferInfo: {
            beneficiaryName: response.data.beneficiaryName || 'UNISPAY',
            beneficiaryUPI: response.data.beneficiaryUPI || '',
            beneficiaryAccount: response.data.beneficiaryAccount || '',
            ifscCode: response.data.ifscCode || '',
            bankName: response.data.bankName || '',
            amount: amount,
            currency: currency,
            transferNote: `订单${orderId}`,
            expectedCompletionTime: '5-10分钟',
            orderNo: response.data.orderNo // UNISPAY订单号
          },
          providerOrderId: response.data.orderNo,
          status: 'PENDING',
          message: '订单创建成功，等待玩家完成UPI转账'
        };
      } else {
        throw new Error(response.msg || '创建订单失败');
      }
    } catch (error) {
      console.error('UNISPAY创建订单失败:', error);
      return {
        success: false,
        orderId: orderData.orderId,
        error: error.message,
        status: 'FAILED'
      };
    }
  }

  /**
   * 查询订单状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 订单状态
   */
  async queryOrderStatus(orderId) {
    try {
      const requestParams = {
        mchNo: this.mchNo,
        mchOrderId: orderId,
        reqTime: Math.floor(Date.now() / 1000),
        version: '1.0'
      };

      requestParams.sign = this.generateSignature(requestParams);

      const response = await this.makeRequest('/api/order/query', requestParams);
      
      if (response.code === 0) {
        return {
          success: true,
          orderId: orderId,
          status: this.mapUnispayStatus(response.data.state),
          amount: response.data.amount / 100, // 转换回元
          providerOrderId: response.data.orderNo,
          paidTime: response.data.successTime,
          message: response.data.msg || '查询成功'
        };
      } else {
        throw new Error(response.msg || '查询订单失败');
      }
    } catch (error) {
      console.error('UNISPAY查询订单失败:', error);
      return {
        success: false,
        orderId: orderId,
        error: error.message
      };
    }
  }

  /**
   * 映射UNISPAY状态到系统状态
   * @param {string} unispayStatus UNISPAY状态
   * @returns {string} 系统状态
   */
  mapUnispayStatus(unispayStatus) {
    const statusMap = {
      '0': 'PENDING',      // 待支付
      '1': 'SUCCESS',      // 支付成功
      '2': 'FAILED',       // 支付失败
      '3': 'CANCELLED',    // 已取消
      '4': 'REFUNDED'      // 已退款
    };
    return statusMap[unispayStatus] || 'UNKNOWN';
  }

  /**
   * 处理异步通知
   * @param {Object} notificationData 通知数据
   * @returns {Object} 处理结果
   */
  async handleNotification(notificationData) {
    try {
      const { sign, ...dataWithoutSign } = notificationData;
      
      // 验证签名
      if (!this.verifySignature(notificationData, sign)) {
        console.error('UNISPAY通知签名验证失败');
        return { success: false, message: '签名验证失败' };
      }

      // 解析通知数据
      const orderInfo = {
        orderId: dataWithoutSign.mchOrderId,
        providerOrderId: dataWithoutSign.orderNo,
        status: this.mapUnispayStatus(dataWithoutSign.state),
        amount: dataWithoutSign.amount / 100,
        paidTime: dataWithoutSign.successTime,
        currency: dataWithoutSign.currency || 'INR'
      };

      return {
        success: true,
        data: orderInfo,
        message: '通知处理成功'
      };
    } catch (error) {
      console.error('UNISPAY通知处理失败:', error);
      return {
        success: false,
        error: error.message,
        message: '通知处理失败'
      };
    }
  }

  /**
   * 发送HTTP请求
   * @param {string} endpoint 接口端点
   * @param {Object} data 请求数据
   * @returns {Promise<Object>} 响应数据
   */
  async makeRequest(endpoint, data) {
    const axios = require('axios');
    
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UNISPAY-Client/1.0'
        },
        timeout: 30000
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('网络请求超时');
      } else {
        throw new Error(error.message);
      }
    }
  }
}

module.exports = UnispayProvider;
