#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');

// 加载生产环境配置
require('dotenv').config({ path: path.join(__dirname, 'env.production') });

// 引入模型
const Merchant = require('./server/models/merchant');

/**
 * 更新PassPay配置
 */
async function updatePassPayConfig() {
  try {
    console.log('🔍 连接到生产环境数据库...');
    console.log('📍 数据库地址:', process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 数据库连接成功');
    console.log('');
    
    // PassPay真实配置参数
    const passPayConfig = {
      name: 'passpay',
      type: 'passpay', 
      accountId: '14252318',  // 商户号 mchid
      payId: '11',            // 测试专用pay_id，正式可改为'10'
      secretKey: 'g0WvcUVPAkdzzYF7YHHuDL8VBTqIKYEf'  // 真实密钥
    };
    
    console.log('🔧 更新PassPay配置参数:');
    console.log('商户号 (mchid):', passPayConfig.accountId);
    console.log('支付通道 (pay_id):', passPayConfig.payId);
    console.log('密钥:', passPayConfig.secretKey.substring(0, 10) + '...');
    console.log('');
    
    // 查找商户
    const merchant = await Merchant.findOne({ merchantId: 'MERCHANT_MEWZV8HV' });
    if (!merchant) {
      console.error('❌ 未找到商户: MERCHANT_MEWZV8HV');
      return;
    }
    
    console.log(`📊 找到商户: ${merchant.name} (${merchant.merchantId})`);
    
    // 更新PassPay配置 - 直接更新merchant文档中的相关字段
    const updateResult = await Merchant.updateOne(
      { merchantId: 'MERCHANT_MEWZV8HV' },
      {
        $set: {
          'defaultProvider': 'passpay',  // 设置默认支付提供商
          'paymentConfig.defaultProvider': 'passpay'
        }
      }
    );
    
    console.log('✅ 商户默认提供商已更新为PassPay');
    console.log('');
    
    // 检查是否有PaymentConfig记录需要更新
    const PaymentConfig = require('./server/models/paymentConfig');
    
    // 查找现有的PassPay配置
    let paymentConfig = await PaymentConfig.findOne({ 
      merchantId: 'MERCHANT_MEWZV8HV',
      'provider.name': 'passpay'
    });
    
    if (paymentConfig) {
      // 更新现有配置
      console.log('🔄 更新现有PassPay配置...');
      await PaymentConfig.updateOne(
        { _id: paymentConfig._id },
        {
          $set: {
            'provider.accountId': passPayConfig.accountId,
            'provider.payId': passPayConfig.payId, 
            'provider.secretKey': passPayConfig.secretKey,
            'status': 'ACTIVE',
            'updatedAt': new Date()
          }
        }
      );
      console.log('✅ PassPay配置已更新');
    } else {
      // 创建新的PassPay配置
      console.log('➕ 创建新的PassPay配置...');
      paymentConfig = new PaymentConfig({
        merchantId: 'MERCHANT_MEWZV8HV',
        accountName: 'PassPay Production Account',
        provider: passPayConfig,
        status: 'ACTIVE',
        description: 'PassPay生产环境配置 - 真实商户参数',
        limits: {
          collection: {
            dailyLimit: 10000000,      // 1000万paisa = 10万卢比
            monthlyLimit: 100000000,   // 1亿paisa = 100万卢比
            singleTransactionLimit: 1000000,  // 100万paisa = 1万卢比
            minTransactionAmount: 10000       // 1000paisa = 100卢比
          },
          payout: {
            dailyLimit: 10000000,
            monthlyLimit: 100000000,
            singleTransactionLimit: 1000000,
            minTransactionAmount: 10000
          }
        },
        fees: {
          collection: {
            transactionFee: 2.5,    // 2.5%手续费
            fixedFee: 0
          },
          payout: {
            transactionFee: 2.0,    // 2.0%手续费
            fixedFee: 500           // 5卢比固定费用
          }
        }
      });
      
      await paymentConfig.save();
      console.log('✅ 新的PassPay配置已创建');
    }
    
    console.log('');
    console.log('🎯 配置更新完成！');
    console.log('');
    console.log('📋 下一步操作:');
    console.log('1. 重启PM2服务加载新配置: pm2 restart 1');
    console.log('2. 联系PassPay运营将服务器IP加入白名单: 13.200.72.14');
    console.log('3. 测试游戏公司订单接口');
    console.log('4. 如需切换到正式通道，将pay_id改为"10"');
    
  } catch (error) {
    console.error('❌ 更新配置失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔐 数据库连接已关闭');
  }
}

// 运行更新
if (require.main === module) {
  updatePassPayConfig().catch(console.error);
}

module.exports = { updatePassPayConfig };