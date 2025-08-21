const PaymentManager = require('./services/payment-manager');
const MockProvider = require('./services/payment-providers/mock-provider');
const PassPayProvider = require('./services/payment-providers/passpay-provider');

// 创建支付管理器实例
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

// 设置默认提供者为模拟提供者
paymentManager.setDefaultProvider('mock');

// 初始化所有提供者
paymentManager.initializeProviders();

module.exports = paymentManager;
