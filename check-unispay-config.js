const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');
require('dotenv').config();

/**
 * 检查UNISPAY配置信息
 */
async function checkUnispayConfig() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 已连接到MongoDB');
    
    // 查找UNISPAY配置
    const config = await PaymentConfig.findOne({
      'provider.name': 'unispay'
    });
    
    if (!config) {
      console.log('❌ 未找到UNISPAY配置');
      return;
    }
    
    console.log('📝 UNISPAY配置信息:');
    console.log('- 账户名称:', config.accountName);
    console.log('- 商户ID:', config.merchantId);
    console.log('- 支付商:', config.provider.name);
    console.log('- 账户ID:', config.provider.accountId);
    console.log('- 环境:', config.provider.environment);
    console.log('- 状态:', config.status);
    console.log('- 创建时间:', config.createdAt);
    console.log('- 更新时间:', config.updatedAt);
    
    // 显示完整对象
    console.log('\n🔍 完整配置对象:');
    console.log(JSON.stringify(config, null, 2));
    
  } catch (error) {
    console.error('❌ 检查UNISPAY配置失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开MongoDB连接');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkUnispayConfig();
}

module.exports = { checkUnispayConfig };
