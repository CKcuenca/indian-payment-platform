const axios = require('axios');
const SignatureUtil = require('./server/utils/signature');

const BASE_URL = 'http://localhost:3000/api';

// 测试商户信息
const testMerchant = {
  appid: 'test_merchant_001',
  secretKey: 'test_secret_key_123'
};

// 生成签名
function generateSignedParams(params, secretKey) {
  const signature = SignatureUtil.generateMD5Signature(params, secretKey);
  return { ...params, sign: signature };
}

// 测试创建支付订单
async function testCreatePayment() {
  console.log('=== 测试CashGit创建支付订单 ===');
  
  const params = {
    appid: testMerchant.appid,
    orderid: `cashgit_${Date.now()}`,
    amount: '100.50',
    desc: 'CashGit测试支付订单',
    notify_url: 'http://example.com/notify',
    return_url: 'http://example.com/return'
  };
  
  const signedParams = generateSignedParams(params, testMerchant.secretKey);
  
  console.log('请求参数:', JSON.stringify(signedParams, null, 2));
  
  try {
    const response = await axios.post(`${BASE_URL}/pay`, signedParams, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('创建订单响应:', response.data);
    return response.data.data?.orderid;
  } catch (error) {
    console.error('创建订单失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// 测试查询订单
async function testQueryOrder(orderid) {
  console.log('\n=== 测试CashGit查询订单 ===');
  
  const params = {
    appid: testMerchant.appid,
    orderid: orderid
  };
  
  const signedParams = generateSignedParams(params, testMerchant.secretKey);
  
  try {
    const response = await axios.post(`${BASE_URL}/query`, signedParams);
    console.log('查询订单响应:', response.data);
  } catch (error) {
    console.error('查询订单失败:', error.response?.data || error.message);
  }
}

// 测试关闭订单
async function testCloseOrder(orderid) {
  console.log('\n=== 测试CashGit关闭订单 ===');
  
  const params = {
    appid: testMerchant.appid,
    orderid: orderid
  };
  
  const signedParams = generateSignedParams(params, testMerchant.secretKey);
  
  try {
    const response = await axios.post(`${BASE_URL}/close`, signedParams);
    console.log('关闭订单响应:', response.data);
  } catch (error) {
    console.error('关闭订单失败:', error.response?.data || error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('开始CashGit支付API测试...\n');
  
  // 1. 创建订单
  const orderid = await testCreatePayment();
  
  if (orderid) {
    // 2. 查询订单
    await testQueryOrder(orderid);
    
    // 3. 关闭订单
    await testCloseOrder(orderid);
  }
  
  console.log('\n测试完成！');
}

// 运行测试
runTests().catch(console.error);
