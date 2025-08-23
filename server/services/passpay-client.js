const axios = require('axios');
const crypto = require('crypto');

/**
 * PassPay API客户端
 * 用于调用PassPay的上游接口
 */
class PassPayClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://api.merchant.passpay.cc';
    this.mchid = config.provider.accountId;
    this.payId = config.provider.payId;
    this.secretKey = config.provider.secretKey;
  }

  /**
   * 生成PassPay签名
   */
  generateSignature(params) {
    // 过滤空值和null，按ASCII排序
    const filteredParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });

    // 按ASCII排序并拼接
    const sortedKeys = Object.keys(filteredParams).sort();
    let signStr = '';
    
    sortedKeys.forEach(key => {
      if (key !== 'sign') {
        signStr += `${key}=${filteredParams[key]}&`;
      }
    });

    // 末尾拼接密钥
    signStr += `key=${this.secretKey}`;

    // MD5加密并转小写
    return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
  }

  /**
   * 创建代收订单
   */
  async createCollectionOrder(orderData) {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId,
        out_trade_no: orderData.orderId,
        amount: orderData.amount.toFixed(2),
        notify_url: orderData.notifyUrl
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/order/create`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        return {
          success: true,
          data: {
            orderId: orderData.orderId,
            tradeNo: response.data.data.trade_no,
            status: 'PENDING',
            message: '订单创建成功'
          }
        };
      } else {
        throw new Error(response.data.message || '创建代收订单失败');
      }
    } catch (error) {
      console.error('PassPay创建代收订单失败:', error);
      return {
        success: false,
        error: error.message || '创建代收订单失败'
      };
    }
  }

  /**
   * 查询代收订单状态
   */
  async queryCollectionOrderStatus(orderId, tradeNo) {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId,
        out_trade_no: orderId,
        trade_no: tradeNo
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/order/query`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        const statusData = response.data.data;
        return {
          success: true,
          data: {
            orderId,
            tradeNo,
            status: this.mapStatus(statusData.status),
            amount: parseFloat(statusData.amount),
            utr: statusData.utr || null,
            message: statusData.msg || '查询成功'
          }
        };
      } else {
        throw new Error(response.data.message || '查询订单状态失败');
      }
    } catch (error) {
      console.error('PassPay查询订单状态失败:', error);
      return {
        success: false,
        error: error.message || '查询订单状态失败'
      };
    }
  }

  /**
   * 提交UTR
   */
  async submitUTR(orderId, tradeNo, utr) {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId,
        out_trade_no: orderId,
        trade_no: tradeNo,
        utr: utr
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/order/utr`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        return {
          success: true,
          data: {
            orderId,
            tradeNo,
            utr,
            message: 'UTR提交成功'
          }
        };
      } else {
        throw new Error(response.data.message || 'UTR提交失败');
      }
    } catch (error) {
      console.error('PassPay提交UTR失败:', error);
      return {
        success: false,
        error: error.message || 'UTR提交失败'
      };
    }
  }

  /**
   * 查询UTR状态
   */
  async queryUTRStatus(orderId, tradeNo) {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId,
        out_trade_no: orderId,
        trade_no: tradeNo
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/order/utr/query`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        const statusData = response.data.data;
        return {
          success: true,
          data: {
            orderId,
            tradeNo,
            utrStatus: this.mapUTRStatus(statusData.utr_status),
            message: statusData.msg || '查询成功'
          }
        };
      } else {
        throw new Error(response.data.message || '查询UTR状态失败');
      }
    } catch (error) {
      console.error('PassPay查询UTR状态失败:', error);
      return {
        success: false,
        error: error.message || '查询UTR状态失败'
      };
    }
  }

  /**
   * 查询UPI
   */
  async queryUPI(orderId, tradeNo) {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId,
        out_trade_no: orderId,
        trade_no: tradeNo
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/order/upi/query`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        const upiData = response.data.data;
        return {
          success: true,
          data: {
            orderId,
            tradeNo,
            upiId: upiData.upi_id,
            upiStatus: this.mapUPIStatus(upiData.upi_status),
            message: upiData.msg || '查询成功'
          }
        };
      } else {
        throw new Error(response.data.message || '查询UPI失败');
      }
    } catch (error) {
      console.error('PassPay查询UPI失败:', error);
      return {
        success: false,
        error: error.message || '查询UPI失败'
      };
    }
  }

  /**
   * 创建代付订单
   */
  async createPayoutOrder(payoutData) {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId,
        out_trade_no: payoutData.orderId,
        amount: payoutData.amount.toFixed(2),
        account_number: payoutData.accountNumber,
        ifsc_code: payoutData.ifscCode,
        account_holder: payoutData.accountHolder,
        notify_url: payoutData.notifyUrl
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/payout/create`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        return {
          success: true,
          data: {
            orderId: payoutData.orderId,
            tradeNo: response.data.data.trade_no,
            status: 'PENDING',
            message: '代付订单创建成功'
          }
        };
      } else {
        throw new Error(response.data.message || '创建代付订单失败');
      }
    } catch (error) {
      console.error('PassPay创建代付订单失败:', error);
      return {
        success: false,
        error: error.message || '创建代付订单失败'
      };
    }
  }

  /**
   * 查询代付订单状态
   */
  async queryPayoutOrderStatus(orderId, tradeNo) {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId,
        out_trade_no: orderId,
        trade_no: tradeNo
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/payout/query`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        const statusData = response.data.data;
        return {
          success: true,
          data: {
            orderId,
            tradeNo,
            status: this.mapPayoutStatus(statusData.status),
            message: statusData.msg || '查询成功'
          }
        };
      } else {
        throw new Error(response.data.message || '查询代付订单状态失败');
      }
    } catch (error) {
      console.error('PassPay查询代付订单状态失败:', error);
      return {
        success: false,
        error: error.message || '查询代付订单状态失败'
      };
    }
  }

  /**
   * 获取余额
   */
  async getBalance() {
    try {
      const params = {
        mchid: this.mchid,
        pay_id: this.payId
      };

      // 生成签名
      params.sign = this.generateSignature(params);

      const response = await axios.post(`${this.baseUrl}/api/developer/balance/query`, params, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.rCode === 200) {
        return {
          success: true,
          data: {
            balance: parseFloat(response.data.data.balance),
            currency: 'INR',
            message: '余额查询成功'
          }
        };
      } else {
        throw new Error(response.data.message || '余额查询失败');
      }
    } catch (error) {
      console.error('PassPay余额查询失败:', error);
      return {
        success: false,
        error: error.message || '余额查询失败'
      };
    }
  }

  /**
   * 映射PassPay状态到系统状态
   */
  mapStatus(status) {
    const statusMap = {
      '0': 'PENDING',      // 待处理
      '1': 'PROCESSING',   // 处理中
      '2': 'SUCCESS',      // 成功
      '3': 'FAILED',       // 失败
      '4': 'CANCELLED',    // 取消
      '5': 'EXPIRED'       // 过期
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * 映射代付状态
   */
  mapPayoutStatus(status) {
    const statusMap = {
      '0': 'PENDING',      // 待处理
      '1': 'PROCESSING',   // 处理中
      '2': 'SUCCESS',      // 成功
      '3': 'FAILED',       // 失败
      '4': 'CANCELLED',    // 取消
      '5': 'REJECTED'      // 拒绝
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * 映射UTR状态
   */
  mapUTRStatus(status) {
    const statusMap = {
      '0': 'PENDING',      // 待验证
      '1': 'VERIFIED',     // 已验证
      '2': 'REJECTED',     // 拒绝
      '3': 'EXPIRED'       // 过期
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * 映射UPI状态
   */
  mapUPIStatus(status) {
    const statusMap = {
      '0': 'INACTIVE',     // 非活跃
      '1': 'ACTIVE'        // 活跃
    };
    return statusMap[status] || 'UNKNOWN';
  }
}

module.exports = PassPayClient;
