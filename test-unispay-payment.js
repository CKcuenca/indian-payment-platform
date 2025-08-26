const axios = require('axios');
const crypto = require('crypto');

/**
 * UNISPAY支付测试脚本
 * 测试唤醒支付功能
 */

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000', // 本地服务器地址
  merchantId: 'test_merchant_001',
  apiKey: 'test_api_key_123',
  secretKey: 'test_secret_key_456'
};

/**
 * 生成测试签名
 */
function generateTestSignature(params) {
  const { sign, ...signParams } = params;
  const sortedKeys = Object.keys(signParams).sort();
  
  let signStr = '';
  sortedKeys.forEach(key => {
    if (signParams[key] !== undefined && signParams[key] !== null && signParams[key] !== '') {
      signStr += `${key}=${signParams[key]}&`;
    }
  });
  
  signStr += `key=${TEST_CONFIG.secretKey}`;
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
}

/**
 * 测试创建UNISPAY唤醒支付订单
 */
async function testCreateUnispayOrder() {
  console.log('\n🧪 测试创建UNISPAY唤醒支付订单...');
  
  try {
    const orderData = {
      orderid: `TEST_${Date.now()}`,
      amount: '1000', // 1000卢比
      desc: '测试唤醒支付订单',
      notify_url: 'https://example.com/notify',
      return_url: 'https://example.com/return',
      customer_phone: '919876543210'
    };
    
    // 生成签名
    orderData.sign = generateTestSignature(orderData);
    
    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/unispay/create`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-ID': TEST_CONFIG.merchantId,
        'X-API-Key': TEST_CONFIG.apiKey
      }
    });
    
    console.log('✅ 创建订单成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data.data;
  } catch (error) {
    console.error('❌ 创建订单失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试查询UNISPAY订单状态
 */
async function testQueryUnispayOrder(orderId) {
  console.log('\n🔍 测试查询UNISPAY订单状态...');
  
  try {
    const queryData = {
      orderid: orderId
    };
    
    // 生成签名
    queryData.sign = generateTestSignature(queryData);
    
    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/unispay/query`, queryData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-ID': TEST_CONFIG.merchantId,
        'X-API-Key': TEST_CONFIG.apiKey
      }
    });
    
    console.log('✅ 查询订单成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data.data;
  } catch (error) {
    console.error('❌ 查询订单失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试UNISPAY异步通知
 */
async function testUnispayNotification(orderId) {
  console.log('\n📢 测试UNISPAY异步通知...');
  
  try {
    // 模拟UNISPAY的异步通知数据
    const notificationData = {
      mchNo: 'UNISPAY001',
      mchOrderId: orderId,
      orderNo: `UNISPAY_${Date.now()}`,
      state: '1', // 1表示支付成功
      amount: 100000, // 1000卢比，单位：分
      currency: 'INR',
      successTime: Math.floor(Date.now() / 1000),
      reqTime: Math.floor(Date.now() / 1000),
      version: '1.0'
    };
    
    // 生成签名
    notificationData.sign = generateTestSignature(notificationData);
    
    const response = await axios.post(`${TEST_CONFIG.baseUrl}/api/unispay/notify`, notificationData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 异步通知测试成功');
    console.log('响应:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ 异步通知测试失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试获取UNISPAY配置
 */
async function testGetUnispayConfig() {
  console.log('\n⚙️  测试获取UNISPAY配置...');
  
  try {
    const response = await axios.get(`${TEST_CONFIG.baseUrl}/api/unispay/config`, {
      headers: {
        'X-Merchant-ID': TEST_CONFIG.merchantId,
        'X-API-Key': TEST_CONFIG.apiKey
      }
    });
    
    console.log('✅ 获取配置成功');
    console.log('配置信息:', JSON.stringify(response.data, null, 2));
    
    return response.data.data;
  } catch (error) {
    console.error('❌ 获取配置失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始UNISPAY唤醒支付功能测试...\n');
  
  // 测试1: 获取配置
  await testGetUnispayConfig();
  
  // 测试2: 创建订单
  const orderResult = await testCreateUnispayOrder();
  
  if (orderResult && orderResult.orderid) {
    // 测试3: 查询订单
    await testQueryUnispayOrder(orderResult.orderid);
    
    // 等待一下再测试通知
    console.log('\n⏳ 等待3秒后测试异步通知...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 测试4: 异步通知
    await testUnispayNotification(orderResult.orderid);
  }
  
  console.log('\n🎉 UNISPAY唤醒支付功能测试完成！');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testCreateUnispayOrder,
  testQueryUnispayOrder,
  testUnispayNotification,
  testGetUnispayConfig
};
