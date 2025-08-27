const axios = require('axios');

// 线上服务器配置
const PRODUCTION_URL = 'http://13.200.72.14:3001'; // 假设端口是3001
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

// 测试服务器连接
async function testServerConnection() {
  console.log('🔍 测试服务器连接...');
  try {
    const response = await axios.get(`${PRODUCTION_URL}/health`, { timeout: 5000 });
    console.log('✅ 服务器连接成功:', response.status);
    return true;
  } catch (error) {
    console.log('❌ 服务器连接失败:', error.message);
    return false;
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
    
    const response = await axios.post(`${PRODUCTION_URL}/api/balance/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 10000
    });
    
    console.log('✅ 余额查询成功:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.log('❌ 余额查询失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
    }
    return false;
  }
}

// 测试存款申请接口
async function testOrderCreate() {
  console.log('\n🔵 测试存款申请接口 /api/order/create');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: `PROD_ORDER_${Date.now()}`,
      amount: '1000',
      currency: 'INR',
      payType: 101,
      notifyUrl: 'https://test.com/notify',
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${PRODUCTION_URL}/api/order/create`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 10000
    });
    
    console.log('✅ 存款申请成功:', JSON.stringify(response.data, null, 2));
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 存款申请失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
    }
    return null;
  }
}

// 测试出款申请接口
async function testPayoutCreate() {
  console.log('\n🔵 测试出款申请接口 /api/payout/create');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: `PROD_PAYOUT_${Date.now()}`,
      amount: '500',
      currency: 'INR',
      bankCode: 'HDFC',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      accountName: 'Test User',
      transferMode: 'IMPS',
      remark: '线上测试提现',
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${PRODUCTION_URL}/api/payout/create`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 10000
    });
    
    console.log('✅ 出款申请成功:', JSON.stringify(response.data, null, 2));
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 出款申请失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
    }
    return null;
  }
}

// 测试UPI查询接口
async function testUpiQuery() {
  console.log('\n🔵 测试UPI查询接口 /api/upi-query/query');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${PRODUCTION_URL}/api/upi-query/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 10000
    });
    
    console.log('✅ UPI查询成功:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.log('❌ UPI查询失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
    }
    return false;
  }
}

// 主测试函数
async function runProductionTest() {
  console.log('🚀 开始测试线上统一支付接口...');
  console.log('📍 线上地址:', PRODUCTION_URL);
  console.log('👤 测试商户:', TEST_MERCHANT.merchantId);
  console.log('⏰ 测试时间:', new Date().toLocaleString());
  
  try {
    // 1. 测试服务器连接
    const isConnected = await testServerConnection();
    if (!isConnected) {
      console.log('\n❌ 无法连接到线上服务器，请检查：');
      console.log('   - 服务器是否运行');
      console.log('   - 端口是否正确');
      console.log('   - 防火墙设置');
      return;
    }
    
    // 2. 测试余额查询
    await testBalanceQuery();
    
    // 3. 测试存款申请
    const orderId = await testOrderCreate();
    
    // 4. 测试出款申请
    const payoutId = await testPayoutCreate();
    
    // 5. 测试UPI查询
    await testUpiQuery();
    
    console.log('\n🎉 线上API测试完成！');
    
    if (orderId) {
      console.log('📝 存款订单ID:', orderId);
    }
    if (payoutId) {
      console.log('📝 出款订单ID:', payoutId);
    }
    
  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runProductionTest();
}

module.exports = {
  testServerConnection,
  testBalanceQuery,
  testOrderCreate,
  testPayoutCreate,
  testUpiQuery
};
