const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Merchant = require('./server/models/Merchant');

async function createTestMerchant() {
  try {
    // 检查是否已存在
    const existingMerchant = await Merchant.findOne({ merchantId: 'test_merchant_001' });
    if (existingMerchant) {
      console.log('测试商户已存在:', existingMerchant.merchantId);
      return;
    }

    // 创建测试商户
    const merchant = new Merchant({
      merchantId: 'test_merchant_001',
      name: '测试商户',
      email: 'test@example.com',
      phone: '+91-9876543210',
      address: '测试地址',
      balance: 10000,
      isActive: true,
      secretKey: 'test_secret_key_123',
      apiKey: 'test_api_key_123',
      defaultPaymentProvider: 'mock',
      feeRate: 0.02,
      dailyLimit: 100000,
      monthlyLimit: 1000000,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await merchant.save();
    console.log('测试商户创建成功:', merchant.merchantId);
  } catch (error) {
    console.error('创建测试商户失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestMerchant();
