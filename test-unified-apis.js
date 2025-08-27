const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';
const TEST_MERCHANT = {
  merchantId: 'MERCHANT_ME01UHM7',
  apiKey: 'pk_rzz8igydcme01uhm7',
  secretKey: 'sk_mxf9mdelh5me01uhm7'
};

// 注意：认证中间件期望的参数名是 'appid' 而不是 'mchNo'

// 生成签名
function generateSignature(params, secretKey) {
  const crypto = require('crypto');
  
  // 1. 参数按ASCII码从小到大排序
  const sortedKeys = Object.keys(params).sort();
  
  // 2. 按 key=value&key=value... 格式拼接参数签名源串
  const signString = sortedKeys
    .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&') + secretKey;
  
  // 3. 计算MD5散列值
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex');
}

// 测试存款申请接口
async function testOrderCreate() {
  console.log('\n🔵 测试存款申请接口 /api/order/create');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: `TEST_ORDER_${Date.now()}`,
      amount: '1000',
      currency: 'INR',
      payType: 101,
      notifyUrl: 'https://test.com/notify',
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/order/create`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      }
    });
    
    console.log('✅ 存款申请成功:', response.data);
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 存款申请失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试存款查询接口
async function testOrderQuery(orderId) {
  if (!orderId) {
    console.log('⚠️  跳过存款查询测试 - 没有订单ID');
    return;
  }
  
  console.log('\n🔵 测试存款查询接口 /api/order/query');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: orderId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/order/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      }
    });
    
    console.log('✅ 存款查询成功:', response.data);
    
  } catch (error) {
    console.log('❌ 存款查询失败:', error.response?.data || error.message);
  }
}

// 测试出款申请接口
async function testPayoutCreate() {
  console.log('\n🔵 测试出款申请接口 /api/payout/create');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: `TEST_PAYOUT_${Date.now()}`,
      amount: '500',
      currency: 'INR',
      bankCode: 'HDFC',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      accountName: 'Test User',
      transferMode: 'IMPS',
      remark: '测试提现',
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/payout/create`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      }
    });
    
    console.log('✅ 出款申请成功:', response.data);
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 出款申请失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试出款查询接口
async function testPayoutQuery(orderId) {
  if (!orderId) {
    console.log('⚠️  跳过出款查询测试 - 没有订单ID');
    return;
  }
  
  console.log('\n🔵 测试出款查询接口 /api/payout/query');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: orderId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/payout/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      }
    });
    
    console.log('✅ 出款查询成功:', response.data);
    
  } catch (error) {
    console.log('❌ 出款查询失败:', error.response?.data || error.message);
  }
}

// 测试余额查询接口
async function testBalanceQuery() {
  console.log('\n🔵 测试余额查询接口 /api/balance/query');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/balance/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      }
    });
    
    console.log('✅ 余额查询成功:', response.data);
    
  } catch (error) {
    console.log('❌ 余额查询失败:', error.response?.data || error.message);
  }
}

// 测试UPI查询接口
async function testUpiQuery(orderId) {
  if (!orderId) {
    console.log('⚠️  跳过UPI查询测试 - 没有订单ID');
    return;
  }
  
  console.log('\n🔵 测试UPI查询接口 /api/upi-query/query');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: orderId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/upi-query/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      }
    });
    
    console.log('✅ UPI查询成功:', response.data);
    
  } catch (error) {
    console.log('❌ UPI查询失败:', error.response?.data || error.message);
  }
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始测试统一支付接口...');
  console.log('📍 测试地址:', BASE_URL);
  console.log('👤 测试商户:', TEST_MERCHANT.merchantId);
  
  try {
    // 测试存款流程
    const depositOrderId = await testOrderCreate();
    await testOrderQuery(depositOrderId);
    
    // 测试出款流程
    const payoutOrderId = await testPayoutCreate();
    await testPayoutQuery(payoutOrderId);
    
    // 测试查询接口
    await testBalanceQuery();
    await testUpiQuery(depositOrderId);
    
    console.log('\n🎉 所有接口测试完成！');
    
  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testOrderCreate,
  testOrderQuery,
  testPayoutCreate,
  testPayoutQuery,
  testBalanceQuery,
  testUpiQuery
};
