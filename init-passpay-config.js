const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 初始化PassPay配置
async function initPassPayConfig() {
  try {
    console.log('🔧 开始初始化PassPay配置...');

    // 检查是否已存在PassPay配置
    const existingConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (existingConfig) {
      console.log('⚠️ PassPay配置已存在，更新配置...');
      
      // 更新现有配置
      existingConfig.provider = {
        name: 'passpay',
        accountId: process.env.PASSPAY_MCHID || 'your_mchid_here',
        payId: process.env.PASSPAY_PAY_ID || 'your_pay_id_here',
        secretKey: process.env.PASSPAY_SECRET_KEY || 'your_secret_key_here'
      };
      existingConfig.enabled = true;
      existingConfig.updatedAt = new Date();
      
      await existingConfig.save();
      console.log('✅ PassPay配置更新成功');
    } else {
      console.log('📝 创建新的PassPay配置...');
      
      // 创建新配置
      const newConfig = new PaymentConfig({
        provider: {
          name: 'passpay',
          accountId: process.env.PASSPAY_MCHID || 'your_mchid_here',
          payId: process.env.PASSPAY_PAY_ID || 'your_pay_id_here',
          secretKey: process.env.PASSPAY_SECRET_KEY || 'your_secret_key_here'
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newConfig.save();
      console.log('✅ PassPay配置创建成功');
    }

    // 显示当前配置
    const config = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });
    
    console.log('\n📋 当前PassPay配置:');
    console.log(`   商户ID: ${config.provider.accountId}`);
    console.log(`   支付ID: ${config.provider.payId}`);
    console.log(`   密钥: ${config.provider.secretKey.substring(0, 8)}...`);
    console.log(`   状态: ${config.enabled ? '启用' : '禁用'}`);
    console.log(`   创建时间: ${config.createdAt}`);
    console.log(`   更新时间: ${config.updatedAt}`);

  } catch (error) {
    console.error('❌ 初始化PassPay配置失败:', error);
  }
}

// 主函数
async function main() {
  try {
    await connectDB();
    await initPassPayConfig();
    
    console.log('\n🎉 PassPay配置初始化完成！');
    console.log('\n📝 下一步操作:');
    console.log('   1. 设置环境变量或直接修改配置');
    console.log('   2. 重启服务器使配置生效');
    console.log('   3. 运行测试验证功能');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { initPassPayConfig };
