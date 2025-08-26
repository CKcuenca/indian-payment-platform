const mongoose = require('mongoose');
const Merchant = require('../models/merchant');
require('dotenv').config();

/**
 * 初始化测试商户
 */
async function initTestMerchant() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 已连接到MongoDB');
    
    // 检查是否已存在测试商户
    const existingMerchant = await Merchant.findOne({
      merchantId: 'test_merchant_001'
    });
    
    if (existingMerchant) {
      console.log('⚠️  测试商户已存在，跳过初始化');
      console.log('现有商户:', {
        merchantId: existingMerchant.merchantId,
        name: existingMerchant.name,
        status: existingMerchant.status
      });
      return;
    }
    
    // 创建测试商户
    const testMerchant = new Merchant({
      merchantId: 'test_merchant_001',
      name: '测试商户',
      email: 'test@example.com',
      phone: '919876543210',
      status: 'ACTIVE',
      secretKey: 'test_secret_key_456',
      permissions: ['payment', 'query'],
      limits: {
        dailyLimit: 1000000,        // 日限额：100万卢比
        monthlyLimit: 10000000,     // 月限额：1000万卢比
        singleTransactionLimit: 100000, // 单笔限额：10万卢比
        minTransactionAmount: 100   // 最小交易金额：100卢比
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await testMerchant.save();
    
    console.log('✅ 测试商户初始化成功');
    console.log('商户详情:', {
      merchantId: testMerchant.merchantId,
      name: testMerchant.name,
      status: testMerchant.status,
      secretKey: testMerchant.secretKey
    });
    
    console.log('\n📝 测试商户信息：');
    console.log('商户ID: test_merchant_001');
    console.log('密钥: test_secret_key_456');
    
  } catch (error) {
    console.error('❌ 测试商户初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开MongoDB连接');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initTestMerchant();
}

module.exports = { initTestMerchant };
