const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';

// 测试结果统计
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// 测试记录函数
function recordTest(name, success, details = '') {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: ${details}`);
  }
  testResults.details.push({ name, success, details });
}

// 测试API端点
async function testApiEndpoint(name, method, endpoint, data = null, headers = {}) {
  try {
    let response;
    switch (method.toLowerCase()) {
      case 'get':
        response = await axios.get(`${BASE_URL}${endpoint}`, { headers });
        break;
      case 'post':
        response = await axios.post(`${BASE_URL}${endpoint}`, data, { headers });
        break;
      case 'put':
        response = await axios.put(`${BASE_URL}${endpoint}`, data, { headers });
        break;
      case 'delete':
        response = await axios.delete(`${BASE_URL}${endpoint}`, { headers });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    
    if (response.status >= 200 && response.status < 300) {
      recordTest(name, true);
      return response.data;
    } else {
      recordTest(name, false, `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    const errorMsg = error.response ? 
      `HTTP ${error.response.status}: ${error.response.data?.error || error.message}` :
      error.message;
    recordTest(name, false, errorMsg);
    return null;
  }
}

async function testAllFrontendApis() {
  console.log('🔍 全面测试前端接口\n');
  
  // 1. 测试健康检查
  console.log('1️⃣ 基础服务测试...');
  await testApiEndpoint('健康检查', 'GET', '/api/health');
  
  // 2. 测试认证相关接口
  console.log('\n2️⃣ 认证接口测试...');
  await testApiEndpoint('用户注册', 'POST', '/api/auth/register', {
    username: 'test_user_frontend',
    password: 'test123456',
    fullName: '前端测试用户',
    role: 'operator'
  });
  
  await testApiEndpoint('用户登录', 'POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  // 3. 测试用户管理接口
  console.log('\n3️⃣ 用户管理接口测试...');
  const loginResponse = await testApiEndpoint('管理员登录', 'POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  let adminToken = null;
  if (loginResponse && loginResponse.success) {
    adminToken = loginResponse.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
    
    await testApiEndpoint('获取用户列表', 'GET', '/api/users', null, adminHeaders);
    await testApiEndpoint('创建测试用户', 'POST', '/api/users', {
      username: 'frontend_test_user',
      password: 'test123456',
      role: 'operator',
      fullName: '前端测试用户'
    }, adminHeaders);
  }
  
  // 4. 测试商户相关接口
  console.log('\n4️⃣ 商户接口测试...');
  await testApiEndpoint('获取商户列表', 'GET', '/api/merchants');
  await testApiEndpoint('获取商户信息', 'GET', '/api/merchant-profile/profile');
  
  // 5. 测试支付相关接口
  console.log('\n5️⃣ 支付接口测试...');
  await testApiEndpoint('获取支付提供者', 'GET', '/api/payment/providers');
  await testApiEndpoint('获取支付配置', 'GET', '/api/payment-configs');
  
  // 6. 测试交易相关接口
  console.log('\n6️⃣ 交易接口测试...');
  await testApiEndpoint('获取交易列表', 'GET', '/api/transactions');
  await testApiEndpoint('获取交易统计', 'GET', '/api/transactions/stats');
  
  // 7. 测试订单相关接口
  console.log('\n7️⃣ 订单接口测试...');
  await testApiEndpoint('获取订单列表', 'GET', '/api/orders');
  await testApiEndpoint('获取订单统计', 'GET', '/api/orders/stats');
  
  // 8. 测试演示接口
  console.log('\n8️⃣ 演示接口测试...');
  await testApiEndpoint('演示商户信息', 'GET', '/api/demo/merchant-info');
  await testApiEndpoint('演示交易数据', 'GET', '/api/demo/transactions');
  await testApiEndpoint('演示订单数据', 'GET', '/api/demo/orders');
  
  // 9. 测试管理接口
  console.log('\n9️⃣ 管理接口测试...');
  if (adminToken) {
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
    await testApiEndpoint('系统状态', 'GET', '/api/admin/system-status', null, adminHeaders);
    await testApiEndpoint('支付商状态', 'GET', '/api/admin/payment-providers/status', null, adminHeaders);
  }
  
  // 10. 测试错误处理
  console.log('\n🔟 错误处理测试...');
  await testApiEndpoint('无效端点', 'GET', '/api/invalid-endpoint');
  await testApiEndpoint('未授权访问', 'GET', '/api/users');
  
  // 输出测试结果
  console.log('\n📊 测试结果总结:');
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed} ✅`);
  console.log(`失败: ${testResults.failed} ❌`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`  - ${test.name}: ${test.details}`);
      });
  }
  
  console.log('\n🏁 前端接口测试完成');
}

// 运行测试
testAllFrontendApis().catch(console.error);
