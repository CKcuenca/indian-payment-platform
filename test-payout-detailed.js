const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';
const TEST_MERCHANT = {
  merchantId: 'MERCHANT_ME01UHM7',
  apiKey: 'pk_rzz8igydcme01uhm7',
  secretKey: 'sk_mxf9mdelh5me01uhm7'
};

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

// 测试出款申请接口
async function testPayoutCreate() {
  console.log('🔵 测试出款申请接口 /api/payout/create');
  
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
    
    console.log('📝 请求参数:', JSON.stringify(params, null, 2));
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    console.log('🔐 生成的签名:', params.sign);
    
    const response = await axios.post(`${BASE_URL}/api/payout/create`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      }
    });
    
    console.log('✅ 出款申请成功:', JSON.stringify(response.data, null, 2));
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 出款申请失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
      console.log('📊 响应头:', error.response.headers);
    }
    return null;
  }
}

// 测试存款申请接口（对比）
async function testOrderCreate() {
  console.log('\n🔵 测试存款申请接口 /api/order/create（对比）');
  
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
    
    console.log('✅ 存款申请成功:', JSON.stringify(response.data, null, 2));
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 存款申请失败:', error.response?.data || error.message);
    return null;
  }
}

// 主测试函数
async function runTest() {
  console.log('🚀 开始详细测试出款接口...');
  console.log('📍 测试地址:', BASE_URL);
  console.log('👤 测试商户:', TEST_MERCHANT.merchantId);
  
  try {
    // 先测试存款接口（应该工作正常）
    await testOrderCreate();
    
    // 再测试出款接口
    await testPayoutCreate();
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runTest();
}
