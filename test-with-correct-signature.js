const axios = require('axios');
const crypto = require('crypto');

// 生产环境配置
const BASE_URL = 'https://cashgit.com';

// 真实的商户数据
const merchantId = 'MERCHANT_MEWZV8HV';
const secretKey = 'sk_wdvi3j7hy7mewzv8hv';

// 签名工具类
class SignatureUtil {
  /**
   * 生成MD5签名
   * @param {Object} params - 请求参数对象
   * @param {string} secretKey - 商户密钥
   * @returns {string} MD5签名
   */
  static generateMD5Signature(params, secretKey) {
    try {
      // 1. 参数按ASCII码从小到大排序
      const sortedParams = this.sortParamsByASCII(params);
      
      // 2. 按 key=value&key=value... 格式拼接参数签名源串
      const sourceString = this.buildSourceString(sortedParams);
      
      // 3. 拼接好的源串最后拼接上 secret key
      const finalString = sourceString + secretKey;
      
      // 4. 计算最终拼接好签名源串的MD5散列值
      const signature = this.calculateMD5(finalString);
      
      return signature;
    } catch (error) {
      console.error('生成MD5签名失败:', error);
      throw new Error('签名生成失败');
    }
  }

  /**
   * 参数按ASCII码从小到大排序
   * @param {Object} params - 请求参数
   * @returns {Object} 排序后的参数
   */
  static sortParamsByASCII(params) {
    const sortedParams = {};
    const keys = Object.keys(params).sort();
    
    keys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        sortedParams[key] = params[key];
      }
    });
    
    return sortedParams;
  }

  /**
   * 构建签名源串
   * @param {Object} params - 排序后的参数
   * @returns {string} 签名源串
   */
  static buildSourceString(params) {
    const pairs = [];
    
    Object.keys(params).forEach(key => {
      // 跳过sign参数，避免循环签名
      if (key !== 'sign') {
        pairs.push(`${key}=${params[key]}`);
      }
    });
    
    // 按 key=value&key=value... 格式拼接，注意：源串最后没有"&"
    return pairs.join('&');
  }

  /**
   * 计算MD5散列值
   * @param {string} string - 待计算字符串
   * @returns {string} MD5散列值
   */
  static calculateMD5(string) {
    return crypto.createHash('md5').update(string, 'utf8').digest('hex');
  }
}

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

// 生成带签名的订单数据
function generateOrderData() {
  const orderData = {
    appid: merchantId,
    mchOrderId: `test-order-${Date.now()}`,
    amount: 1000, // 10.00 INR
    currency: 'INR',
    payType: 'UPI',
    notifyUrl: 'https://cashgit.com/api/webhook/notify',
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  // 生成签名
  const signature = SignatureUtil.generateMD5Signature(orderData, secretKey);
  orderData.sign = signature;
  
  return orderData;
}

// 生成带签名的代付数据
function generatePayoutData() {
  const payoutData = {
    appid: merchantId,
    mchOrderId: `test-payout-${Date.now()}`,
    amount: 500, // 5.00 INR
    currency: 'INR',
    payType: 'UPI',
    upiId: 'test@upi',
    notifyUrl: 'https://cashgit.com/api/webhook/notify',
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  // 生成签名
  const signature = SignatureUtil.generateMD5Signature(payoutData, secretKey);
  payoutData.sign = signature;
  
  return payoutData;
}

// 生成带签名的查询数据
function generateQueryData(orderId) {
  const queryData = {
    appid: merchantId,
    orderId: orderId,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  // 生成签名
  const signature = SignatureUtil.generateMD5Signature(queryData, secretKey);
  queryData.sign = signature;
  
  return queryData;
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
    const orderData = generateOrderData();
    
    console.log('\n📋 Testing Order Creation with CORRECT signature:');
    console.log('Merchant ID:', orderData.appid);
    console.log('Order ID:', orderData.mchOrderId);
    console.log('Amount:', orderData.amount, 'INR');
    console.log('Signature:', orderData.sign);
    
    const response = await api.post('/api/order/create', orderData);
    
    if (response.data.code === 200) {
      logTest('Order Creation', true, 
        `Order created successfully! Order ID: ${response.data.data?.orderId}`);
      logTest('Payment URL', true, 
        `Payment URL: ${response.data.data?.paymentUrl}`);
      return response.data.data?.orderId;
    } else {
      logTest('Order Creation', false, 
        `Order creation failed: ${response.data.message}`, response.data);
      return null;
    }
  } catch (error) {
    if (error.response) {
      logTest('Order Creation', false, 
        `Order creation error: ${error.response.data.message || error.message}`, error.response.data);
    } else {
      logTest('Order Creation', false, 
        `Order creation error: ${error.message}`);
    }
    return null;
  }
}

async function testPayoutCreation() {
  try {
    const payoutData = generatePayoutData();
    
    console.log('\n💰 Testing Payout Creation with CORRECT signature:');
    console.log('Merchant ID:', payoutData.appid);
    console.log('Payout ID:', payoutData.mchOrderId);
    console.log('Amount:', payoutData.amount, 'INR');
    console.log('Signature:', payoutData.sign);
    
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

async function testOrderQuery(orderId) {
  try {
    if (!orderId) {
      logTest('Order Query', false, 'Cannot test order query - no order ID available');
      return false;
    }
    
    const queryData = generateQueryData(orderId);
    
    console.log('\n🔍 Testing Order Query with CORRECT signature:');
    console.log('Merchant ID:', queryData.appid);
    console.log('Order ID:', queryData.orderId);
    console.log('Signature:', queryData.sign);
    
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
  console.log('🚀 Starting Real Merchant Order Flow Tests with CORRECT Signatures');
  console.log('=' .repeat(70));
  console.log('Using REAL merchant data from production environment');
  console.log('Merchant ID:', merchantId);
  console.log('Secret Key:', secretKey);
  console.log('Available payment providers: unispay, dhpay, passpay');
  
  // 基础健康检查
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Health check failed, stopping tests');
    return;
  }
  
  // 核心业务流程测试
  console.log('\n📋 Testing Core Business Flow with CORRECT signatures...');
  const orderId = await testOrderCreation();
  await testPayoutCreation();
  await testOrderQuery(orderId);
  
  // 显示测试结果
  console.log('\n' + '='.repeat(70));
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
  console.log('\n💡 Note: Tests now use correct MD5 signatures based on the actual signature algorithm.');
}

// 运行测试
runTests().catch(console.error);


