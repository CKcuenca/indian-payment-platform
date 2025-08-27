const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createPaymentConfigForExisting() {
  try {
    console.log('🔍 为现有商户创建支付配置...\n');
    
    // 等待连接
    await mongoose.connection.asPromise();
    
    const merchantId = 'MERCHANT_ME01UHM7';
    
    // 检查是否已存在
    const existingConfig = await PaymentConfig.findOne({ 'merchantId': merchantId });
    if (existingConfig) {
      console.log('✅ 支付配置已存在:', existingConfig._id);
      return existingConfig;
    }

    // 创建支付配置
    const paymentConfig = new PaymentConfig({
      accountName: `${merchantId}_UNISPAY`,
      merchantId: merchantId,
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

    await paymentConfig.save();
    console.log('✅ 支付配置创建成功:', paymentConfig._id);
    return paymentConfig;

  } catch (error) {
    console.error('❌ 创建失败:', error);
    throw error;
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  createPaymentConfigForExisting()
    .then(() => {
      console.log('🎉 支付配置设置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 设置失败:', error);
      process.exit(1);
    });
}

module.exports = { createPaymentConfigForExisting };
