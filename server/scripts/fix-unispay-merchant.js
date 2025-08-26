const mongoose = require('mongoose');
const PaymentConfig = require('../models/PaymentConfig');
require('dotenv').config();

/**
 * 修复UNISPAY配置的merchantId字段
 */
async function fixUnispayMerchant() {
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
      console.log('❌ 未找到UNISPAY支付配置');
      return;
    }
    
    console.log('📝 当前配置:');
    console.log('- 商户ID:', existingConfig.merchantId);
    console.log('- 账户名称:', existingConfig.accountName);
    
    // 更新merchantId字段
    const updateResult = await PaymentConfig.updateOne(
      { 'provider.name': 'unispay' },
      {
        $set: {
          merchantId: 'test_merchant_001', // 设置为测试商户ID
          updatedAt: new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ UNISPAY配置merchantId修复成功');
      console.log('修复内容:');
      console.log('- 商户ID: test_merchant_001');
      
      // 显示修复后的配置
      const fixedConfig = await PaymentConfig.findOne({
        'provider.name': 'unispay'
      });
      
      console.log('\n📝 修复后的配置:');
      console.log('- 商户ID:', fixedConfig.merchantId);
      console.log('- 账户名称:', fixedConfig.accountName);
      console.log('- 支付商:', fixedConfig.provider.name);
      console.log('- 状态:', fixedConfig.status);
    } else {
      console.log('⚠️  配置未发生变化');
    }
    
  } catch (error) {
    console.error('❌ UNISPAY配置修复失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开MongoDB连接');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixUnispayMerchant();
}

module.exports = { fixUnispayMerchant };
