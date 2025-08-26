const mongoose = require('mongoose');
const Merchant = require('./server/models/merchant');
require('dotenv').config();

/**
 * 检查测试商户信息
 */
async function checkTestMerchant() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 已连接到MongoDB');
    
    // 查找测试商户
    const merchant = await Merchant.findOne({
      merchantId: 'test_merchant_001'
    });
    
    if (!merchant) {
      console.log('❌ 未找到测试商户');
      return;
    }
    
    console.log('📝 测试商户信息:');
    console.log('- 商户ID:', merchant.merchantId);
    console.log('- 名称:', merchant.name);
    console.log('- 状态:', merchant.status);
    console.log('- 密钥:', merchant.secretKey);
    console.log('- 创建时间:', merchant.createdAt);
    console.log('- 更新时间:', merchant.updatedAt);
    
    // 显示完整对象
    console.log('\n🔍 完整商户对象:');
    console.log(JSON.stringify(merchant, null, 2));
    
  } catch (error) {
    console.error('❌ 检查商户失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开MongoDB连接');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkTestMerchant();
}

module.exports = { checkTestMerchant };

