const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Merchant = require('./server/models/Merchant');

async function checkMerchant() {
  try {
    const merchant = await Merchant.findOne({ merchantId: 'test_merchant_001' });
    console.log('查询结果:', merchant);
    
    if (merchant) {
      console.log('商户ID:', merchant.merchantId);
      console.log('是否激活:', merchant.isActive);
      console.log('密钥:', merchant.secretKey);
    }
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkMerchant();
