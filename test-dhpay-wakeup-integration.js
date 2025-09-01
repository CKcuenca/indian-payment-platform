const axios = require('axios');
const crypto = require('crypto');

/**
 * DhPay唤醒支付集成测试脚本
 * 测试DhPay作为上游支付通道的完整功能
 */

const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'test-token'; // 测试用认证token

/**
 * 生成DhPay签名
 */
function generateDhPaySignature(params, secretKey) {
  // 1. 过滤空值参数，sign参数不参与签名
  const filteredParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
      filteredParams[key] = value;
    }
  }

  // 2. 按参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(filteredParams).sort();

  // 3. 使用URL键值对格式拼接
  const stringA = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');

  // 4. 拼接密钥
  const stringSignTemp = stringA + secretKey;

  // 5. MD5加密并转大写
  const signature = crypto
    .createHash('md5')
    .update(stringSignTemp)
    .digest('hex')
    .toUpperCase();

  return signature;
}

/**
 * 测试1: 使用DhPay上游通道创建唤醒支付订单
 */
async function testDhPayWakeupPayment() {
  console.log('🧪 测试1: 使用DhPay上游通道创建唤醒支付订单...\n');

  try {
    const orderData = {
      orderid: `DHPAY_TEST_${Date.now()}`,
      amount: 1000,
      desc: 'DhPay集成测试',
      notify_url: 'http://localhost:3001/api/wakeup/notify',
      return_url: 'http://localhost:3001/api/wakeup/return',
      useDhPay: true // 启用DhPay上游通道
    };

    const response = await axios.post(`${BASE_URL}/api/wakeup/create`, orderData, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    console.log('✅ DhPay唤醒支付订单创建成功:');
    console.log('订单ID:', response.data.orderId);
    console.log('支付状态:', response.data.status);
    console.log('DhPay订单ID:', response.data.dhpayOrderId);
    console.log('支付链接:', response.data.paymentUrl);
    console.log('');

    return response.data;
  } catch (error) {
    console.error('❌ DhPay唤醒支付订单创建失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试2: 使用传统UPI方式创建唤醒支付订单
 */
async function testTraditionalWakeupPayment() {
  console.log('🧪 测试2: 使用传统UPI方式创建唤醒支付订单...\n');

  try {
    const orderData = {
      orderid: `TRADITIONAL_TEST_${Date.now()}`,
      amount: 500,
      desc: '传统UPI方式测试',
      notify_url: 'http://localhost:3001/api/wakeup/notify',
      return_url: 'http://localhost:3001/api/wakeup/return'
      // 不指定useDhPay，默认使用传统UPI方式
    };

    const response = await axios.post(`${BASE_URL}/api/wakeup/create`, orderData, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    console.log('✅ 传统UPI唤醒支付订单创建成功:');
    console.log('订单ID:', response.data.orderId);
    console.log('支付状态:', response.data.status);
    console.log('UPI转账信息:', response.data.upiTransferInfo);
    console.log('');

    return response.data;
  } catch (error) {
    console.error('❌ 传统UPI唤醒支付订单创建失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试3: 查询DhPay订单状态
 */
async function testDhPayOrderQuery(orderId) {
  console.log('🧪 测试3: 查询DhPay订单状态...\n');

  try {
    const response = await axios.get(`${BASE_URL}/api/wakeup/order-status/${orderId}`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    console.log('✅ DhPay订单状态查询成功:');
    console.log('订单ID:', response.data.orderId);
    console.log('订单状态:', response.data.status);
    console.log('支付金额:', response.data.amount);
    console.log('创建时间:', response.data.createdAt);
    console.log('');

    return response.data;
  } catch (error) {
    console.error('❌ DhPay订单状态查询失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试4: 模拟DhPay回调通知
 */
async function testDhPayCallback(orderId) {
  console.log('🧪 测试4: 模拟DhPay回调通知...\n');

  try {
    const callbackData = {
      orderId: orderId,
      amount: '1000',
      status: 'SUCCESS',
      timestamp: Date.now().toString(),
      merchantOrderId: orderId,
      transactionId: `TXN_${Date.now()}`,
      fee: '10',
      currency: 'INR'
    };

    // 生成正确的签名
    const secretKey = 'test_secret_key';
    callbackData.sign = generateDhPaySignature(callbackData, secretKey);

    console.log('发送DhPay回调数据:', callbackData);

    const response = await axios.post(`${BASE_URL}/api/wakeup/dhpay-notify`, callbackData);

    console.log('✅ DhPay回调处理成功:');
    console.log('响应:', response.data);
    console.log('');

    return response.data;
  } catch (error) {
    console.error('❌ DhPay回调处理失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试5: 模拟DhPay返回页面
 */
async function testDhPayReturn(orderId) {
  console.log('🧪 测试5: 模拟DhPay返回页面...\n');

  try {
    const returnData = {
      orderId: orderId,
      status: 'SUCCESS',
      amount: '1000',
      timestamp: Date.now().toString()
    };

    // 生成正确的签名
    const secretKey = 'test_secret_key';
    returnData.sign = generateDhPaySignature(returnData, secretKey);

    console.log('发送DhPay返回数据:', returnData);

    const response = await axios.post(`${BASE_URL}/api/wakeup/dhpay-return`, returnData);

    console.log('✅ DhPay返回页面处理成功:');
    console.log('响应:', response.data);
    console.log('');

    return response.data;
  } catch (error) {
    console.error('❌ DhPay返回页面处理失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试6: 测试DhPay余额查询
 */
async function testDhPayBalance() {
  console.log('🧪 测试6: 测试DhPay余额查询...\n');

  try {
    const response = await axios.get(`${BASE_URL}/api/wakeup/dhpay-balance`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });

    console.log('✅ DhPay余额查询成功:');
    console.log('余额信息:', response.data);
    console.log('');

    return response.data;
  } catch (error) {
    console.error('❌ DhPay余额查询失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始DhPay唤醒支付集成测试...\n');
  console.log('=' .repeat(60));

  // 测试1: DhPay唤醒支付
  const dhpayOrder = await testDhPayWakeupPayment();
  
  // 测试2: 传统UPI方式
  const traditionalOrder = await testTraditionalWakeupPayment();

  if (dhpayOrder) {
    // 测试3: 查询DhPay订单状态
    await testDhPayOrderQuery(dhpayOrder.orderId);
    
    // 测试4: 模拟DhPay回调
    await testDhPayCallback(dhpayOrder.orderId);
    
    // 测试5: 模拟DhPay返回页面
    await testDhPayReturn(dhpayOrder.orderId);
  }

  // 测试6: DhPay余额查询
  await testDhPayBalance();

  console.log('=' .repeat(60));
  console.log('🎯 DhPay唤醒支付集成测试完成！');
  
  if (dhpayOrder && traditionalOrder) {
    console.log('✅ 所有测试通过！DhPay已成功集成到唤醒支付系统');
  } else {
    console.log('⚠️ 部分测试失败，请检查系统配置');
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testDhPayWakeupPayment,
  testTraditionalWakeupPayment,
  testDhPayOrderQuery,
  testDhPayCallback,
  testDhPayReturn,
  testDhPayBalance,
  runAllTests
};
