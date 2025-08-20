const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testPaymentConfig() {
  console.log('=== 测试支付配置API ===\n');
  
  try {
    // 1. 创建支付配置
    console.log('1. 创建支付配置...');
    const createResponse = await axios.post(`${BASE_URL}/payment-config`, {
      accountName: '测试AirPay账户2',
      provider: {
        name: 'airpay',
        accountId: 'airpay_test_001',
        apiKey: 'test_api_key_123',
        secretKey: 'test_secret_key_456',
        environment: 'sandbox'
      },
      limits: {
        dailyLimit: 5000000, // 50万卢比
        monthlyLimit: 50000000, // 500万卢比
        singleTransactionLimit: 500000, // 5万卢比
        minTransactionAmount: 100 // 100卢比
      },
      priority: 1,
      fees: {
        transactionFee: 0.5,
        fixedFee: 0
      },
      description: '测试用的AirPay支付账户',
      status: 'ACTIVE'
    });
    
    console.log('创建成功:', createResponse.data);
    const configId = createResponse.data.data._id;
    
    // 2. 获取所有配置
    console.log('\n2. 获取所有支付配置...');
    const getAllResponse = await axios.get(`${BASE_URL}/payment-config`);
    console.log('获取成功，共', getAllResponse.data.data.length, '个配置');
    
    // 3. 获取单个配置
    console.log('\n3. 获取单个支付配置...');
    const getOneResponse = await axios.get(`${BASE_URL}/payment-config/${configId}`);
    console.log('获取成功:', getOneResponse.data.data.accountName);
    
    // 4. 更新配置
    console.log('\n4. 更新支付配置...');
    const updateResponse = await axios.put(`${BASE_URL}/payment-config/${configId}`, {
      limits: {
        dailyLimit: 10000000, // 100万卢比
        monthlyLimit: 100000000, // 1000万卢比
        singleTransactionLimit: 1000000, // 10万卢比
        minTransactionAmount: 100
      }
    });
    console.log('更新成功:', updateResponse.data.message);
    
    // 5. 测试额度使用
    console.log('\n5. 测试额度使用...');
    const usageResponse = await axios.post(`${BASE_URL}/payment-config/${configId}/usage`, {
      amount: 100000 // 1000卢比
    });
    console.log('额度使用成功:', usageResponse.data.message);
    console.log('剩余日额度:', usageResponse.data.data.remainingDailyLimit / 100, '卢比');
    
    // 6. 获取统计数据
    console.log('\n6. 获取统计数据...');
    const statsResponse = await axios.get(`${BASE_URL}/payment-config/stats/summary`, {
      params: {
        paymentAccountId: configId,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        timeDimension: 'daily'
      }
    });
    console.log('统计数据获取成功');
    
    // 7. 删除配置
    console.log('\n7. 删除支付配置...');
    const deleteResponse = await axios.delete(`${BASE_URL}/payment-config/${configId}`);
    console.log('删除成功:', deleteResponse.data.message);
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

testPaymentConfig();
