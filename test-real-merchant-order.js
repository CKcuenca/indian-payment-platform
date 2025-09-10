const axios = require('axios');

// 生产环境配置
const BASE_URL = 'https://cashgit.com';

// 真实的商户数据
const realMerchantData = {
  appid: 'MERCHANT_MEWZV8HV', // 真实的商户ID
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

async function testOrderCreation() {
  try {
    console.log('\n📋 Testing Order Creation with REAL merchant data:');
    console.log('Merchant ID:', realMerchantData.appid);
    console.log('Order ID:', realMerchantData.mchOrderId);
    console.log('Amount:', realMerchantData.amount, 'INR');
    
    const response = await api.post('/api/order/create', realMerchantData);
    
    if (response.data.code === 200) {
      logTest('Order Creation', true, 
        `Order created successfully! Order ID: ${response.data.data?.orderId}`);
      logTest('Payment URL', true, 
        `Payment URL: ${response.data.data?.paymentUrl}`);
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
      appid: 'MERCHANT_MEWZV8HV',
      mchOrderId: `test-payout-${Date.now()}`,
      amount: 500,
      currency: 'INR',
      payType: 'UPI',
      upiId: 'test@upi',
      notifyUrl: 'https://cashgit.com/api/webhook/notify',
      timestamp: Math.floor(Date.now() / 1000),
      sign: 'test-signature'
    };
    
    console.log('\n💰 Testing Payout Creation with REAL merchant data:');
    console.log('Merchant ID:', payoutData.appid);
    console.log('Payout ID:', payoutData.mchOrderId);
    console.log('Amount:', payoutData.amount, 'INR');
    
    const response = await api.post('/api/payout/create', payoutData);
    
    if (response.data.code === 200) {
      logTest('Payout Creation', true, 
        `Payout created successfully! Payout ID: ${response.data.data?.payoutId}`);
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

async function testOrderQuery() {
  try {
    // 先创建一个订单
    const orderResponse = await api.post('/api/order/create', realMerchantData);
    
    if (orderResponse.data.code === 200) {
      const orderId = orderResponse.data.data?.orderId;
      console.log('\n🔍 Testing Order Query for order:', orderId);
      
      // 查询订单状态
      const queryData = {
        appid: 'MERCHANT_MEWZV8HV',
        orderId: orderId,
        timestamp: Math.floor(Date.now() / 1000),
        sign: 'test-signature'
      };
      
      const response = await api.post('/api/order/query', queryData);
      
      if (response.data.code === 200) {
        logTest('Order Query', true, 
          `Order queried successfully! Status: ${response.data.data?.status}`);
        return true;
      } else {
        logTest('Order Query', false, 
          `Order query failed: ${response.data.message}`, response.data);
        return false;
      }
    } else {
      logTest('Order Query', false, 
        `Cannot test order query - order creation failed: ${orderResponse.data.message}`);
      return false;
    }
  } catch (error) {
    if (error.response) {
      logTest('Order Query', false, 
        `Order query error: ${error.response.data.message || error.message}`, error.response.data);
    } else {
      logTest('Order Query', false, 
        `Order query error: ${error.message}`);
    }
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Starting Real Merchant Order Flow Tests');
  console.log('=' .repeat(60));
  console.log('Using REAL merchant data from production environment');
  console.log('Merchant ID: MERCHANT_MEWZV8HV');
  console.log('Available payment providers: unispay, dhpay, passpay');
  
  // 基础健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }
  
  // 核心业务流程测试
  console.log('\n📋 Testing Core Business Flow with REAL data...');
  await testOrderCreation();
  await testPayoutCreation();
  await testOrderQuery();
  
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
  console.log('\n💡 Note: Some tests may fail due to signature validation or payment provider configuration.');
  console.log('💡 This is expected behavior for testing without proper signatures.');
}

// 运行测试
runTests().catch(console.error);


