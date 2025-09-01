const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');

async function testDbConnection() {
  try {
    console.log('🔌 测试数据库连接...');
    
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/indian_payment_platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ 数据库连接成功');

    // 查询商户
    console.log('🔍 查询商户...');
    const merchant = await Merchant.findOne({ merchantId: 'test_merchant_001' });
    
    if (merchant) {
      console.log('✅ 商户查询成功:');
      console.log('商户ID:', merchant.merchantId);
      console.log('商户名称:', merchant.name);
      console.log('密钥:', merchant.secretKey);
      console.log('状态:', merchant.status);
    } else {
      console.log('❌ 商户未找到');
      
      // 列出所有商户
      const allMerchants = await Merchant.find({});
      console.log('所有商户:', allMerchants.map(m => ({ merchantId: m.merchantId, name: m.name, status: m.status })));
    }

    // 测试认证中间件的查询
    console.log('\n🔍 测试认证中间件查询...');
    const authMerchant = await Merchant.findOne({ merchantId: 'test_merchant_001', status: 'ACTIVE' });
    
    if (authMerchant) {
      console.log('✅ 认证查询成功');
    } else {
      console.log('❌ 认证查询失败');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ 数据库连接已关闭');
  }
}

// 运行测试
testDbConnection();
