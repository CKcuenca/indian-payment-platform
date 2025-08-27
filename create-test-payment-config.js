const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestPaymentConfig() {
  try {
    // 检查是否已存在
    const existingConfig = await PaymentConfig.findOne({ 'merchantId': 'TEST001' });
    if (existingConfig) {
      console.log('✅ 测试支付配置已存在:', existingConfig._id);
      return existingConfig;
    }

    // 创建测试支付配置
    const testConfig = new PaymentConfig({
      accountName: 'TEST001_UNISPAY',
      merchantId: 'TEST001',
      status: 'ACTIVE',
      provider: {
        name: 'unispay',
        type: 'wakeup',
        accountId: 'test_unispay_account_001',
        apiKey: 'test_unispay_api_key',
        secretKey: 'test_unispay_secret_key',
        environment: 'sandbox'
      },
      limits: {
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        singleTransactionLimit: 100000,
        minTransactionAmount: 100,
        maxTransactionAmount: 100000
      },
      fees: {
        deposit: 0.01,
        withdrawal: 0.02
      }
    });
    
    console.log('🔍 创建配置对象:', JSON.stringify(testConfig, null, 2));

    await testConfig.save();
    console.log('✅ 测试支付配置创建成功:', testConfig._id);
    return testConfig;

  } catch (error) {
    console.error('❌ 创建测试支付配置失败:', error);
    throw error;
  }
}

// 运行脚本
if (require.main === module) {
  createTestPaymentConfig()
    .then(() => {
      console.log('🎉 测试支付配置设置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 设置失败:', error);
      process.exit(1);
    });
}

module.exports = { createTestPaymentConfig };
