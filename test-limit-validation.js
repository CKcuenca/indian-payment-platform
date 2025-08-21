const axios = require('axios');

// 测试配置
const API_BASE = 'https://cashgit.com/api';
const TEST_API_KEY = 'test-api-key-12345'; // 使用测试商户的API密钥

// 测试用例
const testCases = [
  {
    name: '测试小额交易验证',
    data: {
      amount: 1000000, // 1万卢比
      type: 'DEPOSIT',
      provider: 'passpay',
      currency: 'INR'
    },
    expected: 'valid'
  },
  {
    name: '测试大额交易验证',
    data: {
      amount: 100000000, // 100万卢比
      type: 'DEPOSIT',
      provider: 'passpay',
      currency: 'INR'
    },
    expected: 'valid'
  },
  {
    name: '测试超大额交易验证',
    data: {
      amount: 1000000000, // 1000万卢比
      type: 'DEPOSIT',
      provider: 'passpay',
      currency: 'INR'
    },
    expected: 'may_exceed_limit'
  },
  {
    name: '测试提现交易验证',
    data: {
      amount: 50000000, // 50万卢比
      type: 'WITHDRAWAL',
      provider: 'passpay',
      currency: 'INR'
    },
    expected: 'valid'
  }
];

async function testLimitValidation() {
  console.log('🚀 开始测试限额验证API...\n');

  for (const testCase of testCases) {
    try {
      console.log(`📋 ${testCase.name}`);
      console.log(`   金额: ${testCase.data.amount / 100} 卢比`);
      console.log(`   类型: ${testCase.data.type}`);
      console.log(`   提供商: ${testCase.data.provider}`);
      
      // 测试预检查
      const preCheckResponse = await axios.post(`${API_BASE}/limit-management/pre-check`, testCase.data, {
        headers: {
          'X-API-Key': TEST_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (preCheckResponse.data.success) {
        const result = preCheckResponse.data.data.preCheck;
        console.log(`   ✅ 预检查结果: ${result.valid ? '通过' : '失败'}`);
        
        if (!result.valid) {
          console.log(`   ❌ 错误信息: ${result.error}`);
          console.log(`   ❌ 错误代码: ${result.code}`);
        }

        // 显示限额统计
        if (preCheckResponse.data.data.stats) {
          const stats = preCheckResponse.data.data.stats;
          console.log(`   📊 今日限额: ${stats.today.total.toLocaleString()} / ${stats.today.limit.toLocaleString()} 卢比 (${stats.today.usage}%)`);
          console.log(`   📊 本月限额: ${stats.month.total.toLocaleString()} / ${stats.month.limit.toLocaleString()} 卢比 (${stats.month.usage}%)`);
        }
      } else {
        console.log(`   ❌ 预检查失败: ${preCheckResponse.data.error}`);
      }

      console.log(''); // 空行分隔

    } catch (error) {
      console.log(`   ❌ 测试失败: ${error.response?.data?.error || error.message}`);
      console.log('');
    }
  }

  // 测试获取限额配置
  try {
    console.log('📋 测试获取限额配置');
    const configResponse = await axios.get(`${API_BASE}/limit-management/config?provider=passpay`, {
      headers: {
        'X-API-Key': TEST_API_KEY
      }
    });

    if (configResponse.data.success) {
      const config = configResponse.data.data.limits;
      console.log('   ✅ 限额配置获取成功:');
      console.log(`     基础限额: ${config.basic.minAmount} - ${config.basic.maxAmount} 卢比`);
      console.log(`     日限额: ${config.daily.limit} 卢比`);
      console.log(`     月限额: ${config.monthly.limit} 卢比`);
      console.log(`     大额交易: ${config.risk.allowLargeTransactions ? '允许' : '禁止'}`);
    } else {
      console.log(`   ❌ 获取配置失败: ${configResponse.data.error}`);
    }
  } catch (error) {
    console.log(`   ❌ 获取配置失败: ${error.response?.data?.error || error.message}`);
  }

  console.log('\n🎉 限额验证API测试完成！');
}

// 运行测试
testLimitValidation().catch(console.error);
