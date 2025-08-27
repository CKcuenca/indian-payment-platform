const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');
const PaymentConfig = require('./server/models/PaymentConfig');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/indian-payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkTestData() {
  try {
    console.log('🔍 检查测试数据...\n');
    
    // 检查商户
    const merchant = await Merchant.findOne({ merchantId: 'TEST001' });
    if (merchant) {
      console.log('✅ 商户存在:');
      console.log('  - ID:', merchant.merchantId);
      console.log('  - 名称:', merchant.name);
      console.log('  - 状态:', merchant.status);
      console.log('  - API Key:', merchant.apiKey);
      console.log('  - Secret Key:', merchant.secretKey);
    } else {
      console.log('❌ 商户不存在');
    }
    
    console.log('');
    
    // 检查支付配置
    const paymentConfig = await PaymentConfig.findOne({ 'merchantId': 'TEST001' });
    if (paymentConfig) {
      console.log('✅ 支付配置存在:');
      console.log('  - ID:', paymentConfig._id);
      console.log('  - 账户名:', paymentConfig.accountName);
      console.log('  - 商户ID:', paymentConfig.merchantId);
      console.log('  - 状态:', paymentConfig.status);
      console.log('  - 支付商:', paymentConfig.provider.name);
      console.log('  - 类型:', paymentConfig.provider.type);
    } else {
      console.log('❌ 支付配置不存在');
    }
    
    console.log('');
    
    // 检查数据库连接
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 数据库集合:');
    collections.forEach(collection => {
      console.log('  -', collection.name);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  checkTestData();
}
