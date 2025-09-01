const PaymentManager = require('./payment-manager');
const MockProvider = require('./payment-providers/mock-provider');
const PassPayProvider = require('./payment-providers/passpay-provider');
const UnispayProvider = require('./payment-providers/unispay-provider');

// 创建全局支付管理器实例
const paymentManager = new PaymentManager();

// 注册模拟提供者
paymentManager.registerProvider('mock', new MockProvider({}));

// 注册PassPay提供者
paymentManager.registerProvider('passpay', new PassPayProvider({
  provider: {
    accountId: process.env.PASSPAY_ACCOUNT_ID || '10000000',
    payId: process.env.PASSPAY_PAY_ID || '10',
    secretKey: process.env.PASSPAY_SECRET_KEY || 'your_secret_key'
  }
}));

// 注册UniSpay提供者
paymentManager.registerProvider('unispay', new UnispayProvider({
  accountId: process.env.UNISPAY_MCH_NO || 'K8886120871',
  apiKey: process.env.UNISPAY_API_KEY || '8d64f6b25d704ebb9ca3e67fbc274dc7',
  secretKey: process.env.UNISPAY_SECRET_KEY || '8d64f6b25d704ebb9ca3e67fbc274dc7',
  environment: process.env.UNISPAY_ENVIRONMENT || 'production'
}));



// 设置默认提供者为模拟提供者
paymentManager.setDefaultProvider('mock');

// 初始化所有提供者
paymentManager.initializeProviders();

module.exports = paymentManager;
