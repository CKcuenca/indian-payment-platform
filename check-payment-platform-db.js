const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');
const PaymentConfig = require('./server/models/PaymentConfig');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkPaymentPlatformDB() {
  try {
    console.log('🔍 检查payment-platform数据库...\n');
    
    // 等待连接
    await mongoose.connection.asPromise();
    
    // 检查商户
    console.log('📊 商户集合:');
    const merchants = await Merchant.find({});
    merchants.forEach(merchant => {
      console.log(`  - ${merchant.merchantId}: ${merchant.name} (${merchant.status})`);
    });
    
    console.log('');
    
    // 检查支付配置
    console.log('📊 支付配置集合:');
    const paymentConfigs = await PaymentConfig.find({});
    paymentConfigs.forEach(config => {
      console.log(`  - ${config._id}: ${config.accountName} (${config.merchantId})`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  checkPaymentPlatformDB();
}
