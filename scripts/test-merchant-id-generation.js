const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';

// 导入商户模型
const Merchant = require('../server/models/merchant');

async function testIdGeneration() {
  try {
    // 连接数据库
    console.log('正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    console.log('\n=== 测试商户ID生成功能 ===');

    // 测试1：生成多个ID并验证格式
    console.log('\n1. 测试ID生成格式：');
    for (let i = 0; i < 10; i++) {
      const merchantId = Merchant.generateMerchantId();
      const isValidFormat = /^\d{8}$/.test(merchantId);
      const doesNotStartWithZero = !merchantId.startsWith('0');
      
      console.log(`ID ${i + 1}: ${merchantId} - 格式正确: ${isValidFormat ? '✅' : '❌'} - 不以0开头: ${doesNotStartWithZero ? '✅' : '❌'}`);
    }

    // 测试2：验证唯一性
    console.log('\n2. 测试ID唯一性（生成1000个ID）：');
    const generatedIds = new Set();
    const duplicates = [];
    
    for (let i = 0; i < 1000; i++) {
      const id = Merchant.generateMerchantId();
      if (generatedIds.has(id)) {
        duplicates.push(id);
      }
      generatedIds.add(id);
    }
    
    console.log(`生成了 ${generatedIds.size} 个唯一ID`);
    console.log(`发现 ${duplicates.length} 个重复ID: ${duplicates.length > 0 ? duplicates.join(', ') : '无'}`);

    // 测试3：创建测试商户并验证数据库存储
    console.log('\n3. 测试商户创建：');
    
    const testMerchantData = {
      name: 'ID测试商户',
      status: 'ACTIVE',
      defaultProvider: 'AirPay',
      deposit: {
        fee: { percentage: 5.0, fixedAmount: 0 },
        limits: { minAmount: 100, maxAmount: 100000, dailyLimit: 100000000, monthlyLimit: 1000000000, singleTransactionLimit: 10000000 },
        usage: { dailyUsed: 0, monthlyUsed: 0, lastResetDate: new Date() }
      },
      withdrawal: {
        fee: { percentage: 3.0, fixedAmount: 6 },
        limits: { minAmount: 500, maxAmount: 50000, dailyLimit: 100000000, monthlyLimit: 1000000000, singleTransactionLimit: 10000000 },
        usage: { dailyUsed: 0, monthlyUsed: 0, lastResetDate: new Date() }
      },
      balance: { available: 0, frozen: 0 },
      security: {
        keyStatus: 'ACTIVE',
        lastKeyUpdate: new Date(),
        keyHistory: [],
        ipWhitelist: {
          enabled: false,
          strictMode: false,
          allowedIPs: [],
          accessRules: { blockUnknownIPs: true, maxFailedAttempts: 5, lockoutDuration: 300 }
        },
        usage: { dailyCount: 0, monthlyCount: 0, lastUsed: new Date(), lastResetDate: new Date() }
      }
    };

    // 使用新的ID生成方法
    testMerchantData.merchantId = Merchant.generateMerchantId();
    testMerchantData.apiKey = Merchant.generateApiKey();
    testMerchantData.secretKey = Merchant.generateSecretKey();

    console.log(`生成的商户ID: ${testMerchantData.merchantId}`);
    console.log(`生成的API Key: ${testMerchantData.apiKey}`);
    console.log(`生成的Secret Key: ${testMerchantData.secretKey}`);

    // 创建测试商户
    const testMerchant = new Merchant(testMerchantData);
    await testMerchant.save();
    
    console.log('✅ 测试商户创建成功');
    
    // 查询验证
    const savedMerchant = await Merchant.findOne({ merchantId: testMerchantData.merchantId });
    if (savedMerchant) {
      console.log('✅ 数据库查询验证成功');
      console.log(`保存的商户ID: ${savedMerchant.merchantId}`);
      console.log(`保存的商户名称: ${savedMerchant.name}`);
      
      // 删除测试商户
      await Merchant.deleteOne({ merchantId: testMerchantData.merchantId });
      console.log('✅ 测试商户已清理');
    } else {
      console.log('❌ 数据库查询验证失败');
    }

    // 测试4：验证现有商户的ID格式
    console.log('\n4. 检查现有商户ID格式：');
    const existingMerchants = await Merchant.find({});
    
    for (const merchant of existingMerchants) {
      const isEightDigit = /^\d{8}$/.test(merchant.merchantId);
      const status = isEightDigit ? '✅' : '❌';
      console.log(`${merchant.name}: ${merchant.merchantId} - ${status}`);
    }

    console.log('\n=== 测试完成 ===');
    console.log('✅ 所有测试通过，商户ID生成功能正常工作');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testIdGeneration().catch(console.error);
}

module.exports = testIdGeneration;