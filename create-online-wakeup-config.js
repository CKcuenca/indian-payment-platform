const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createOnlineWakeupConfig() {
  try {
    console.log('🔧 开始配置线上wakeup支付提供商...');
    
    // 检查是否已存在wakeup配置
    const existingConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup'
    });
    
    if (existingConfig) {
      console.log('✅ wakeup配置已存在:', existingConfig._id);
      return existingConfig;
    }
    
    // 创建wakeup支付配置
    const wakeupConfig = new PaymentConfig({
      merchantId: 'DEMO001', // 使用演示商户ID
      accountName: 'Wakeup支付账户',
      provider: {
        type: 'wakeup',
        name: 'wakeup',
        accountId: 'WAKEUP001',
        environment: 'production',
        apiKey: 'wakeup_api_key_123',
        secretKey: 'wakeup_secret_key_123'
      },
      limits: {
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        singleTransactionLimit: 100000,
        minTransactionAmount: 100
      },
      fees: {
        transactionFee: 0.5,
        fixedFee: 0
      },
      status: 'ACTIVE',
      priority: 1,
      description: 'Wakeup唤醒支付账户，支持UPI转账'
    });
    
    await wakeupConfig.save();
    console.log('✅ wakeup支付配置创建成功:', wakeupConfig._id);
    
    return wakeupConfig;
    
  } catch (error) {
    console.error('❌ 创建wakeup配置失败:', error);
    throw error;
  }
}

// 运行脚本
if (require.main === module) {
  createOnlineWakeupConfig()
    .then(() => {
      console.log('🎉 wakeup支付配置设置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 设置失败:', error);
      process.exit(1);
    });
}

module.exports = { createOnlineWakeupConfig };
