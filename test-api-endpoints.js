const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3001/api';
const API_KEY = 'test_api_key'; // 测试用的API密钥

// 测试商户API
async function testMerchantAPI() {
  console.log('🧪 测试商户API...\n');

  try {
    // 1. 获取商户列表
    console.log('1. 获取商户列表');
    const merchantsResponse = await axios.get(`${BASE_URL}/merchant`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 商户列表:', merchantsResponse.data);
    console.log('');

    // 2. 创建新商户
    console.log('2. 创建新商户');
    const newMerchant = {
      merchantId: 'TEST001',
      name: '测试商户',
      email: 'test@example.com',
      phone: '+91 9876543210',
      status: 'ACTIVE',
      defaultProvider: 'airpay',
      depositFee: 0.5,
      withdrawalFee: 1.0,
      minDeposit: 100,
      maxDeposit: 100000,
      minWithdrawal: 500,
      maxWithdrawal: 50000,
      dailyLimit: 100000000,
      monthlyLimit: 1000000000,
      singleTransactionLimit: 10000000
    };

    const createResponse = await axios.post(`${BASE_URL}/merchant`, newMerchant, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 商户创建成功:', createResponse.data);
    console.log('');

    // 3. 获取单个商户信息
    console.log('3. 获取单个商户信息');
    const merchantResponse = await axios.get(`${BASE_URL}/merchant/TEST001`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 商户信息:', merchantResponse.data);
    console.log('');

    // 4. 更新商户信息
    console.log('4. 更新商户信息');
    const updateData = {
      name: '更新后的测试商户',
      maxDeposit: 200000
    };

    const updateResponse = await axios.put(`${BASE_URL}/merchant/TEST001`, updateData, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 商户更新成功:', updateResponse.data);
    console.log('');

  } catch (error) {
    console.error('❌ 商户API测试失败:', error.response?.data || error.message);
  }
}

// 测试用户API
async function testUserAPI() {
  console.log('🧪 测试用户API...\n');

  try {
    // 1. 获取用户列表
    console.log('1. 获取用户列表');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 用户列表:', usersResponse.data);
    console.log('');

    // 2. 创建新用户
    console.log('2. 创建新用户');
    const newUser = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password123',
      fullName: '测试用户',
      phone: '+91 9876543211',
      role: 'operator',
      status: 'active'
    };

    const createResponse = await axios.post(`${BASE_URL}/users`, newUser, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 用户创建成功:', createResponse.data);
    console.log('');

    // 3. 获取单个用户信息
    console.log('3. 获取单个用户信息');
    const userId = createResponse.data.data.user.id;
    const userResponse = await axios.get(`${BASE_URL}/users/${userId}`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 用户信息:', userResponse.data);
    console.log('');

    // 4. 更新用户信息
    console.log('4. 更新用户信息');
    const updateData = {
      fullName: '更新后的测试用户',
      status: 'active'
    };

    const updateResponse = await axios.put(`${BASE_URL}/users/${userId}`, updateData, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 用户更新成功:', updateResponse.data);
    console.log('');

  } catch (error) {
    console.error('❌ 用户API测试失败:', error.response?.data || error.message);
  }
}

// 测试支付商API
async function testProviderAPI() {
  console.log('🧪 测试支付商API...\n');

  try {
    // 1. 获取支付商列表
    console.log('1. 获取支付商列表');
    const providersResponse = await axios.get(`${BASE_URL}/providers`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 支付商列表:', providersResponse.data);
    console.log('');

    // 2. 获取单个支付商信息
    console.log('2. 获取单个支付商信息');
    const providerResponse = await axios.get(`${BASE_URL}/providers/airpay`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 支付商信息:', providerResponse.data);
    console.log('');

    // 3. 创建新支付商
    console.log('3. 创建新支付商');
    const newProvider = {
      name: 'testprovider',
      displayName: '测试支付商',
      type: 'native',
      status: 'ACTIVE',
      environment: 'sandbox',
      description: '测试用的支付商',
      features: ['UPI', 'IMPS'],
      supportedCurrencies: ['INR'],
      dailyLimit: 50000000,
      monthlyLimit: 500000000,
      singleTransactionLimit: 5000000,
      depositFee: 0.8,
      withdrawalFee: 1.5,
      fixedFee: 0
    };

    const createResponse = await axios.post(`${BASE_URL}/providers`, newProvider, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 支付商创建成功:', createResponse.data);
    console.log('');

    // 4. 获取支付商统计信息
    console.log('4. 获取支付商统计信息');
    const statsResponse = await axios.get(`${BASE_URL}/providers/airpay/stats`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ 支付商统计:', statsResponse.data);
    console.log('');

  } catch (error) {
    console.error('❌ 支付商API测试失败:', error.response?.data || error.message);
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始API端点测试...\n');
  
  await testMerchantAPI();
  console.log('='.repeat(50) + '\n');
  
  await testUserAPI();
  console.log('='.repeat(50) + '\n');
  
  await testProviderAPI();
  console.log('='.repeat(50) + '\n');
  
  console.log('🎉 所有API测试完成！');
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testMerchantAPI,
  testUserAPI,
  testProviderAPI,
  runAllTests
};
