const axios = require('axios');
const crypto = require('crypto');

/**
 * DhPay快速测试脚本
 * 测试DhPay集成的基本功能
 */

const BASE_URL = 'http://localhost:3001';

/**
 * 生成签名
 */
function generateSignature(params, secretKey) {
  // 过滤空值参数，sign参数不参与签名
  const filteredParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
      filteredParams[key] = value;
    }
  }

  // 按参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(filteredParams).sort();

  // 使用URL键值对格式拼接
  const stringA = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');

  // 拼接密钥
  const stringSignTemp = stringA + secretKey;

  // MD5加密并转大写
  const signature = crypto
    .createHash('md5')
    .update(stringSignTemp)
    .digest('hex')
    .toUpperCase();

  return signature;
}

/**
 * 生成DhPay回调签名
 */
function generateDhPayCallbackSignature(params, secretKey) {
  // 过滤空值参数，sign参数不参与签名
  const filteredParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
      filteredParams[key] = value;
    }
  }

  // 按参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(filteredParams).sort();

  // 使用URL键值对格式拼接
  const stringA = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');

  // 拼接密钥
  const stringSignTemp = stringA + secretKey;

  // MD5加密并转大写
  const signature = crypto
    .createHash('md5')
    .update(stringSignTemp)
    .digest('hex')
    .toUpperCase();

  return signature;
}

async function quickTest() {
  console.log('🚀 开始DhPay快速测试...\n');

  try {
    // 使用测试商户信息
    const appid = 'test_merchant_001'; // 测试商户ID
    const secretKey = 'test_secret_key_001'; // 测试商户密钥
    
    // 测试1: 创建DhPay唤醒支付订单
    console.log('🧪 测试1: 创建DhPay唤醒支付订单...');
    
    const orderData = {
      appid: appid,
      orderid: `QUICK_TEST_${Date.now()}`,
      amount: 100,
      desc: '快速测试',
      useDhPay: true,
      notify_url: 'http://localhost:3001/api/wakeup/notify',
      return_url: 'http://localhost:3001/api/wakeup/return',
      timestamp: Date.now().toString()
    };

    // 生成签名
    orderData.sign = generateSignature(orderData, secretKey);

    console.log('发送订单数据:', orderData);

    const response = await axios.post(`${BASE_URL}/api/wakeup/create`, orderData);
    
    console.log('✅ 订单创建成功:');
    console.log('响应数据:', response.data);
    console.log('');

    // 测试2: 模拟DhPay回调
    console.log('🧪 测试2: 模拟DhPay回调...');
    
    const callbackData = {
      orderId: response.data.data?.orderid || 'TEST_ORDER',
      amount: '100',
      status: 'SUCCESS',
      timestamp: Date.now().toString(),
      merchantOrderId: response.data.data?.orderid || 'TEST_ORDER',
      transactionId: `TXN_${Date.now()}`,
      fee: '10',
      currency: 'INR'
    };

    // 生成正确的DhPay回调签名
    const dhpaySecretKey = 'CC3F988FCF248AA8C1007C5190D388AB'; // DhPay的密钥
    callbackData.sign = generateDhPayCallbackSignature(callbackData, dhpaySecretKey);

    console.log('发送DhPay回调数据:', callbackData);

    const callbackResponse = await axios.post(`${BASE_URL}/api/wakeup/dhpay-notify`, callbackData);
    
    console.log('✅ 回调处理成功:', callbackResponse.data);
    console.log('');

    console.log('🎯 快速测试完成！DhPay集成正常工作');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
quickTest();
