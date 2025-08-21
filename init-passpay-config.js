const axios = require('axios');

// 配置
const API_BASE = 'https://cashgit.com/api';
const TEST_API_KEY = 'test-api-key-12345';

async function initPassPayConfig() {
  try {
    console.log('🚀 开始初始化PassPay支付配置...\n');

    // 创建PassPay支付配置
    const passpayConfig = {
      accountName: 'PassPay测试账户',
      provider: {
        name: 'passpay',
        accountId: '10000000',
        apiKey: 'test-passpay-api-key',
        secretKey: 'test-passpay-secret-key',
        environment: 'sandbox'
      },
      limits: {
        dailyLimit: 50000000, // 50万卢比
        monthlyLimit: 500000000, // 500万卢比
        singleTransactionLimit: 5000000, // 50万卢比
        minTransactionAmount: 100, // 1卢比
        maxTransactionAmount: 5000000, // 50万卢比
        largeAmountThreshold: 100000000, // 1000万卢比
        maxLargeTransactionsPerDay: 3
      },
      status: 'ACTIVE',
      priority: 1
    };

    console.log('📋 创建PassPay支付配置...');
    const createResponse = await axios.post(`${API_BASE}/payment-config`, passpayConfig, {
      headers: {
        'X-API-Key': TEST_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.data.success) {
      console.log('   ✅ PassPay配置创建成功');
      console.log(`   📝 配置ID: ${createResponse.data.data._id}`);
    } else {
      console.log(`   ❌ 创建失败: ${createResponse.data.error}`);
      return;
    }

    // 验证配置是否创建成功
    console.log('\n📋 验证PassPay配置...');
    const verifyResponse = await axios.get(`${API_BASE}/payment-config`, {
      headers: {
        'X-API-Key': TEST_API_KEY
      }
    });

    if (verifyResponse.data.success && verifyResponse.data.data.length > 0) {
      console.log('   ✅ PassPay配置验证成功');
      const config = verifyResponse.data.data[0];
      console.log(`   📝 账户名称: ${config.accountName}`);
      console.log(`   📝 提供商: ${config.provider.name}`);
      console.log(`   📝 状态: ${config.status}`);
      console.log(`   📝 日限额: ${config.limits.dailyLimit / 100} 卢比`);
      console.log(`   📝 月限额: ${config.limits.monthlyLimit / 100} 卢比`);
    } else {
      console.log('   ❌ 配置验证失败');
    }

    // 测试限额验证
    console.log('\n📋 测试限额验证功能...');
    const testResponse = await axios.post(`${API_BASE}/limit-management/pre-check`, {
      amount: 1000000, // 1万卢比
      type: 'DEPOSIT',
      provider: 'passpay'
    }, {
      headers: {
        'X-API-Key': TEST_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.data.success) {
      console.log('   ✅ 限额验证测试成功');
      const result = testResponse.data.data.preCheck;
      console.log(`   📊 验证结果: ${result.valid ? '通过' : '失败'}`);
      
      if (testResponse.data.data.stats) {
        const stats = testResponse.data.data.stats;
        console.log(`   📊 今日限额: ${stats.today.total.toLocaleString()} / ${stats.today.limit.toLocaleString()} 卢比 (${stats.today.usage}%)`);
        console.log(`   📊 本月限额: ${stats.month.total.toLocaleString()} / ${stats.month.limit.toLocaleString()} 卢比 (${stats.month.usage}%)`);
      }
    } else {
      console.log(`   ❌ 限额验证测试失败: ${testResponse.data.error}`);
    }

    console.log('\n🎉 PassPay支付配置初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error.response?.data?.error || error.message);
  }
}

// 运行初始化
initPassPayConfig();
