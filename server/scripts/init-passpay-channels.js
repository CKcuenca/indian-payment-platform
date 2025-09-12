const mongoose = require('mongoose');
const PaymentConfig = require('../models/PaymentConfig');
require('dotenv').config({ path: '../env.production' });

async function initPassPayChannels() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 检查是否已存在PassPay配置
    const existingPassPayConfigs = await PaymentConfig.find({
      'provider.name': 'passpay'
    });

    console.log(`找到 ${existingPassPayConfigs.length} 个现有的PassPay配置`);

    // 如果已经有双通道配置，不重复创建
    const hasNative = existingPassPayConfigs.some(c => c.provider.type === 'native');
    const hasWakeup = existingPassPayConfigs.some(c => c.provider.type === 'wakeup');

    if (hasNative && hasWakeup) {
      console.log('✅ PassPay双通道配置已存在，跳过创建');
      return;
    }

    // 获取现有PassPay配置的参数（复用账户信息）
    const baseConfig = existingPassPayConfigs[0];
    let accountId, secretKey;

    if (baseConfig) {
      accountId = baseConfig.provider.accountId;
      secretKey = baseConfig.provider.secretKey;
      console.log('📋 复用现有PassPay配置参数');
    } else {
      // 如果没有现有配置，使用环境变量
      accountId = process.env.PASSPAY_MCHID;
      secretKey = process.env.PASSPAY_SECRET;
      
      if (!accountId || !secretKey) {
        console.error('❌ 未找到PassPay配置参数，请检查环境变量');
        return;
      }
      console.log('📋 使用环境变量配置参数');
    }

    const channelsToCreate = [];

    // 创建PassPay原生通道配置
    if (!hasNative) {
      channelsToCreate.push({
        accountName: 'PassPay-原生',
        provider: {
          name: 'passpay',
          type: 'native',
          subType: 'third_party',
          accountId: accountId,
          payId: '12', // 原生通道
          secretKey: secretKey
        },
        environment: 'production',
        status: 'active',
        description: 'PassPay原生支付通道',
        supportedMethods: ['UPI', 'IMPS'],
        limits: {
          minAmount: 100,
          maxAmount: 500000,
          dailyLimit: 10000000
        },
        fees: {
          percentage: 0.5,
          fixedAmount: 0
        }
      });
    }

    // 创建PassPay唤醒通道配置  
    if (!hasWakeup) {
      channelsToCreate.push({
        accountName: 'PassPay-唤醒',
        provider: {
          name: 'passpay',
          type: 'wakeup',
          subType: 'third_party',
          accountId: accountId,
          payId: '10', // 唤醒通道
          secretKey: secretKey
        },
        environment: 'production',
        status: 'active',
        description: 'PassPay唤醒支付通道',
        supportedMethods: ['UPI', 'IMPS'],
        limits: {
          minAmount: 100,
          maxAmount: 500000,
          dailyLimit: 10000000
        },
        fees: {
          percentage: 0.5,
          fixedAmount: 0
        }
      });
    }

    if (channelsToCreate.length > 0) {
      console.log(`🔄 创建 ${channelsToCreate.length} 个PassPay通道配置...`);
      
      for (const config of channelsToCreate) {
        const newConfig = new PaymentConfig(config);
        await newConfig.save();
        console.log(`✅ 创建成功: ${config.accountName} (payId: ${config.provider.payId})`);
      }
    }

    // 显示所有PassPay配置
    const allPassPayConfigs = await PaymentConfig.find({
      'provider.name': 'passpay'
    }).select('accountName provider.type provider.payId status');

    console.log('\n📋 当前PassPay配置：');
    allPassPayConfigs.forEach(config => {
      console.log(`  - ${config.accountName}: ${config.provider.type} (payId: ${config.provider.payId}) - ${config.status}`);
    });

    console.log('\n✅ PassPay双通道配置初始化完成');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行初始化
initPassPayChannels();