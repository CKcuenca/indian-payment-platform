const axios = require('axios');

// 生产环境配置
const BASE_URL = 'https://cashgit.com';

// 测试数据 - 模拟真实的商户下单
const testOrderData = {
  appid: 'test-merchant-123', // 商户ID
  mchOrderId: `test-order-${Date.now()}`, // 商户订单号
  amount: 1000, // 金额（分）
  currency: 'INR',
  payType: 'UPI',
  notifyUrl: 'https://cashgit.com/api/webhook/notify',
  timestamp: Math.floor(Date.now() / 1000),
  sign: 'test-signature' // 实际使用中需要正确的签名
};

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
      const wakeupProviders = providers.filter(p => p.type === 'wakeup');
      logTest('Payment Providers List', true, 
        `Available wakeup providers: ${wakeupProviders.map(p => p.name).join(', ')}`);
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

async function testOrderCreation() {
  try {
    console.log('\n📋 Testing Order Creation with data:', JSON.stringify(testOrderData, null, 2));
    
    const response = await api.post('/api/order/create', testOrderData);
    
    if (response.data.code === 200) {
      logTest('Order Creation', true, 
        `Order created successfully. Order ID: ${response.data.data?.orderId}`);
      return true;
    } else {
      logTest('Order Creation', false, 
        `Order creation failed: ${response.data.message}`, response.data);
      return false;
    }
  } catch (error) {
    if (error.response) {
      logTest('Order Creation', false, 
        `Order creation error: ${error.response.data.message || error.message}`, error.response.data);
    } else {
      logTest('Order Creation', false, 
        `Order creation error: ${error.message}`);
    }
    return false;
  }
}

async function testPayoutCreation() {
  try {
    const payoutData = {
      appid: 'test-merchant-123',
      mchOrderId: `test-payout-${Date.now()}`,
      amount: 500,
      currency: 'INR',
      payType: 'UPI',
      upiId: 'test@upi',
      notifyUrl: 'https://cashgit.com/api/webhook/notify',
      timestamp: Math.floor(Date.now() / 1000),
      sign: 'test-signature'
    };
    
    console.log('\n💰 Testing Payout Creation with data:', JSON.stringify(payoutData, null, 2));
    
    const response = await api.post('/api/payout/create', payoutData);
    
    if (response.data.code === 200) {
      logTest('Payout Creation', true, 
        `Payout created successfully. Payout ID: ${response.data.data?.payoutId}`);
      return true;
    } else {
      logTest('Payout Creation', false, 
        `Payout creation failed: ${response.data.message}`, response.data);
      return false;
    }
  } catch (error) {
    if (error.response) {
      logTest('Payout Creation', false, 
        `Payout creation error: ${error.response.data.message || error.message}`, error.response.data);
    } else {
      logTest('Payout Creation', false, 
        `Payout creation error: ${error.message}`);
    }
    return false;
  }
}

async function testPassPayCollection() {
  try {
    const passpayData = {
      orderId: `test-passpay-${Date.now()}`,
      amount: 1000,
      currency: 'INR',
      payType: 'UPI',
      notifyUrl: 'https://cashgit.com/api/webhook/notify',
      returnUrl: 'https://cashgit.com/payment/success'
    };
    
    console.log('\n🔄 Testing PassPay Collection with data:', JSON.stringify(passpayData, null, 2));
    
    const response = await api.post('/api/passpay/collection/create', passpayData);
    
    if (response.data.success) {
      logTest('PassPay Collection', true, 
        `PassPay collection created successfully. Order ID: ${response.data.data?.orderId}`);
      return true;
    } else {
      logTest('PassPay Collection', false, 
        `PassPay collection failed: ${response.data.message}`, response.data);
      return false;
    }
  } catch (error) {
    if (error.response) {
      logTest('PassPay Collection', false, 
        `PassPay collection error: ${error.response.data.message || error.message}`, error.response.data);
    } else {
      logTest('PassPay Collection', false, 
        `PassPay collection error: ${error.message}`);
    }
    return false;
  }
}

async function testUnispayCollection() {
  try {
    const unispayData = {
      orderId: `test-unispay-${Date.now()}`,
      amount: 1000,
      currency: 'INR',
      payType: 'UPI',
      notifyUrl: 'https://cashgit.com/api/webhook/notify',
      returnUrl: 'https://cashgit.com/payment/success'
    };
    
    console.log('\n🔄 Testing Unispay Collection with data:', JSON.stringify(unispayData, null, 2));
    
    const response = await api.post('/api/unispay/create', unispayData);
    
    if (response.data.success) {
      logTest('Unispay Collection', true, 
        `Unispay collection created successfully. Order ID: ${response.data.data?.orderId}`);
      return true;
    } else {
      logTest('Unispay Collection', false, 
        `Unispay collection failed: ${response.data.message}`, response.data);
      return false;
    }
  } catch (error) {
    if (error.response) {
      logTest('Unispay Collection', false, 
        `Unispay collection error: ${error.response.data.message || error.message}`, error.response.data);
    } else {
      logTest('Unispay Collection', false, 
        `Unispay collection error: ${error.message}`);
    }
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Starting Merchant Order Flow Tests');
  console.log('=' .repeat(60));
  
  // 基础健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }
  
  // 支付提供商检查
  await testPaymentProviders();
  
  // 核心业务流程测试
  console.log('\n📋 Testing Core Business Flow...');
  await testOrderCreation();
  await testPayoutCreation();
  
  // 支付提供商特定测试
  console.log('\n🔄 Testing Payment Provider Specific APIs...');
  await testPassPayCollection();
  await testUnispayCollection();
  
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
  console.log('\n💡 Note: Some tests may fail due to missing merchant configuration or invalid signatures.');
  console.log('💡 This is expected behavior for testing without proper merchant setup.');
}

// 运行测试
runTests().catch(console.error);


