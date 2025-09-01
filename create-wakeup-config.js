const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

async function createWakeupConfig() {
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/payment-platform');
    console.log('✅ 连接到数据库');

    // 创建唤醒支付配置
    const wakeupConfig = new PaymentConfig({
      accountName: 'DhPay唤醒支付配置',
      provider: {
        name: 'dhpay',
        type: 'wakeup',
        accountId: '66', // DhPay商户ID
        apiKey: '', // DhPay不需要API密钥
        secretKey: 'CC3F988FCF248AA8C1007C5190D388AB', // DhPay商户密钥
        environment: 'test'
      },
      description: 'DhPay上游支付通道配置 - 只需要商户密钥',
      limits: {
        collection: {
          dailyLimit: 10000000,
          monthlyLimit: 100000000,
          singleTransactionLimit: 1000000,
          minTransactionAmount: 100
        },
        payout: {
          dailyLimit: 10000000,
          monthlyLimit: 100000000,
          singleTransactionLimit: 1000000,
          minTransactionAmount: 100
        }
      },
      fees: {
        collection: {
          transactionFee: 2.5,
          fixedFee: 0
        },
        payout: {
          transactionFee: 1.5,
          fixedFee: 5
        }
      },
      priority: 1,
      status: 'ACTIVE',
      merchantId: 'system'
    });

    await wakeupConfig.save();
    console.log('✅ DhPay唤醒支付配置创建成功');
    console.log('配置详情:', {
      accountName: wakeupConfig.accountName,
      provider: wakeupConfig.provider.name,
      type: wakeupConfig.provider.type,
      merchantId: wakeupConfig.provider.accountId,
      environment: wakeupConfig.provider.environment
    });

  } catch (error) {
    console.error('❌ 创建DhPay唤醒支付配置失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

createWakeupConfig();
