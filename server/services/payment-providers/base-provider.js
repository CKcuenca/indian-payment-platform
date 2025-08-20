/**
 * 支付服务提供者基类
 * 定义所有支付服务必须实现的接口
 */
class BasePaymentProvider {
  constructor(config) {
    this.config = config;
    this.name = this.constructor.name;
  }

  /**
   * 初始化支付服务
   */
  async initialize() {
    throw new Error('initialize method must be implemented');
  }

  /**
   * 创建支付订单（收款）
   * @param {Object} params 支付参数
   * @param {string} params.orderId 订单ID
   * @param {number} params.amount 金额（分）
   * @param {string} params.currency 货币代码
   * @param {string} params.customerEmail 客户邮箱
   * @param {string} params.customerPhone 客户手机号
   * @param {string} params.returnUrl 返回URL
   * @param {string} params.notifyUrl 回调URL
   * @param {Object} params.extra 额外参数
   */
  async createPayment(params) {
    throw new Error('createPayment method must be implemented');
  }

  /**
   * 查询订单状态
   * @param {string} orderId 订单ID
   */
  async queryOrder(orderId) {
    throw new Error('queryOrder method must be implemented');
  }

  /**
   * 发起代付（提现）
   * @param {Object} params 代付参数
   * @param {string} params.orderId 订单ID
   * @param {number} params.amount 金额（分）
   * @param {string} params.currency 货币代码
   * @param {string} params.bankAccount 银行账户信息
   * @param {string} params.customerName 客户姓名
   * @param {Object} params.extra 额外参数
   */
  async payout(params) {
    throw new Error('payout method must be implemented');
  }

  /**
   * 查询代付状态
   * @param {string} orderId 订单ID
   */
  async queryPayout(orderId) {
    throw new Error('queryPayout method must be implemented');
  }

  /**
   * 处理支付回调
   * @param {Object} request 回调请求
   */
  async handlePaymentCallback(request) {
    throw new Error('handlePaymentCallback method must be implemented');
  }

  /**
   * 处理代付回调
   * @param {Object} request 回调请求
   */
  async handlePayoutCallback(request) {
    throw new Error('handlePayoutCallback method must be implemented');
  }

  /**
   * 验证签名
   * @param {Object} params 参数
   * @param {string} signature 签名
   */
  async verifySignature(params, signature) {
    throw new Error('verifySignature method must be implemented');
  }

  /**
   * 生成签名
   * @param {Object} params 参数
   */
  async generateSignature(params) {
    throw new Error('generateSignature method must be implemented');
  }

  /**
   * 获取支付状态
   * @param {string} status 原始状态
   */
  getPaymentStatus(status) {
    throw new Error('getPaymentStatus method must be implemented');
  }

  /**
   * 获取错误信息
   * @param {string} errorCode 错误代码
   */
  getErrorMessage(errorCode) {
    throw new Error('getErrorMessage method must be implemented');
  }
}

module.exports = BasePaymentProvider;
