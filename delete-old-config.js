const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/indian-payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function deleteOldConfig() {
  try {
    console.log('🗑️  删除旧的支付配置...\n');
    
    // 删除旧的配置
    const result = await PaymentConfig.deleteMany({});
    console.log(`✅ 删除了 ${result.deletedCount} 个旧配置`);
    
  } catch (error) {
    console.error('❌ 删除失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行脚本
if (require.main === module) {
  deleteOldConfig();
}
