const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 已连接到MongoDB');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 初始化商户
async function initMerchant() {
  try {
    // 确保模型已加载
    const Merchant = require('../models/merchant');
    
    // 检查是否已存在测试商户
    const existingMerchant = await Merchant.findOne({ apiKey: 'test-api-key' });
    
    if (existingMerchant) {
      console.log('ℹ️ 测试商户已存在:', {
        name: existingMerchant.name,
        apiKey: existingMerchant.apiKey,
        status: existingMerchant.status,
        merchantId: existingMerchant.merchantId
      });
      
      // 确保商户状态是ACTIVE
      if (existingMerchant.status !== 'ACTIVE') {
        existingMerchant.status = 'ACTIVE';
        await existingMerchant.save();
        console.log('✅ 已更新商户状态为ACTIVE');
      }
      
      return existingMerchant;
    }
    
    // 创建新的测试商户
    const newMerchant = new Merchant({
      name: 'API测试商户',
      merchantId: 'TEST_SERVER_001',
      apiKey: 'test-api-key',
      email: 'apitest@cashgit.com',
      phone: '919876543210',
      status: 'ACTIVE',
      permissions: ['PAYMENT_CREATE', 'PAYMENT_QUERY', 'PAYMENT_REFUND'],
      limits: {
        daily: 100000,
        monthly: 1000000,
        single: 50000
      },
      webhookUrl: 'https://cashgit.com/api/webhook',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newMerchant.save();
    console.log('✅ 已创建新的测试商户:', {
      name: newMerchant.name,
      apiKey: newMerchant.apiKey,
      status: newMerchant.status,
      merchantId: newMerchant.merchantId
    });
    
    return newMerchant;
    
  } catch (error) {
    console.error('❌ 商户初始化失败:', error);
    throw error;
  }
}

// 测试API密钥认证
async function testApiKey() {
  try {
    const Merchant = require('../models/merchant');
    
    // 查找测试商户
    const merchant = await Merchant.findOne({ apiKey: 'test-api-key' });
    
    if (!merchant) {
      console.log('❌ 未找到测试商户');
      return false;
    }
    
    console.log('✅ 找到测试商户:', {
      name: merchant.name,
      apiKey: merchant.apiKey,
      status: merchant.status,
      merchantId: merchant.merchantId
    });
    
    // 验证商户状态
    if (merchant.status !== 'ACTIVE') {
      console.log('⚠️ 商户状态不是ACTIVE:', merchant.status);
      return false;
    }
    
    console.log('✅ 商户状态验证通过');
    return true;
    
  } catch (error) {
    console.error('❌ API密钥测试失败:', error);
    return false;
  }
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始初始化服务器商户...');
    
    await connectDB();
    await initMerchant();
    await testApiKey();
    
    console.log('✅ 商户初始化完成！');
    
    // 显示所有商户
    const Merchant = require('../models/merchant');
    const allMerchants = await Merchant.find({});
    console.log('\n📋 当前所有商户:');
    allMerchants.forEach((m, index) => {
      console.log(`${index + 1}. ${m.name} (${m.merchantId}) - ${m.status} - API Key: ${m.apiKey}`);
    });
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已断开数据库连接');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { initMerchant, testApiKey };
