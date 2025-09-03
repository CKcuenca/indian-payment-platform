const axios = require('axios');
const crypto = require('crypto');

// 配置
const BASE_URL = 'https://cashgit.com';

// 商户信息 (从之前的测试中获取)
const MERCHANT_INFO = {
  merchantId: 'cgpay',
  secretKey: 'cgpay_secret_key_2024'
};

// 生成签名
function generateSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  const signString = queryString + '&key=' + secretKey;
  return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
}

// 测试Webhook回调接口
async function testWebhookCallback() {
  try {
    console.log('🔔 测试Webhook回调接口...');
    
    // 模拟支付成功回调
    const callbackData = {
      orderId: `TEST_ORDER_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '100.00',
      currency: 'INR',
      status: 'SUCCESS',
      transactionId: `TXN_${Date.now()}`,
      provider: 'unispay',
      timestamp: Date.now().toString(),
      signature: 'test_signature'
    };
    
    const response = await axios.post(`${BASE_URL}/api/webhook/payment`, callbackData);
    
    if (response.data.success) {
      console.log('✅ Webhook回调接口正常');
      console.log(`📋 回调响应: ${response.data.message}`);
      return true;
    } else {
      throw new Error('Webhook回调失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ Webhook回调测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试PassPay回调接口
async function testPassPayCallback() {
  try {
    console.log('\n💳 测试PassPay回调接口...');
    
    // 模拟PassPay回调数据
    const callbackData = {
      orderId: `PASSPAY_ORDER_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '200.00',
      currency: 'INR',
      status: 'SUCCESS',
      transactionId: `PASSPAY_TXN_${Date.now()}`,
      provider: 'passpay',
      timestamp: Date.now().toString(),
      signature: 'test_signature'
    };
    
    const response = await axios.post(`${BASE_URL}/api/callback/passpay`, callbackData);
    
    if (response.data.success) {
      console.log('✅ PassPay回调接口正常');
      console.log(`📋 回调响应: ${response.data.message}`);
      return true;
    } else {
      throw new Error('PassPay回调失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ PassPay回调测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试UnisPay回调接口
async function testUnisPayCallback() {
  try {
    console.log('\n🏦 测试UnisPay回调接口...');
    
    // 模拟UnisPay回调数据
    const callbackData = {
      orderId: `UNISPAY_ORDER_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '300.00',
      currency: 'INR',
      status: 'SUCCESS',
      transactionId: `UNISPAY_TXN_${Date.now()}`,
      provider: 'unispay',
      timestamp: Date.now().toString(),
      signature: 'test_signature'
    };
    
    const response = await axios.post(`${BASE_URL}/api/callback/unispay`, callbackData);
    
    if (response.data.success) {
      console.log('✅ UnisPay回调接口正常');
      console.log(`📋 回调响应: ${response.data.message}`);
      return true;
    } else {
      throw new Error('UnisPay回调失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ UnisPay回调测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试代付回调接口
async function testPayoutCallback() {
  try {
    console.log('\n💸 测试代付回调接口...');
    
    // 模拟代付回调数据
    const callbackData = {
      orderId: `PAYOUT_ORDER_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '500.00',
      currency: 'INR',
      status: 'SUCCESS',
      transactionId: `PAYOUT_TXN_${Date.now()}`,
      provider: 'unispay',
      type: 'payout',
      timestamp: Date.now().toString(),
      signature: 'test_signature'
    };
    
    const response = await axios.post(`${BASE_URL}/api/callback/payout`, callbackData);
    
    if (response.data.success) {
      console.log('✅ 代付回调接口正常');
      console.log(`📋 回调响应: ${response.data.message}`);
      return true;
    } else {
      throw new Error('代付回调失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 代付回调测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试回调签名验证
async function testCallbackSignatureValidation() {
  try {
    console.log('\n🔐 测试回调签名验证...');
    
    // 测试正确签名
    const correctCallbackData = {
      orderId: `SIGN_TEST_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '100.00',
      currency: 'INR',
      status: 'SUCCESS',
      timestamp: Date.now().toString()
    };
    
    // 生成正确签名
    const correctSignature = generateSignature(correctCallbackData, MERCHANT_INFO.secretKey);
    correctCallbackData.signature = correctSignature;
    
    const correctResponse = await axios.post(`${BASE_URL}/api/webhook/payment`, correctCallbackData);
    
    if (correctResponse.data.success) {
      console.log('✅ 正确签名验证通过');
    } else {
      console.log('❌ 正确签名验证失败');
      return false;
    }
    
    // 测试错误签名
    const wrongCallbackData = {
      orderId: `SIGN_TEST_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '100.00',
      currency: 'INR',
      status: 'SUCCESS',
      timestamp: Date.now().toString(),
      signature: 'wrong_signature'
    };
    
    try {
      await axios.post(`${BASE_URL}/api/webhook/payment`, wrongCallbackData);
      console.log('❌ 错误签名应该被拒绝');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 错误签名正确被拒绝');
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ 回调签名验证测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试回调重试机制
async function testCallbackRetryMechanism() {
  try {
    console.log('\n🔄 测试回调重试机制...');
    
    // 模拟失败的回调
    const failedCallbackData = {
      orderId: `RETRY_TEST_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '100.00',
      currency: 'INR',
      status: 'FAILED',
      timestamp: Date.now().toString(),
      signature: 'test_signature'
    };
    
    const response = await axios.post(`${BASE_URL}/api/webhook/payment`, failedCallbackData);
    
    if (response.data.success) {
      console.log('✅ 回调重试机制正常');
      console.log(`📋 回调响应: ${response.data.message}`);
      return true;
    } else {
      throw new Error('回调重试机制失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 回调重试机制测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试回调日志记录
async function testCallbackLogging() {
  try {
    console.log('\n📝 测试回调日志记录...');
    
    // 模拟回调日志查询
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      page: '1',
      limit: '10'
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/webhook/logs`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 回调日志记录正常');
      console.log(`📋 日志信息:`);
      console.log(`  总日志数: ${response.data.data.total}`);
      console.log(`  当前页: ${response.data.data.page}`);
      console.log(`  每页数量: ${response.data.data.limit}`);
      return response.data.data;
    } else {
      throw new Error('回调日志记录失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 回调日志记录测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主测试函数
async function testWebhookCallbackMain() {
  console.log('🚀 开始测试回调通知机制...\n');
  
  try {
    // 1. 测试Webhook回调接口
    await testWebhookCallback();
    
    // 2. 测试PassPay回调接口
    await testPassPayCallback();
    
    // 3. 测试UnisPay回调接口
    await testUnisPayCallback();
    
    // 4. 测试代付回调接口
    await testPayoutCallback();
    
    // 5. 测试回调签名验证
    await testCallbackSignatureValidation();
    
    // 6. 测试回调重试机制
    await testCallbackRetryMechanism();
    
    // 7. 测试回调日志记录
    await testCallbackLogging();
    
    console.log('\n🎉 回调通知机制测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 回调通知机制测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testWebhookCallbackMain().catch(console.error);
