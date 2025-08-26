const mongoose = require('mongoose');
const PaymentConfig = require('../models/PaymentConfig');
require('dotenv').config();

/**
 * 更新UNISPAY支付配置为真实商户信息
 */
async function updateUnispayConfig() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 已连接到MongoDB');
    
    // 查找现有的UNISPAY配置
    const existingConfig = await PaymentConfig.findOne({
      'provider.name': 'unispay'
    });
    
    if (!existingConfig) {
      console.log('❌ 未找到UNISPAY支付配置，请先运行初始化脚本');
      return;
    }
    
    // 更新为真实的商户信息
    const updateResult = await PaymentConfig.updateOne(
      { 'provider.name': 'unispay' },
      {
        $set: {
          'provider.accountId': 'K8886120871',
          'provider.apiKey': '8d64f6b25d704ebb9ca3e67fbc274dc7',
          'provider.secretKey': '8d64f6b25d704ebb9ca3e67fbc274dc7',
          'provider.environment': 'production',
          updatedAt: new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ UNISPAY支付配置更新成功');
      console.log('更新内容:');
      console.log('- 商户号: K8886120871');
      console.log('- 接口密钥: 8d64f6b25d704ebb9ca3e67fbc274dc7');
      console.log('- 环境: production');
      
      // 显示更新后的配置
      const updatedConfig = await PaymentConfig.findOne({
        'provider.name': 'unispay'
      });
      
      console.log('\n📝 当前配置详情:');
      console.log('- 账户名称:', updatedConfig.accountName);
      console.log('- 商户号:', updatedConfig.provider.accountId);
      console.log('- 环境:', updatedConfig.provider.environment);
      console.log('- 状态:', updatedConfig.status);
    } else {
      console.log('⚠️  配置未发生变化');
    }
    
  } catch (error) {
    console.error('❌ UNISPAY支付配置更新失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开MongoDB连接');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateUnispayConfig();
}

module.exports = { updateUnispayConfig };
