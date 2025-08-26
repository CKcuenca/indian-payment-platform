const mongoose = require('mongoose');
const PaymentConfig = require('../models/PaymentConfig');
require('dotenv').config();

/**
 * 初始化唤醒支付配置
 */
async function initWakeupConfig() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 已连接到MongoDB');
    
    // 检查是否已存在唤醒支付配置
    const existingConfig = await PaymentConfig.findOne({
      'provider.name': 'wakeup'
    });
    
    if (existingConfig) {
      console.log('⚠️  唤醒支付配置已存在，跳过初始化');
      console.log('现有配置:', {
        accountName: existingConfig.accountName,
        provider: existingConfig.provider.name,
        status: existingConfig.status
      });
      return;
    }
    
    // 创建唤醒支付配置
    const wakeupConfig = new PaymentConfig({
      accountName: '唤醒支付主账户',
      provider: {
        name: 'wakeup',
        accountId: 'WAKEUP001',
        apiKey: 'wk_prod_' + Math.random().toString(36).substr(2, 9),
        secretKey: 'ws_prod_' + Math.random().toString(36).substr(2, 9),
        environment: 'production'
      },
      limits: {
        dailyLimit: 1000000,        // 100万卢比
        monthlyLimit: 10000000,     // 1000万卢比
        singleTransactionLimit: 100000,  // 10万卢比
        minTransactionAmount: 100,       // 100卢比
        maxTransactionAmount: 500000,    // 50万卢比
        largeAmountThreshold: 1000000,   // 100万卢比
        maxLargeTransactionsPerDay: 5
      },
      usage: {
        dailyUsed: 0,
        monthlyUsed: 0,
        lastResetDate: new Date().toISOString()
      },
      status: 'ACTIVE',
      priority: 3,
      fees: {
        transactionFee: 0.3,  // 0.3%手续费
        fixedFee: 0
      },
      collectionWebhookSuffix: 'wakeup',
      payoutWebhookSuffix: 'wakeup',
      description: '唤醒支付 - UPI转账到私人银行卡账户，适用于印度本地支付场景',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    await wakeupConfig.save();
    
    console.log('✅ 唤醒支付配置创建成功');
    console.log('配置详情:', {
      accountName: wakeupConfig.accountName,
      provider: wakeupConfig.provider.name,
      accountId: wakeupConfig.provider.accountId,
      dailyLimit: wakeupConfig.limits.dailyLimit,
      monthlyLimit: wakeupConfig.limits.monthlyLimit,
      transactionFee: wakeupConfig.fees.transactionFee,
      status: wakeupConfig.status
    });
    
    console.log('\n📋 唤醒支付配置说明:');
    console.log('- 支付方式: UPI转账到私人银行卡');
    console.log('- 适用场景: 印度本地游戏充值');
    console.log('- 手续费: 0.3%');
    console.log('- 日限额: 100万卢比');
    console.log('- 月限额: 1000万卢比');
    console.log('- 单笔限额: 10万卢比');
    
    console.log('\n🔧 下一步操作:');
    console.log('1. 在支付管理页面中可以看到新创建的唤醒支付账户');
    console.log('2. 可以调整限额和手续费设置');
    console.log('3. 使用 /api/wakeup/* 接口进行支付测试');
    
  } catch (error) {
    console.error('❌ 初始化唤醒支付配置失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initWakeupConfig()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initWakeupConfig };
