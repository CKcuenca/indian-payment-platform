const axios = require('axios');

// 生产环境配置
const BASE_URL = 'https://cashgit.com';
const API_KEY = 'your-api-key'; // 需要替换为实际的API密钥

// 测试数据
const testData = {
  merchant: {
    name: 'Test Merchant',
    email: 'test@merchant.com',
    phone: '+91-9876543210',
    businessType: 'E-commerce',
    defaultProvider: 'passpay'
  },
  paymentConfig: {
    accountName: 'Test PassPay Account',
    provider: {
      name: 'passpay',
      type: 'wakeup',
      subType: 'wakeup',
      accountId: 'test-merchant-123',
      secretKey: 'test-secret-key',
      environment: 'sandbox',
      payId: 'test-pay-id-123'
    },
    description: 'Test PassPay configuration',
    limits: {
      collection: {
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        singleTransactionLimit: 100000,
        minTransactionAmount: 100
      },
      payout: {
        dailyLimit: 1000000,
        monthlyLimit: 10000000,
        singleTransactionLimit: 100000,
        minTransactionAmount: 100
      }
    },
    fees: {
      collection: {
        transactionFee: 0.5,
        fixedFee: 0
      },
      payout: {
        transactionFee: 0.3,
        fixedFee: 6
      }
    },
    priority: 1,
    status: 'ACTIVE'
  },
  order: {
    merchantId: 'test-merchant-123',
    amount: 1000, // 10.00 INR
    currency: 'INR',
    orderId: `test-order-${Date.now()}`,
    description: 'Test payment order',
    customerInfo: {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+91-9876543210'
    },
    notifyUrl: 'https://cashgit.com/api/webhook/notify',
    returnUrl: 'https://cashgit.com/payment/success'
  }
};

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
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

async function testMerchantCreation() {
  try {
    const response = await api.post('/api/merchants', testData.merchant);
    if (response.data.success) {
      testData.merchantId = response.data.merchant._id;
      logTest('Merchant Creation', true, 
        `Merchant created successfully. ID: ${testData.merchantId}`);
      return true;
    } else {
      logTest('Merchant Creation', false, 
        `Merchant creation failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logTest('Merchant Creation', false, 
      `Merchant creation error: ${error.message}`, error.response?.data);
    return false;
  }
}

async function testPaymentConfigCreation() {
  try {
    const response = await api.post('/api/payment-config', testData.paymentConfig);
    if (response.data.success) {
      testData.paymentConfigId = response.data.config._id;
      logTest('Payment Config Creation', true, 
        `Payment config created successfully. ID: ${testData.paymentConfigId}`);
      return true;
    } else {
      logTest('Payment Config Creation', false, 
        `Payment config creation failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logTest('Payment Config Creation', false, 
      `Payment config creation error: ${error.message}`, error.response?.data);
    return false;
  }
}

async function testOrderCreation() {
  try {
    const response = await api.post('/api/orders', testData.order);
    if (response.data.success) {
      testData.orderId = response.data.order._id;
      testData.paymentUrl = response.data.paymentUrl;
      logTest('Order Creation', true, 
        `Order created successfully. ID: ${testData.orderId}`);
      logTest('Payment URL Generation', true, 
        `Payment URL: ${testData.paymentUrl}`);
      return true;
    } else {
      logTest('Order Creation', false, 
        `Order creation failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logTest('Order Creation', false, 
      `Order creation error: ${error.message}`, error.response?.data);
    return false;
  }
}

async function testOrderQuery() {
  try {
    const response = await api.get(`/api/orders/${testData.orderId}`);
    if (response.data.success) {
      logTest('Order Query', true, 
        `Order queried successfully. Status: ${response.data.order.status}`);
      return true;
    } else {
      logTest('Order Query', false, 
        `Order query failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logTest('Order Query', false, 
      `Order query error: ${error.message}`, error.response?.data);
    return false;
  }
}

async function testPaymentProviders() {
  try {
    const response = await api.get('/api/payment-providers');
    if (response.data.success) {
      const providers = response.data.providers;
      logTest('Payment Providers List', true, 
        `Available providers: ${providers.join(', ')}`);
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

async function testMerchantList() {
  try {
    const response = await api.get('/api/merchants');
    if (response.data.success) {
      logTest('Merchant List', true, 
        `Found ${response.data.merchants.length} merchants`);
      return true;
    } else {
      logTest('Merchant List', false, 
        `Merchant list query failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logTest('Merchant List', false, 
      `Merchant list query error: ${error.message}`, error.response?.data);
    return false;
  }
}

async function testPaymentConfigList() {
  try {
    const response = await api.get('/api/payment-config');
    if (response.data.success) {
      logTest('Payment Config List', true, 
        `Found ${response.data.configs.length} payment configurations`);
      return true;
    } else {
      logTest('Payment Config List', false, 
        `Payment config list query failed: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logTest('Payment Config List', false, 
      `Payment config list query error: ${error.message}`, error.response?.data);
    return false;
  }
}

// 清理测试数据
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  if (testData.paymentConfigId) {
    try {
      await api.delete(`/api/payment-config/${testData.paymentConfigId}`);
      console.log('✅ Payment config deleted');
    } catch (error) {
      console.log('⚠️ Failed to delete payment config:', error.message);
    }
  }
  
  if (testData.merchantId) {
    try {
      await api.delete(`/api/merchants/${testData.merchantId}`);
      console.log('✅ Merchant deleted');
    } catch (error) {
      console.log('⚠️ Failed to delete merchant:', error.message);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 Starting Production Environment Comprehensive Tests');
  console.log('=' .repeat(60));
  
  // 基础健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }
  
  // 基础功能测试
  await testPaymentProviders();
  await testMerchantList();
  await testPaymentConfigList();
  
  // 核心业务流程测试
  console.log('\n📋 Testing Core Business Flow...');
  const merchantOk = await testMerchantCreation();
  const configOk = await testPaymentConfigCreation();
  
  if (merchantOk && configOk) {
    await testOrderCreation();
    await testOrderQuery();
  } else {
    console.log('⚠️ Skipping order tests due to setup failures');
  }
  
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
  
  // 清理测试数据
  await cleanupTestData();
  
  console.log('\n🏁 Test completed!');
}

// 运行测试
runTests().catch(console.error);


