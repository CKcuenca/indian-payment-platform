const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');

/**
 * 创建本地测试商户账号
 */

async function createTestMerchant() {
  try {
    // 连接数据库 - 使用服务器相同的数据库
    await mongoose.connect('mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ 已连接到MongoDB (payment-platform)');

    // 检查是否已存在测试商户
    const existingMerchant = await Merchant.findOne({ merchantId: 'test_merchant_001' });
    
    if (existingMerchant) {
      console.log('⚠️ 测试商户已存在，跳过创建');
      console.log('商户ID:', existingMerchant.merchantId);
      console.log('商户名称:', existingMerchant.name);
      return existingMerchant;
    }

    // 创建测试商户
    const testMerchant = new Merchant({
      merchantId: 'test_merchant_001',
      name: '测试商户',
      email: 'test@merchant.com',
      phone: '919876543210',
      apiKey: 'pk_test_merchant_001',
      secretKey: 'test_secret_key_001',
      status: 'ACTIVE',
      paymentConfig: {
        fees: {
          deposit: 0.01,
          withdrawal: 0.01
        },
        limits: {
          minDeposit: 100,
          maxDeposit: 50000,
          minWithdrawal: 100,
          maxWithdrawal: 50000
        },
        defaultProvider: 'wakeup',
        providers: []
      },
      balance: {
    available: 0,
    frozen: 0
  }, // 使用Number类型
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testMerchant.save();
    console.log('✅ 测试商户创建成功');
    console.log('商户ID:', testMerchant.merchantId);
    console.log('商户名称:', testMerchant.name);
    console.log('API密钥:', testMerchant.apiKey);
    console.log('密钥:', testMerchant.secretKey);
    console.log('状态:', testMerchant.status);

    return testMerchant;

  } catch (error) {
    console.error('❌ 创建测试商户失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  createTestMerchant()
    .then(() => {
      console.log('🎯 测试商户创建完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createTestMerchant };

