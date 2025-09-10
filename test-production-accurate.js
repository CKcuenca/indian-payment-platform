const axios = require('axios');

// 生产环境配置
const BASE_URL = 'https://cashgit.com';

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试结果收集
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// 测试辅助函数
function logTest(testName, success, message, data = null) {
  const result = {
    test: testName,
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  if (success) {
    testResults.passed++;
    console.log(`✅ ${testName}: ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${message}`);
    if (data) console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

// 测试函数
async function testHealthCheck() {
  try {
    const response = await api.get('/api/health');
    logTest('Health Check', response.status === 200, 
      `Service is running. Status: ${response.data.status}`);
    return true;
  } catch (error) {
    logTest('Health Check', false, `Health check failed: ${error.message}`);
    return false;
  }
}

async function testPaymentProviders() {
  try {
    const response = await api.get('/api/payment-providers');
    if (response.data.success) {
      const providers = response.data.data;
      const providerNames = providers.map(p => p.name);
      logTest('Payment Providers List', true, 
        `Available providers: ${providerNames.join(', ')}`);
      return true;
    } else {
      logTest('Payment Providers List', false, 
        `Payment providers query failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logTest('Payment Providers List', false, 
      `Payment providers query error: ${error.message}`, error.response?.data);
    return false;
  }
}

async function testOrderCreateAPI() {
  try {
    const response = await api.post('/api/order/create');
    // 期望返回400错误，因为缺少必需参数
    if (response.status === 400) {
      logTest('Order Create API', true, 
        `API endpoint exists and validates input. Response: ${response.data.message}`);
      return true;
    } else {
      logTest('Order Create API', false, 
        `Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Order Create API', true, 
        `API endpoint exists and validates input. Response: ${error.response.data.message}`);
      return true;
    } else {
      logTest('Order Create API', false, 
        `Order create API error: ${error.message}`, error.response?.data);
      return false;
    }
  }
}

async function testMerchantAPI() {
  try {
    const response = await api.get('/api/merchant');
    // 期望返回401错误，因为缺少认证
    if (response.status === 401) {
      logTest('Merchant API', true, 
        `API endpoint exists and requires authentication. Response: ${response.data.error}`);
      return true;
    } else {
      logTest('Merchant API', false, 
        `Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('Merchant API', true, 
        `API endpoint exists and requires authentication. Response: ${error.response.data.error}`);
      return true;
    } else {
      logTest('Merchant API', false, 
        `Merchant API error: ${error.message}`, error.response?.data);
      return false;
    }
  }
}

async function testPaymentConfigAPI() {
  try {
    const response = await api.get('/api/payment-config');
    // 期望返回401错误，因为缺少认证
    if (response.status === 401) {
      logTest('Payment Config API', true, 
        `API endpoint exists and requires authentication. Response: ${response.data.error}`);
      return true;
    } else {
      logTest('Payment Config API', false, 
        `Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('Payment Config API', true, 
        `API endpoint exists and requires authentication. Response: ${error.response.data.error}`);
      return true;
    } else {
      logTest('Payment Config API', false, 
        `Payment config API error: ${error.message}`, error.response?.data);
      return false;
    }
  }
}

async function testPayoutAPI() {
  try {
    const response = await api.post('/api/payout/create');
    // 期望返回400错误，因为缺少必需参数
    if (response.status === 400) {
      logTest('Payout Create API', true, 
        `API endpoint exists and validates input. Response: ${response.data.message}`);
      return true;
    } else {
      logTest('Payout Create API', false, 
        `Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Payout Create API', true, 
        `API endpoint exists and validates input. Response: ${error.response.data.message}`);
      return true;
    } else {
      logTest('Payout Create API', false, 
        `Payout create API error: ${error.message}`, error.response?.data);
      return false;
    }
  }
}

async function testPassPayAPI() {
  try {
    const response = await api.get('/api/passpay/status');
    // 期望返回400错误，因为缺少必需参数
    if (response.status === 400) {
      logTest('PassPay API', true, 
        `API endpoint exists and validates input. Response: ${response.data.message}`);
      return true;
    } else {
      logTest('PassPay API', false, 
        `Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('PassPay API', true, 
        `API endpoint exists and validates input. Response: ${error.response.data.message}`);
      return true;
    } else {
      logTest('PassPay API', false, 
        `PassPay API error: ${error.message}`, error.response?.data);
      return false;
    }
  }
}

async function testUnispayAPI() {
  try {
    const response = await api.get('/api/unispay/status');
    // 期望返回400错误，因为缺少必需参数
    if (response.status === 400) {
      logTest('Unispay API', true, 
        `API endpoint exists and validates input. Response: ${response.data.message}`);
      return true;
    } else {
      logTest('Unispay API', false, 
        `Unexpected response: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Unispay API', true, 
        `API endpoint exists and validates input. Response: ${error.response.data.message}`);
      return true;
    } else {
      logTest('Unispay API', false, 
        `Unispay API error: ${error.message}`, error.response?.data);
      return false;
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Starting Production Environment API Tests');
  console.log('=' .repeat(60));
  
  // 基础健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }
  
  // API 端点测试
  console.log('\n📋 Testing API Endpoints...');
  await testPaymentProviders();
  await testOrderCreateAPI();
  await testMerchantAPI();
  await testPaymentConfigAPI();
  await testPayoutAPI();
  await testPassPayAPI();
  await testUnispayAPI();
  
  // 显示测试结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  // 显示失败的测试
  const failedTests = testResults.tests.filter(t => !t.success);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.test}: ${test.message}`);
    });
  }
  
  console.log('\n🏁 Test completed!');
  console.log('\n💡 Note: APIs that require authentication will show 401 errors, which is expected behavior.');
  console.log('💡 APIs that validate input will show 400 errors, which is also expected behavior.');
}

// 运行测试
runTests().catch(console.error);


