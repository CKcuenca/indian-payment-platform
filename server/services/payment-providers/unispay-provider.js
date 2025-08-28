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
      ? 'https://asia666.unispay.xyz' 
      : 'https://test-api.unispay.com';
    this.mchNo = config.mchNo;
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
    
    // 移除最后的&，然后添加密钥
    signStr = signStr.slice(0, -1) + `&key=${this.secretKey}`;
    
    // 添加调试日志
    console.log('🔍 签名生成 - 排序后的键:', sortedKeys);
    console.log('🔍 签名生成 - 签名字符串:', signStr);
    console.log('🔍 签名生成 - 密钥:', this.secretKey ? '***' : 'undefined');
    
    // 生成SHA-256签名（16进制小写，符合UNISPAY文档要求）
    return crypto.createHash('sha256').update(signStr).digest('hex');
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
      
      // 根据成功的直接API调用，使用正确的参数格式
      const requestParams = {
        mchNo: this.mchNo,
        mchOrderId: orderId,
        payType: 9111, // 印度一类（唤醒）- 根据UNISPAY文档
        amount: amount.toString(), // 直接使用字符串格式，不除以100
        notifyUrl: notifyUrl,
        returnUrl: returnUrl,
        timestamp: Date.now() // 时间戳（毫秒）
      };

      // 添加调试日志
      console.log('🔍 UNISPAY请求参数:', JSON.stringify(requestParams, null, 2));
      console.log('🔍 UNISPAY商户号:', this.mchNo);
      console.log('🔍 UNISPAY密钥:', this.secretKey ? '***' : 'undefined');

      // 生成签名
      requestParams.sign = this.generateSignature(requestParams);
      console.log('🔍 UNISPAY签名:', requestParams.sign);

      // 发送请求到UNISPAY
      const response = await this.makeRequest('/api/order/create', requestParams);
      
      console.log('🔍 UNISPAY响应:', JSON.stringify(response, null, 2));
      
      // 修复：UNISPAY返回code: 200表示成功，不是0
      if (response.code === 200) {
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
        timestamp: Date.now() // 时间戳（毫秒）
      };

      requestParams.sign = this.generateSignature(requestParams);

      const response = await this.makeRequest('/api/order/query', requestParams);
      
      // 修复：UNISPAY返回code: 200表示成功，不是0
      if (response.code === 200) {
        return {
          success: true,
          orderId: orderId,
          status: this.mapUnispayStatus(response.data.state),
          amount: response.data.amount, // 不除以100，直接使用
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
        amount: dataWithoutSign.amount, // 不除以100，直接使用
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

  /**
   * 发起代付（出款）
   * @param {Object} params 代付参数
   * @param {string} params.orderId 订单ID
   * @param {number} params.amount 金额（分）
   * @param {string} params.currency 货币代码
   * @param {Object} params.bankAccount 银行账户信息
   * @param {string} params.customerName 客户姓名
   * @param {Object} params.extra 额外参数
   * @returns {Promise<Object>} 代付结果
   */
  async payout(params) {
    try {
      const { orderId, amount, currency = 'INR', bankAccount, customerName, extra = {} } = params;
      
      // 构建出款请求参数
      const requestParams = {
        mchNo: this.mchNo,
        mchOrderId: orderId,
        payType: 9111, // 印度一类（唤醒）
        paymentMethod: bankAccount.bankCode || 'IMPS', // 银行代码
        accNumber: bankAccount.accountNumber, // 账户号
        accName: bankAccount.accountHolderName || customerName, // 账户名
        amount: (amount / 100).toFixed(2), // 转换为卢比格式
        ifsc: bankAccount.ifscCode, // IFSC代码
        notifyUrl: extra.notifyUrl || `${process.env.BASE_URL || 'https://cashgit.com'}/api/webhook/unispay/withdraw`,
        timestamp: Date.now()
      };

      // 添加调试日志
      console.log('🔍 UNISPAY出款请求参数:', JSON.stringify(requestParams, null, 2));

      // 生成签名
      console.log('🔍 UNISPAY出款签名生成前的参数:', JSON.stringify(requestParams, null, 2));
      requestParams.sign = this.generateSignature(requestParams);
      console.log('🔍 UNISPAY出款签名:', requestParams.sign);

      // 发送出款请求到UNISPAY
      const response = await this.makeRequest('/api/payout/create', requestParams);
      
      console.log('🔍 UNISPAY出款响应:', JSON.stringify(response, null, 2));
      
      // UNISPAY返回code: 200表示成功
      if (response.code === 200) {
        return {
          success: true,
          data: {
            orderId: orderId,
            payoutId: response.data?.orderNo || response.data?.payoutId || `UNISPAY_${Date.now()}`,
            status: 'PROCESSING',
            amount: amount,
            currency: currency,
            providerOrderId: response.data?.orderNo,
            message: '出款申请成功，等待处理'
          }
        };
      } else {
        throw new Error(response.msg || '出款申请失败');
      }
    } catch (error) {
      console.error('UNISPAY出款失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.response?.data?.code || 'UNISPAY_PAYOUT_ERROR'
      };
    }
  }

  /**
   * 查询代付状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 代付状态
   */
  async queryPayout(orderId) {
    try {
      const requestParams = {
        mchNo: this.mchNo,
        mchOrderId: orderId,
        timestamp: Date.now()
      };

      // 生成签名
      requestParams.sign = this.generateSignature(requestParams);

      console.log('🔍 UNISPAY查询出款状态参数:', JSON.stringify(requestParams, null, 2));

      // 发送查询请求到UNISPAY
      const response = await this.makeRequest('/api/withdraw/query', requestParams);
      
      console.log('🔍 UNISPAY查询出款状态响应:', JSON.stringify(response, null, 2));
      
      // UNISPAY返回code: 200表示成功
      if (response.code === 200) {
        const payoutData = response.data;
        return {
          success: true,
          data: {
            orderId: orderId,
            status: this.mapUnispayPayoutStatus(payoutData.state),
            amount: payoutData.amount ? Math.round(parseFloat(payoutData.amount) * 100) : null, // 转换为分
            currency: payoutData.currency || 'INR',
            providerOrderId: payoutData.orderNo,
            paidTime: payoutData.successTime,
            message: payoutData.msg || '查询成功'
          }
        };
      } else {
        throw new Error(response.msg || '查询出款状态失败');
      }
    } catch (error) {
      console.error('UNISPAY查询出款状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 映射UNISPAY出款状态到系统状态
   * @param {string} unispayStatus UNISPAY出款状态
   * @returns {string} 系统状态
   */
  mapUnispayPayoutStatus(unispayStatus) {
    const statusMap = {
      '0': 'PENDING',      // 待处理
      '1': 'PROCESSING',   // 处理中
      '2': 'SUCCESS',      // 出款成功
      '3': 'FAILED',       // 出款失败
      '4': 'CANCELLED',    // 已取消
      '5': 'REJECTED'      // 已拒绝
    };
    return statusMap[unispayStatus] || 'UNKNOWN';
  }

  /**
   * 创建出款订单
   * @param {Object} orderData 出款订单数据
   * @returns {Promise<Object>} 出款结果
   */
  async createPayoutOrder(orderData) {
    try {
      const { 
        orderId, 
        amount, 
        currency = 'INR', 
        bankCode, 
        accountNumber, 
        ifscCode, 
        accountName, 
        transferMode = 'IMPS',
        remark 
      } = orderData;
      
      // 验证必要参数
      if (!amount || !accountNumber || !ifscCode || !accountName) {
        return { 
          success: false, 
          error: `缺少必要参数：amount(${amount}), accountNumber(${accountNumber}), ifscCode(${ifscCode}), accountName(${accountName})` 
        };
      }
      
      // 构建出款请求参数
      const requestParams = {
        mchNo: this.mchNo,
        mchOrderId: orderId,
        amount: amount.toString(),
        currency: currency,
        bankCode: bankCode,
        accountNumber: accountNumber,
        ifscCode: ifscCode,
        accountHolder: accountName,
        transferMode: transferMode,
        remark: remark || '游戏提现',
        timestamp: Date.now()
      };
      
      // 生成签名
      requestParams.sign = this.generateSignature(requestParams);
      
      // 发送出款请求到UNISPAY
      const response = await this.makeRequest('/api/payout/create', requestParams);
      
      if (response.code === 200) {
        return {
          success: true,
          providerOrderId: response.data.orderId,
          status: 'PROCESSING'
        };
      } else {
        return {
          success: false,
          error: response.message || '出款申请失败'
        };
      }
      
    } catch (error) {
      console.error('UNISPAY出款申请失败:', error);
      return {
        success: false,
        error: 'UNISPAY服务异常'
      };
    }
  }

  /**
   * 查询出款订单状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 查询结果
   */
  async queryPayoutOrder(orderId) {
    try {
      const requestParams = {
        mchNo: this.mchNo,
        mchOrderId: orderId,
        timestamp: Date.now()
      };
      
      // 生成签名
      requestParams.sign = this.generateSignature(requestParams);
      
      // 发送查询请求到UNISPAY
      const response = await this.makeRequest('/api/payout/query', requestParams);
      
      if (response.code === 200) {
        return {
          success: true,
          providerOrderId: response.data.orderId,
          status: response.data.status,
          amount: response.data.amount,
          currency: response.data.currency,
          bankCode: response.data.bankCode,
          accountNumber: response.data.accountNumber,
          ifscCode: response.data.ifscCode,
          accountName: response.data.accountHolder,
          transferMode: response.data.transferMode,
          utrNumber: response.data.utrNumber,
          createTime: response.data.createTime
        };
      } else {
        return {
          success: false,
          error: response.message || '查询出款订单失败'
        };
      }
      
    } catch (error) {
      console.error('UNISPAY查询出款订单失败:', error);
      return {
        success: false,
        error: 'UNISPAY服务异常'
      };
    }
  }

  /**
   * 处理出款异步通知
   * @param {Object} notificationData 通知数据
   * @returns {Object} 处理结果
   */
  async handlePayoutNotification(notificationData) {
    try {
      const { sign, ...dataWithoutSign } = notificationData;
      
      // 验证签名
      if (!this.verifySignature(notificationData, sign)) {
        console.error('UNISPAY出款通知签名验证失败');
        return { success: false, message: '签名验证失败' };
      }

      // 解析通知数据
      const payoutInfo = {
        orderId: dataWithoutSign.mchOrderId,
        providerOrderId: dataWithoutSign.orderNo,
        status: this.mapUnispayPayoutStatus(dataWithoutSign.state),
        amount: dataWithoutSign.amount ? Math.round(parseFloat(dataWithoutSign.amount) * 100) : null, // 转换为分
        paidTime: dataWithoutSign.successTime,
        currency: dataWithoutSign.currency || 'INR',
        message: dataWithoutSign.msg || '出款通知'
      };

      return {
        success: true,
        data: payoutInfo,
        message: '出款通知处理成功'
      };
    } catch (error) {
      console.error('UNISPAY出款通知处理失败:', error);
      return {
        success: false,
        error: error.message,
        message: '出款通知处理失败'
      };
    }
  }
}

module.exports = UnispayProvider;
