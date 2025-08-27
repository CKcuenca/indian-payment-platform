const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/indian-payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testAuthMiddleware() {
  try {
    console.log('🔍 测试认证中间件逻辑...\n');
    
    // 等待连接
    await mongoose.connection.asPromise();
    
    // 模拟请求参数
    const appid = 'TEST001';
    const sign = 'test_sign';
    
    console.log('📝 请求参数:');
    console.log('  - appid:', appid);
    console.log('  - sign:', sign);
    
    // 查找商户
    console.log('\n🔍 查找商户...');
    const merchant = await Merchant.findOne({ merchantId: appid, status: 'ACTIVE' });
    
    if (merchant) {
      console.log('✅ 商户找到:');
      console.log('  - ID:', merchant.merchantId);
      console.log('  - 名称:', merchant.name);
      console.log('  - 状态:', merchant.status);
      console.log('  - API Key:', merchant.apiKey);
      console.log('  - Secret Key:', merchant.secretKey);
    } else {
      console.log('❌ 商户未找到');
      
      // 检查所有商户
      console.log('\n🔍 检查所有商户:');
      const allMerchants = await Merchant.find({});
      allMerchants.forEach(m => {
        console.log(`  - ${m.merchantId}: ${m.name} (${m.status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  testAuthMiddleware();
}
