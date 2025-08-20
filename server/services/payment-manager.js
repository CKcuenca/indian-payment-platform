const AirPayProvider = require('./payment-providers/airpay-provider');
const MockProvider = require('./payment-providers/mock-provider');

/**
 * 支付服务管理器
 * 负责管理多个支付服务提供者
 */
class PaymentManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
  }

  /**
   * 注册支付服务提供者
   * @param {string} name 提供者名称
   * @param {BasePaymentProvider} provider 提供者实例
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    console.log(`Payment provider ${name} registered`);
  }

  /**
   * 设置默认支付提供者
   * @param {string} name 提供者名称
   */
  setDefaultProvider(name) {
    if (this.providers.has(name)) {
      this.defaultProvider = name;
      console.log(`Default payment provider set to ${name}`);
    } else {
      throw new Error(`Provider ${name} not found`);
    }
  }

  /**
   * 获取支付提供者
   * @param {string} name 提供者名称
   */
  getProvider(name = null) {
    const providerName = name || this.defaultProvider;
    if (!providerName) {
      throw new Error('No default provider set');
    }
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    return provider;
  }

  /**
   * 创建支付订单
   * @param {string} providerName 提供者名称
   * @param {Object} params 支付参数
   */
  async createPayment(providerName, params) {
    const provider = this.getProvider(providerName);
    return await provider.createPayment(params);
  }

  /**
   * 查询订单状态
   * @param {string} providerName 提供者名称
   * @param {string} orderId 订单ID
   */
  async queryOrder(providerName, orderId) {
    const provider = this.getProvider(providerName);
    return await provider.queryOrder(orderId);
  }

  /**
   * 发起代付
   * @param {string} providerName 提供者名称
   * @param {Object} params 代付参数
   */
  async payout(providerName, params) {
    const provider = this.getProvider(providerName);
    return await provider.payout(params);
  }

  /**
   * 查询代付状态
   * @param {string} providerName 提供者名称
   * @param {string} orderId 订单ID
   */
  async queryPayout(providerName, orderId) {
    const provider = this.getProvider(providerName);
    return await provider.queryPayout(orderId);
  }

  /**
   * 处理支付回调
   * @param {string} providerName 提供者名称
   * @param {Object} request 回调请求
   */
  async handlePaymentCallback(providerName, request) {
    const provider = this.getProvider(providerName);
    return await provider.handlePaymentCallback(request);
  }

  /**
   * 处理代付回调
   * @param {string} providerName 提供者名称
   * @param {Object} request 回调请求
   */
  async handlePayoutCallback(providerName, request) {
    const provider = this.getProvider(providerName);
    return await provider.handlePayoutCallback(request);
  }

  /**
   * 获取所有可用的支付提供者
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * 初始化所有支付提供者
   */
  async initializeProviders() {
    for (const [name, provider] of this.providers) {
      try {
        await provider.initialize();
        console.log(`Provider ${name} initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize provider ${name}:`, error.message);
      }
    }
  }
}

module.exports = PaymentManager;
