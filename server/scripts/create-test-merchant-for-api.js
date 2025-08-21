const mongoose = require('mongoose');

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB连接成功');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    process.exit(1);
  }
};

// 创建测试商户
const createTestMerchant = async () => {
  try {
    console.log('🔧 创建测试商户...');
    
    // 确保模型被加载
    require('../models/merchant');
    const Merchant = mongoose.models.Merchant;
    
    // 检查是否已存在
    const existingMerchant = await Merchant.findOne({ apiKey: 'test-api-key' });
    if (existingMerchant) {
      console.log('✅ 测试商户已存在:', existingMerchant.merchantId);
      return existingMerchant;
    }
    
    // 创建新商户
    const testMerchant = new Merchant({
      merchantId: 'TEST002',
      name: 'API测试商户',
      email: 'apitest@example.com',
      phone: '9876543211',
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      status: 'ACTIVE',
      limits: {
        daily: 1000000,  // 10000 INR
        monthly: 10000000,  // 100000 INR
        perTransaction: 100000  // 1000 INR
      },
      paymentMethods: ['UPI', 'CARD', 'NETBANKING'],
      webhookUrl: 'https://example.com/webhook',
      callbackUrl: 'https://example.com/callback'
    });
    
    await testMerchant.save();
    console.log('✅ 测试商户创建成功:', testMerchant.merchantId);
    return testMerchant;
    
  } catch (error) {
    console.error('❌ 创建测试商户失败:', error.message);
    throw error;
  }
};

// 主函数
const main = async () => {
  try {
    await connectDB();
    await createTestMerchant();
    console.log('\n🎉 测试商户创建完成！');
    console.log('现在可以使用 API Key: test-api-key 来测试接口');
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { createTestMerchant };
