import { PaymentProviderType, PaymentProviderCategory, PaymentProvider } from '../types';

// 原生支付商配置
export const NATIVE_PROVIDERS: PaymentProvider[] = [
  {
    id: 'airpay',
    name: 'airpay',
    displayName: 'AirPay',
    type: PaymentProviderType.NATIVE,
    category: 'native',
    isActive: true,
    features: ['UPI支付', '银行卡支付', '钱包支付'],
    supportedCurrencies: ['INR'],
    environment: 'production',
    config: {
      apiKey: '',
      secretKey: '',
      accountId: '',
      webhookUrl: ''
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000,
      dailyLimit: 10000000,
      monthlyLimit: 100000000
    },
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cashfree',
    name: 'cashfree',
    displayName: 'CashFree',
    type: PaymentProviderType.NATIVE,
    category: 'native',
    isActive: true,
    features: ['UPI支付', '银行卡支付', '网银支付'],
    supportedCurrencies: ['INR'],
    environment: 'production',
    config: {
      apiKey: '',
      secretKey: '',
      accountId: '',
      webhookUrl: ''
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000,
      dailyLimit: 10000000,
      monthlyLimit: 100000000
    },
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'razorpay',
    name: 'razorpay',
    displayName: 'Razorpay',
    type: PaymentProviderType.NATIVE,
    category: 'native',
    isActive: true,
    features: ['UPI支付', '银行卡支付', '钱包支付'],
    supportedCurrencies: ['INR'],
    environment: 'production',
    config: {
      apiKey: '',
      secretKey: '',
      accountId: '',
      webhookUrl: ''
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000,
      dailyLimit: 10000000,
      monthlyLimit: 100000000
    },
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'paytm',
    name: 'paytm',
    displayName: 'Paytm',
    type: PaymentProviderType.NATIVE,
    category: 'native',
    isActive: true,
    features: ['UPI支付', '钱包支付', '银行卡支付'],
    supportedCurrencies: ['INR'],
    environment: 'production',
    config: {
      apiKey: '',
      secretKey: '',
      accountId: '',
      webhookUrl: ''
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000,
      dailyLimit: 10000000,
      monthlyLimit: 100000000
    },
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 唤醒支付商配置
export const WAKEUP_PROVIDERS: PaymentProvider[] = [
  {
    id: 'unispay',
    name: 'unispay',
    displayName: 'UniSpay',
    type: PaymentProviderType.WAKEUP,
    category: 'wakeup',
    isActive: true,
    features: ['唤醒支付', 'UPI支付', '银行卡支付'],
    supportedCurrencies: ['INR'],
    environment: 'production',
    config: {
      apiKey: '',
      secretKey: '',
      accountId: '',
      webhookUrl: ''
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000,
      dailyLimit: 10000000,
      monthlyLimit: 100000000
    },
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'passpay',
    name: 'passpay',
    displayName: 'PassPay',
    type: PaymentProviderType.WAKEUP,
    category: 'wakeup',
    isActive: true,
    features: ['唤醒支付', 'UPI支付', '银行卡支付'],
    supportedCurrencies: ['INR'],
    environment: 'production',
    config: {
      apiKey: '',
      secretKey: '',
      accountId: '',
      webhookUrl: ''
    },
    limits: {
      minAmount: 100,
      maxAmount: 1000000,
      dailyLimit: 10000000,
      monthlyLimit: 100000000
    },
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 支付商分类配置
export const PAYMENT_PROVIDER_CATEGORIES: PaymentProviderCategory[] = [
  {
    id: 'native',
    name: '原生支付商',
    type: PaymentProviderType.NATIVE,
    description: '直接与银行和支付网络集成的支付服务商',
    providers: NATIVE_PROVIDERS
  },
  {
    id: 'wakeup',
    name: '唤醒支付商',
    type: PaymentProviderType.WAKEUP,
    description: '通过唤醒用户设备完成支付的创新支付方式',
    providers: WAKEUP_PROVIDERS
  }
];

// 获取所有支付商
export const getAllProviders = (): PaymentProvider[] => [
  ...NATIVE_PROVIDERS,
  ...WAKEUP_PROVIDERS
];

// 根据类型获取支付商
export const getProvidersByType = (type: PaymentProviderType): PaymentProvider[] => {
  return getAllProviders().filter(provider => provider.type === type);
};

// 根据分类获取支付商
export const getProvidersByCategory = (category: string): PaymentProvider[] => {
  return getAllProviders().filter(provider => provider.category === category);
};

// 获取激活的支付商
export const getActiveProviders = (): PaymentProvider[] => {
  return getAllProviders().filter(provider => provider.isActive);
};
