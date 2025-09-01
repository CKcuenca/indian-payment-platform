const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

/**
 * 创建唤醒支付配置
 */

async function createWakeupConfig() {
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ 已连接到MongoDB (payment-platform)');

    // 检查是否已存在唤醒支付配置
    const existingConfig = await PaymentConfig.findOne({ 'provider.name': 'wakeup' });
    
    if (existingConfig) {
      console.log('⚠️ 唤醒支付配置已存在，跳过创建');
      console.log('配置ID:', existingConfig._id);
      console.log('提供商:', existingConfig.provider.name);
      return existingConfig;
    }

    // 创建唤醒支付配置
    const wakeupConfig = new PaymentConfig({
      merchantId: 'test_merchant_001',
      accountName: 'wakeup_test_account',
      provider: {
        name: 'wakeup',
        type: 'wakeup',
        accountId: 'wakeup_account_001',
        apiKey: 'wakeup_api_key_001',
        secretKey: 'wakeup_secret_key_001',
        environment: 'sandbox'
      },
      limits: {
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        singleTransactionLimit: 100000,
        minTransactionAmount: 100,
        maxTransactionAmount: 5000000,
        largeAmountThreshold: 100000000,
        maxLargeTransactionsPerDay: 3
      },
      fees: {
        percentage: 0,
        fixedAmount: 0
      },
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await wakeupConfig.save();
    console.log('✅ 唤醒支付配置创建成功');
    console.log('配置ID:', wakeupConfig._id);
    console.log('提供商:', wakeupConfig.provider.name);
    console.log('状态:', wakeupConfig.status);

    return wakeupConfig;

  } catch (error) {
    console.error('❌ 创建唤醒支付配置失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  createWakeupConfig()
    .then(() => {
      console.log('🎯 唤醒支付配置创建完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createWakeupConfig };
