const mongoose = require('mongoose');

// 连接线上数据库
async function checkPassPayTestAccounts() {
  try {
    console.log('🔍 检查PassPay测试账户...');
    
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/payment-platform');
    console.log('✅ 数据库连接成功');
    
    // 导入模型
    const PaymentConfig = require('./server/models/PaymentConfig');
    
    // 查找所有PassPay配置
    const passpayConfigs = await PaymentConfig.find({
      'provider.name': 'passpay'
    });
    
    console.log(`\n📊 找到 ${passpayConfigs.length} 个PassPay配置`);
    
    if (passpayConfigs.length > 0) {
      console.log('\n📋 PassPay配置详情:');
      passpayConfigs.forEach((config, index) => {
        console.log(`\n${index + 1}. 配置ID: ${config._id}`);
        console.log(`   账户名: ${config.accountName}`);
        console.log(`   状态: ${config.status}`);
        console.log(`   创建时间: ${config.createdAt}`);
        console.log(`   更新时间: ${config.updatedAt}`);
        console.log(`   是否测试账户: ${config.isTestAccount || false}`);
        console.log(`   环境: ${config.environment || 'production'}`);
        
        // 检查是否有测试相关的字段
        if (config.testMode !== undefined) {
          console.log(`   测试模式: ${config.testMode}`);
        }
        if (config.sandbox !== undefined) {
          console.log(`   沙盒模式: ${config.sandbox}`);
        }
        
        console.log('   ---');
      });
    }
    
    // 查找所有支付配置
    const allConfigs = await PaymentConfig.find();
    console.log(`\n📊 所有支付配置总数: ${allConfigs.length}`);
    
    // 按提供商分组统计
    const providerStats = {};
    allConfigs.forEach(config => {
      const providerName = config.provider?.name || 'unknown';
      providerStats[providerName] = (providerStats[providerName] || 0) + 1;
    });
    
    console.log('\n📈 按提供商分组统计:');
    Object.entries(providerStats).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count} 个`);
    });
    
    // 查找可能的测试账户
    console.log('\n🔍 查找可能的测试账户...');
    const testAccounts = allConfigs.filter(config => {
      const accountName = config.accountName?.toLowerCase() || '';
      const isTest = config.isTestAccount || false;
      const testMode = config.testMode || false;
      const sandbox = config.sandbox || false;
      
      return isTest || testMode || sandbox || 
             accountName.includes('test') || 
             accountName.includes('demo') ||
             accountName.includes('sandbox');
    });
    
    if (testAccounts.length > 0) {
      console.log(`\n⚠️ 找到 ${testAccounts.length} 个可能的测试账户:`);
      testAccounts.forEach((config, index) => {
        console.log(`\n${index + 1}. 配置ID: ${config._id}`);
        console.log(`   账户名: ${config.accountName}`);
        console.log(`   提供商: ${config.provider?.name}`);
        console.log(`   状态: ${config.status}`);
        console.log(`   测试标识: ${config.isTestAccount || config.testMode || config.sandbox}`);
        console.log(`   创建时间: ${config.createdAt}`);
      });
    } else {
      console.log('\n✅ 没有找到明显的测试账户');
    }
    
    // 检查数据库中的字段结构
    console.log('\n🔍 检查数据库字段结构...');
    if (allConfigs.length > 0) {
      const sampleConfig = allConfigs[0];
      console.log('📋 配置对象字段:');
      Object.keys(sampleConfig.toObject()).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleConfig[key]}`);
      });
    }
    
    mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
    if (mongoose.connection.readyState === 1) {
      mongoose.disconnect();
    }
  }
}

// 运行检查
checkPassPayTestAccounts();
