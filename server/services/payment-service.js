const PaymentManager = require('./payment-manager');
const MockProvider = require('./payment-providers/mock-provider');

// 创建全局支付管理器实例
const paymentManager = new PaymentManager();

// 注册模拟提供者
paymentManager.registerProvider('mock', new MockProvider({}));

// 设置默认提供者为模拟提供者
paymentManager.setDefaultProvider('mock');

// 初始化所有提供者
paymentManager.initializeProviders();

module.exports = paymentManager;
