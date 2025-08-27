const mongoose = require('mongoose');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/indian-payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkDatabaseDirectly() {
  try {
    console.log('🔍 直接检查数据库...\n');
    
    // 等待连接
    await mongoose.connection.asPromise();
    const db = mongoose.connection.db;
    
    // 检查商户集合
    console.log('📊 商户集合:');
    const merchants = await db.collection('merchants').find({}).toArray();
    merchants.forEach(merchant => {
      console.log(`  - ${merchant.merchantId}: ${merchant.name} (${merchant.status})`);
    });
    
    console.log('');
    
    // 检查支付配置集合
    console.log('📊 支付配置集合:');
    const paymentConfigs = await db.collection('paymentconfigs').find({}).toArray();
    paymentConfigs.forEach(config => {
      console.log(`  - ${config._id}: ${config.accountName} (${config.merchantId})`);
    });
    
    console.log('');
    
    // 检查所有集合
    const collections = await db.listCollections().toArray();
    console.log('📊 所有集合:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  checkDatabaseDirectly();
}
