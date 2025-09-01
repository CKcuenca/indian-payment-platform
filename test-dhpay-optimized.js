const axios = require('axios');
const crypto = require('crypto');

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  appid: 'test_merchant_001',
  secretKey: 'test_secret_key_001',
  dhpaySecretKey: 'CC3F988FCF248AA8C1007C5190D388AB'
};

/**
 * 生成签名
 */
function generateSignature(params, secretKey) {
  // 按ASCII码排序
  const sortedKeys = Object.keys(params).sort();
  const sortedParams = {};
  sortedKeys.forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      sortedParams[key] = params[key];
    }
  });

  // 拼接参数
  const paramStr = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&');
  
  // 拼接密钥
  const stringToSign = paramStr + secretKey;
  
  // MD5加密
  return crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex').toUpperCase();
}

/**
 * 生成DhPay回调签名
 */
function generateDhPayCallbackSignature(params, secretKey) {
  // 按ASCII码排序
  const sortedKeys = Object.keys(params).sort();
  const sortedParams = {};
  sortedKeys.forEach(key => {
    if (params[key] !== undefined && params[key] !== null && key !== 'sign') {
      sortedParams[key] = params[key];
    }
  });

  // 拼接参数
  const paramStr = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&');
  
  // 拼接密钥
  const stringToSign = paramStr + secretKey;
  
  // MD5加密
  return crypto.createHash('md5').update(stringToSign, 'utf8').digest('hex').toUpperCase();
}

/**
 * 测试创建DhPay唤醒支付订单
 */
async function testCreateDhPayOrder() {
  try {
    console.log('\n🧪 测试创建DhPay唤醒支付订单...');
    
    const timestamp = Date.now().toString();
    const orderData = {
      appid: TEST_CONFIG.appid,
      orderid: `DHPAY_OPT_TEST_${timestamp}`,
      amount: 100,
      desc: 'DhPay优化测试',
      useDhPay: true,
      notify_url: 'http://localhost:3001/api/wakeup/dhpay-notify',
      return_url: 'http://localhost:3001/api/wakeup/dhpay-return',
      timestamp: timestamp
    };

    // 生成签名
    const sign = generateSignature(orderData, TEST_CONFIG.secretKey);
    orderData.sign = sign;

    console.log('📤 发送订单数据:', orderData);

    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/wakeup/create`, orderData);
    
    if (response.data.success) {
      console.log('✅ DhPay订单创建成功:', response.data.data);
      return response.data.data.orderid;
    } else {
      console.log('❌ 测试失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试DhPay回调
 */
async function testDhPayCallback(orderId) {
  try {
    console.log('\n🧪 测试DhPay回调...');
    
    const callbackData = {
      orderId: orderId,
      amount: '100',
      status: 'SUCCESS',
      timestamp: Date.now().toString(),
      merchantOrderId: orderId,
      transactionId: `TXN_${Date.now()}`,
      fee: '10',
      currency: 'INR'
    };

    // 生成DhPay回调签名
    const sign = generateDhPayCallbackSignature(callbackData, TEST_CONFIG.dhpaySecretKey);
    callbackData.sign = sign;

    console.log('📤 发送回调数据:', callbackData);

    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/wakeup/dhpay-notify`, callbackData);
    
    if (response.data.success) {
      console.log('✅ DhPay回调处理成功:', response.data.message);
    } else {
      console.log('❌ 回调处理失败:', response.data);
    }
  } catch (error) {
    console.error('❌ 回调测试失败:', error.response?.data || error.message);
  }
}

/**
 * 运行完整测试
 */
async function runTest() {
  console.log('🚀 开始DhPay优化配置测试...');
  console.log('📋 测试配置:', {
    baseUrl: TEST_CONFIG.baseUrl,
    appid: TEST_CONFIG.appid,
    dhpayMerchantId: '66 (硬编码)',
    testType: '简化配置测试'
  });

  // 1. 测试创建订单
  const orderId = await testCreateDhPayOrder();
  
  if (orderId) {
    // 2. 等待一秒后测试回调
    setTimeout(async () => {
      await testDhPayCallback(orderId);
      console.log('\n🎯 DhPay优化配置测试完成！');
    }, 1000);
  } else {
    console.log('\n❌ 测试失败，无法继续回调测试');
  }
}

// 运行测试
runTest();
