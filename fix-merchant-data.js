const mongoose = require('mongoose');
require('dotenv').config();

async function fixMerchantData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 修复商户数据
    const Merchant = require('./server/models/merchant');
    
    // 查找TEST001商户
    const merchant = await Merchant.findOne({ merchantId: 'TEST001' });
    
    if (merchant) {
      console.log('📋 当前商户数据:');
      console.log('   商户ID:', merchant.merchantId);
      console.log('   名称:', merchant.name);
      console.log('   状态:', merchant.status);
      console.log('   支付配置:', merchant.paymentConfig);
      
      // 更新商户数据，确保有完整的paymentConfig结构
      const updateResult = await Merchant.updateOne(
        { merchantId: 'TEST001' },
        {
          $set: {
            'paymentConfig.defaultProvider': 'airpay',
            'paymentConfig.fees.deposit': 0.01, // 1%
            'paymentConfig.fees.withdrawal': 0.02, // 2%
            'paymentConfig.limits.minDeposit': 100,
            'paymentConfig.limits.maxDeposit': 5000000,
            'paymentConfig.limits.minWithdrawal': 100,
            'paymentConfig.limits.maxWithdrawal': 5000000,
            'paymentConfig.limits.dailyLimit': 50000000,
            'paymentConfig.limits.monthlyLimit': 500000000,
            'paymentConfig.limits.allowLargeTransactions': false,
            'paymentConfig.limits.maxLargeTransactionsPerDay': 3
          }
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log('✅ 商户数据已更新');
        console.log('   添加了完整的支付配置结构');
      } else {
        console.log('ℹ️ 商户数据无需更新');
      }
      
      // 验证更新结果
      const updatedMerchant = await Merchant.findOne({ merchantId: 'TEST001' });
      console.log('\n📋 更新后的商户数据:');
      console.log('   默认支付商:', updatedMerchant.paymentConfig?.defaultProvider);
      console.log('   充值费率:', updatedMerchant.paymentConfig?.fees?.deposit);
      console.log('   提现费率:', updatedMerchant.paymentConfig?.fees?.withdrawal);
      console.log('   每日额度:', updatedMerchant.paymentConfig?.limits?.dailyLimit);
      console.log('   每月额度:', updatedMerchant.paymentConfig?.limits?.monthlyLimit);
      
    } else {
      console.log('❌ 商户TEST001不存在');
    }
    
  } catch (error) {
    console.error('❌ 修复商户数据失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

fixMerchantData();
