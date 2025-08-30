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

async function testAvailableRoutes() {
  console.log('🔍 测试实际可用的路由\n');
  
  // 1. 基础服务测试
  console.log('1️⃣ 基础服务测试...');
  await testApiEndpoint('健康检查', 'GET', '/api/health');
  
  // 2. 演示接口测试
  console.log('\n2️⃣ 演示接口测试...');
  await testApiEndpoint('演示商户信息', 'GET', '/api/demo/merchant-info');
  await testApiEndpoint('演示交易数据', 'GET', '/api/demo/transactions');
  await testApiEndpoint('演示订单数据', 'GET', '/api/demo/orders');
  
  // 3. 认证接口测试
  console.log('\n3️⃣ 认证接口测试...');
  await testApiEndpoint('用户登录', 'POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  // 4. 支付相关接口测试
  console.log('\n4️⃣ 支付相关接口测试...');
  await testApiEndpoint('获取支付提供者', 'GET', '/api/payment-providers');
  await testApiEndpoint('支付配置', 'GET', '/api/payment-config');
  
  // 5. 商户相关接口测试
  console.log('\n5️⃣ 商户相关接口测试...');
  await testApiEndpoint('商户信息', 'GET', '/api/merchant-profile/profile');
  
  // 6. 订单相关接口测试
  console.log('\n6️⃣ 订单相关接口测试...');
  await testApiEndpoint('订单状态查询', 'GET', '/api/order/status/test123');
  
  // 7. 余额相关接口测试
  console.log('\n7️⃣ 余额相关接口测试...');
  await testApiEndpoint('余额查询', 'GET', '/api/balance/query');
  
  // 8. 支付状态接口测试
  console.log('\n8️⃣ 支付状态接口测试...');
  await testApiEndpoint('支付状态查询', 'GET', '/api/payment-status/query');
  
  // 9. 管理接口测试（需要认证）
  console.log('\n9️⃣ 管理接口测试...');
  const loginResponse = await testApiEndpoint('管理员登录', 'POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  if (loginResponse && loginResponse.success) {
    const adminToken = loginResponse.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
    
    await testApiEndpoint('获取用户列表', 'GET', '/api/users', null, adminHeaders);
    await testApiEndpoint('获取商户列表', 'GET', '/api/admin/merchants', null, adminHeaders);
  }
  
  // 10. 错误处理测试
  console.log('\n🔟 错误处理测试...');
  await testApiEndpoint('无效端点', 'GET', '/api/invalid-endpoint');
  
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
  
  console.log('\n🏁 可用路由测试完成');
}

// 运行测试
testAvailableRoutes().catch(console.error);
