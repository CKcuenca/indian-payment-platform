const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestMerchant() {
  try {
    // 检查是否已存在
    const existingMerchant = await Merchant.findOne({ merchantId: 'TEST001' });
    if (existingMerchant) {
      console.log('✅ 测试商户已存在:', existingMerchant.merchantId);
      return existingMerchant;
    }

    // 创建测试商户
    const testMerchant = new Merchant({
      merchantId: 'TEST001',
      name: '测试游戏公司',
      email: 'test@game.com', // 可选字段
      phone: '+91-9876543210', // 可选字段
      status: 'ACTIVE',
      apiKey: 'test_api_key_' + Date.now(),
      secretKey: 'test_secret_key_' + Date.now(),
      paymentConfig: {
        defaultProvider: 'unispay',
        providers: [
          {
            name: 'unispay',
            enabled: true,
            config: {}
          },
          {
            name: 'passpay',
            enabled: true,
            config: {}
          },
          {
            name: 'wakeup',
            enabled: true,
            config: {}
          }
        ]
      }
    });

    await testMerchant.save();
    console.log('✅ 测试商户创建成功:', testMerchant.merchantId);
    return testMerchant;

  } catch (error) {
    console.error('❌ 创建测试商户失败:', error);
    throw error;
  }
}

// 运行脚本
if (require.main === module) {
  createTestMerchant()
    .then(() => {
      console.log('🎉 测试商户设置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 设置失败:', error);
      process.exit(1);
    });
}

module.exports = { createTestMerchant };

