const mongoose = require('mongoose');
const PaymentConfig = require('../models/PaymentConfig');
require('dotenv').config();

/**
 * 初始化UNISPAY支付配置
 */
async function initUnispayConfig() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 已连接到MongoDB');
    
    // 检查是否已存在UNISPAY支付配置
    const existingConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay'
    });
    
    if (existingConfig) {
      console.log('⚠️  UNISPAY支付配置已存在，跳过初始化');
      console.log('现有配置:', {
        accountName: existingConfig.accountName,
        provider: existingConfig.provider.name,
        status: existingConfig.status
      });
      return;
    }
    
    // 创建UNISPAY支付配置
    const unispayConfig = new PaymentConfig({
      accountName: 'UNISPAY唤醒支付账户',
      merchantId: 'default', // 默认商户ID，实际使用时需要替换
      provider: {
        name: 'unispay',
        accountId: process.env.UNISPAY_MCH_NO || 'UNISPAY001',
        apiKey: process.env.UNISPAY_API_KEY || 'uk_test_123456789',
        secretKey: process.env.UNISPAY_SECRET_KEY || 'us_test_987654321',
        environment: process.env.UNISPAY_ENV || 'sandbox'
      },
      limits: {
        dailyLimit: 1000000,        // 日限额：100万卢比
        monthlyLimit: 10000000,     // 月限额：1000万卢比
        singleTransactionLimit: 100000, // 单笔限额：10万卢比
        minTransactionAmount: 100   // 最小交易金额：100卢比
      },
      usage: {
        dailyUsed: 0,
        monthlyUsed: 0,
        lastResetDate: new Date().toISOString()
      },
      status: 'ACTIVE',
      priority: 1, // 高优先级
      fees: {
        transactionFee: 0.5,  // 交易费率：0.5%
        fixedFee: 0           // 固定费用：0
      },
      collectionWebhookSuffix: 'unispay',
      payoutWebhookSuffix: 'unispay',
      description: 'UNISPAY唤醒支付 - 印度UPI转账到私人银行卡',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await unispayConfig.save();
    
    console.log('✅ UNISPAY支付配置初始化成功');
    console.log('配置详情:', {
      accountName: unispayConfig.accountName,
      provider: unispayConfig.provider.name,
      accountId: unispayConfig.provider.accountId,
      environment: unispayConfig.provider.environment,
      status: unispayConfig.status
    });
    
    console.log('\n📝 请根据实际情况修改以下配置：');
    console.log('1. merchantId: 替换为实际的商户ID');
    console.log('2. provider.accountId: 替换为实际的UNISPAY商户号');
    console.log('3. provider.apiKey: 替换为实际的API密钥');
    console.log('4. provider.secretKey: 替换为实际的签名密钥');
    console.log('5. provider.environment: 设置为production或test');
    
  } catch (error) {
    console.error('❌ UNISPAY支付配置初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开MongoDB连接');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initUnispayConfig();
}

module.exports = { initUnispayConfig };
