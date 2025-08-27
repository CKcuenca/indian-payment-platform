const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function getMerchantDetails() {
  try {
    console.log('🔍 获取商户详细信息...\n');
    
    // 等待连接
    await mongoose.connection.asPromise();
    
    // 获取第一个商户的详细信息
    const merchant = await Merchant.findOne({});
    if (merchant) {
      console.log('✅ 商户详情:');
      console.log('  - merchantId:', merchant.merchantId);
      console.log('  - name:', merchant.name);
      console.log('  - status:', merchant.status);
      console.log('  - apiKey:', merchant.apiKey);
      console.log('  - secretKey:', merchant.secretKey);
      console.log('  - email:', merchant.email);
      console.log('  - phone:', merchant.phone);
    } else {
      console.log('❌ 没有找到商户');
    }
    
  } catch (error) {
    console.error('❌ 获取失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  getMerchantDetails();
}
