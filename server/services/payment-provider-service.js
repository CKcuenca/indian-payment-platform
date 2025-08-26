/**
 * 支付商管理服务
 * 负责管理支付商的分类、配置和状态
 */

// 支付商类型定义
const PAYMENT_PROVIDER_TYPES = {
  NATIVE: 'native',      // 原生支付商
  WAKEUP: 'wakeup'       // 唤醒支付商
};

// 支付商分类配置
const PAYMENT_PROVIDER_CATEGORIES = {
  native: {
    id: 'native',
    name: '原生支付商',
    type: PAYMENT_PROVIDER_TYPES.NATIVE,
    description: '直接与银行和支付网络集成的支付服务商',
    providers: [
      {
        id: 'airpay',
        name: 'airpay',
        displayName: 'AirPay',
        type: PAYMENT_PROVIDER_TYPES.NATIVE,
        category: 'native',
        isActive: true,
        features: ['UPI支付', '银行卡支付', '钱包支付'],
        supportedCurrencies: ['INR'],
        environment: 'production'
      },
      {
        id: 'cashfree',
        name: 'cashfree',
        displayName: 'CashFree',
        type: PAYMENT_PROVIDER_TYPES.NATIVE,
        category: 'native',
        isActive: true,
        features: ['UPI支付', '银行卡支付', '网银支付'],
        supportedCurrencies: ['INR'],
        environment: 'production'
      },
      {
        id: 'razorpay',
        name: 'razorpay',
        displayName: 'Razorpay',
        type: PAYMENT_PROVIDER_TYPES.NATIVE,
        category: 'native',
        isActive: true,
        features: ['UPI支付', '银行卡支付', '钱包支付'],
        supportedCurrencies: ['INR'],
        environment: 'production'
      },
      {
        id: 'paytm',
        name: 'paytm',
        displayName: 'Paytm',
        type: PAYMENT_PROVIDER_TYPES.NATIVE,
        category: 'native',
        isActive: true,
        features: ['UPI支付', '钱包支付', '银行卡支付'],
        supportedCurrencies: ['INR'],
        environment: 'production'
      }
    ]
  },
  wakeup: {
    id: 'wakeup',
    name: '唤醒支付商',
    type: PAYMENT_PROVIDER_TYPES.WAKEUP,
    description: '通过唤醒用户设备完成支付的创新支付方式',
    providers: [
      {
        id: 'unispay',
        name: 'unispay',
        displayName: 'UniSpay',
        type: PAYMENT_PROVIDER_TYPES.WAKEUP,
        category: 'wakeup',
        isActive: true,
        features: ['唤醒支付', 'UPI支付', '银行卡支付'],
        supportedCurrencies: ['INR'],
        environment: 'production'
      },
      {
        id: 'passpay',
        name: 'passpay',
        displayName: 'PassPay',
        type: PAYMENT_PROVIDER_TYPES.WAKEUP,
        category: 'wakeup',
        isActive: true,
        features: ['唤醒支付', 'UPI支付', '银行卡支付'],
        supportedCurrencies: ['INR'],
        environment: 'production'
      }
    ]
  }
};

class PaymentProviderService {
  /**
   * 获取所有支付商分类
   */
  static getCategories() {
    return Object.values(PAYMENT_PROVIDER_CATEGORIES);
  }

  /**
   * 根据类型获取支付商分类
   */
  static getCategoryByType(type) {
    return PAYMENT_PROVIDER_CATEGORIES[type];
  }

  /**
   * 获取所有支付商
   */
  static getAllProviders() {
    const allProviders = [];
    Object.values(PAYMENT_PROVIDER_CATEGORIES).forEach(category => {
      allProviders.push(...category.providers);
    });
    return allProviders;
  }

  /**
   * 根据类型获取支付商
   */
  static getProvidersByType(type) {
    const category = PAYMENT_PROVIDER_CATEGORIES[type];
    return category ? category.providers : [];
  }

  /**
   * 根据分类获取支付商
   */
  static getProvidersByCategory(categoryId) {
    const category = PAYMENT_PROVIDER_CATEGORIES[categoryId];
    return category ? category.providers : [];
  }

  /**
   * 获取激活的支付商
   */
  static getActiveProviders() {
    return this.getAllProviders().filter(provider => provider.isActive);
  }

  /**
   * 根据ID获取支付商
   */
  static getProviderById(providerId) {
    return this.getAllProviders().find(provider => provider.id === providerId);
  }

  /**
   * 根据名称获取支付商
   */
  static getProviderByName(providerName) {
    return this.getAllProviders().find(provider => provider.name === providerName);
  }

  /**
   * 验证支付商类型
   */
  static isValidProviderType(type) {
    return Object.values(PAYMENT_PROVIDER_TYPES).includes(type);
  }

  /**
   * 验证支付商名称
   */
  static isValidProviderName(providerName) {
    return this.getAllProviders().some(provider => provider.name === providerName);
  }

  /**
   * 获取支付商支持的功能
   */
  static getProviderFeatures(providerName) {
    const provider = this.getProviderByName(providerName);
    return provider ? provider.features : [];
  }

  /**
   * 获取支付商支持的货币
   */
  static getProviderCurrencies(providerName) {
    const provider = this.getProviderByName(providerName);
    return provider ? provider.supportedCurrencies : [];
  }

  /**
   * 检查支付商是否支持特定功能
   */
  static supportsFeature(providerName, feature) {
    const features = this.getProviderFeatures(providerName);
    return features.includes(feature);
  }

  /**
   * 检查支付商是否支持特定货币
   */
  static supportsCurrency(providerName, currency) {
    const currencies = this.getProviderCurrencies(providerName);
    return currencies.includes(currency);
  }

  /**
   * 获取支付商统计信息
   */
  static getProviderStats() {
    const stats = {
      total: this.getAllProviders().length,
      byType: {},
      byCategory: {}
    };

    // 按类型统计
    Object.values(PAYMENT_PROVIDER_TYPES).forEach(type => {
      stats.byType[type] = this.getProvidersByType(type).length;
    });

    // 按分类统计
    Object.keys(PAYMENT_PROVIDER_CATEGORIES).forEach(categoryId => {
      stats.byCategory[categoryId] = this.getProvidersByCategory(categoryId).length;
    });

    return stats;
  }
}

module.exports = PaymentProviderService;
