const mongoose = require('mongoose');
const PaymentConfig = require('../models/PaymentConfig');
const path = require('path');

// 根据环境加载不同的配置文件
const envFile = process.env.NODE_ENV === 'test' ? '../env.test' : '../env.production';
require('dotenv').config({ path: path.join(__dirname, envFile) });

/**
 * 更新PassPay双通道为不同的账户参数
 */
async function updatePassPayDualAccounts() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 查找现有的PassPay配置
    const passpayConfigs = await PaymentConfig.find({
      'provider.name': 'passpay'
    });

    if (passpayConfigs.length === 0) {
      console.log('❌ 未找到PassPay配置');
      return;
    }

    console.log(`找到 ${passpayConfigs.length} 个PassPay配置`);

    // 定义不同通道的账户参数
    const accountSettings = {
      native: {
        accountId: process.env.PASSPAY_NATIVE_MCHID || '14252318', // 原生通道商户号
        secretKey: process.env.PASSPAY_NATIVE_SECRET || 'your_native_secret_key', // 原生通道密钥
        payId: '12'
      },
      wakeup: {
        accountId: process.env.PASSPAY_WAKEUP_MCHID || '14252319', // 唤醒通道商户号  
        secretKey: process.env.PASSPAY_WAKEUP_SECRET || 'your_wakeup_secret_key', // 唤醒通道密钥
        payId: '10'
      }
    };

    console.log('🔄 更新PassPay通道配置...');

    for (const config of passpayConfigs) {
      const channelType = config.provider.type;
      const settings = accountSettings[channelType];
      
      if (!settings) {
        console.log(`⚠️ 跳过未知通道类型: ${channelType}`);
        continue;
      }

      // 更新配置
      const updateResult = await PaymentConfig.updateOne(
        { _id: config._id },
        {
          $set: {
            'provider.accountId': settings.accountId,
            'provider.secretKey': settings.secretKey,
            'provider.payId': settings.payId,
            'updatedAt': new Date()
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        console.log(`✅ 更新成功: ${config.accountName}`);
        console.log(`   - accountId: ${settings.accountId}`);
        console.log(`   - payId: ${settings.payId}`);
        console.log(`   - secretKey: ${'*'.repeat(settings.secretKey.length)}`);
      } else {
        console.log(`⚠️ 更新失败: ${config.accountName}`);
      }
    }

    // 显示更新后的配置
    console.log('\n📋 更新后的PassPay配置：');
    const updatedConfigs = await PaymentConfig.find({
      'provider.name': 'passpay'
    }).select('accountName provider.type provider.payId provider.accountId');

    updatedConfigs.forEach(config => {
      console.log(`  - ${config.accountName}:`);
      console.log(`    类型: ${config.provider.type}`);
      console.log(`    payId: ${config.provider.payId}`);
      console.log(`    accountId: ${config.provider.accountId}`);
    });

    console.log('\n✅ PassPay双通道账户参数更新完成');
    
    // 提供环境变量示例
    console.log('\n💡 环境变量配置示例:');
    console.log('PASSPAY_NATIVE_MCHID=14252318     # 原生通道商户号');
    console.log('PASSPAY_NATIVE_SECRET=your_secret  # 原生通道密钥');
    console.log('PASSPAY_WAKEUP_MCHID=14252319     # 唤醒通道商户号');
    console.log('PASSPAY_WAKEUP_SECRET=your_secret  # 唤醒通道密钥');

  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行更新
updatePassPayDualAccounts();