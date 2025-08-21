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
    
    console.log('Connected to MongoDB');

    // 检查是否已存在测试商户
    const existingMerchant = await Merchant.findOne({ merchantId: 'TEST001' });
    
    if (existingMerchant) {
      console.log('Test merchant already exists:', existingMerchant.merchantId);
      return existingMerchant;
    }

    // 创建测试商户
    const testMerchant = new Merchant({
      merchantId: 'TEST001',
      name: '测试商户',
      email: 'test@example.com',
      phone: '+919876543210',
      status: 'ACTIVE',
      apiKey: 'test-api-key-12345', // 测试用API密钥
      balance: {
        available: 100000, // 1000卢比（以分为单位）
        frozen: 0
      },
      currency: 'INR',
      secretKey: 'test-secret-key-12345', // 测试用密钥
      paymentConfig: {
        defaultProvider: 'mock',
        providers: [
          {
            name: 'mock',
            enabled: true,
            config: {}
          },
          {
            name: 'passpay',
            enabled: true,
            config: {}
          }
        ],
        fees: {
          deposit: 0.01, // 1%
          withdrawal: 0.01 // 1%
        },
        limits: {
          minDeposit: 100, // 1卢比
          maxDeposit: 1000000, // 10000卢比
          minWithdrawal: 100, // 1卢比
          maxWithdrawal: 1000000 // 10000卢比
        }
      },
      address: {
        street: '测试街道',
        city: '孟买',
        state: '马哈拉施特拉邦',
        country: '印度',
        postalCode: '400001'
      },
      kycStatus: 'VERIFIED',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testMerchant.save();
    console.log('Test merchant created successfully:', testMerchant.merchantId);
    
    return testMerchant;

  } catch (error) {
    console.error('Error creating test merchant:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initTestMerchant()
    .then(() => {
      console.log('Test merchant initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test merchant initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initTestMerchant };
