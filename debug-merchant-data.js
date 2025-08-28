const mongoose = require('mongoose');
require('dotenv').config();

async function debugMerchantData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 检查商户数据
    const Merchant = require('./server/models/merchant');
    
    const merchant = await Merchant.findById('68af118a2c9faef3f2abebbf');
    
    if (merchant) {
      console.log('📋 数据库中的商户数据:');
      console.log('   商户ID:', merchant.merchantId);
      console.log('   名称:', merchant.name);
      console.log('   状态:', merchant.status);
      console.log('   完整对象:', JSON.stringify(merchant, null, 2));
      
      // 检查paymentConfig结构
      console.log('\n🔍 paymentConfig结构分析:');
      console.log('   paymentConfig存在:', !!merchant.paymentConfig);
      console.log('   paymentConfig类型:', typeof merchant.paymentConfig);
      
      if (merchant.paymentConfig) {
        console.log('   defaultProvider:', merchant.paymentConfig.defaultProvider);
        console.log('   fees存在:', !!merchant.paymentConfig.fees);
        console.log('   limits存在:', !!merchant.paymentConfig.limits);
        
        if (merchant.paymentConfig.fees) {
          console.log('   deposit费率:', merchant.paymentConfig.fees.deposit);
          console.log('   withdrawal费率:', merchant.paymentConfig.fees.withdrawal);
        }
        
        if (merchant.paymentConfig.limits) {
          console.log('   dailyLimit:', merchant.paymentConfig.limits.dailyLimit);
          console.log('   monthlyLimit:', merchant.paymentConfig.limits.monthlyLimit);
          console.log('   minDeposit:', merchant.paymentConfig.limits.minDeposit);
          console.log('   maxDeposit:', merchant.paymentConfig.limits.maxDeposit);
        }
      }
      
      // 检查是否有其他字段
      console.log('\n🔍 其他字段检查:');
      console.log('   所有字段:', Object.keys(merchant));
      
    } else {
      console.log('❌ 商户不存在');
    }
    
  } catch (error) {
    console.error('❌ 调试商户数据失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

debugMerchantData();
