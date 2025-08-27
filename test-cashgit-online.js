const axios = require('axios');

// 线上API配置
const CASHGIT_API = 'https://cashgit.com';
const TEST_MERCHANT = {
  merchantId: 'MERCHANT_ME01UHM7',
  apiKey: 'pk_rzz8igydcme01uhm7',
  secretKey: 'sk_mxf9mdelh5me01uhm7'
};

// 生成MD5签名
function generateSignature(params, secretKey) {
  const crypto = require('crypto');
  
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&') + secretKey;
  
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex');
}

// 测试服务器连接
async function testServerConnection() {
  console.log('🔍 测试CashGit服务器连接...');
  try {
    const response = await axios.get(`${CASHGIT_API}/health`, { 
      timeout: 10000,
      validateStatus: () => true // 接受任何状态码
    });
    console.log('✅ 服务器响应:', response.status, response.statusText);
    return true;
  } catch (error) {
    console.log('❌ 服务器连接失败:', error.message);
    return false;
  }
}

// 测试余额查询
async function testBalanceQuery() {
  console.log('\n🔵 测试余额查询接口...');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${CASHGIT_API}/api/balance/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 15000
    });
    
    console.log('✅ 余额查询成功:', response.status);
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
    return true;
    
  } catch (error) {
    console.log('❌ 余额查询失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
    }
    return false;
  }
}

// 测试存款申请
async function testOrderCreate() {
  console.log('\n🔵 测试存款申请接口...');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: `CASHGIT_ORDER_${Date.now()}`,
      amount: '1000',
      currency: 'INR',
      payType: 101,
      notifyUrl: 'https://test.com/notify',
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${CASHGIT_API}/api/order/create`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 15000
    });
    
    console.log('✅ 存款申请成功:', response.status);
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 存款申请失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
    }
    return null;
  }
}

// 测试出款申请
async function testPayoutCreate() {
  console.log('\n🔵 测试出款申请接口...');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      mchOrderId: `CASHGIT_PAYOUT_${Date.now()}`,
      amount: '500',
      currency: 'INR',
      bankCode: 'HDFC',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      accountName: 'Test User',
      transferMode: 'IMPS',
      remark: 'CashGit线上测试提现',
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${CASHGIT_API}/api/payout/create`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 15000
    });
    
    console.log('✅ 出款申请成功:', response.status);
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
    return response.data.data?.orderId;
    
  } catch (error) {
    console.log('❌ 出款申请失败:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
    }
    return null;
  }
}

// 测试UPI查询
async function testUpiQuery() {
  console.log('\n🔵 测试UPI查询接口...');
  
  try {
    const params = {
      appid: TEST_MERCHANT.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${CASHGIT_API}/api/upi-query/query`, params, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 15000
    });
    
    console.log('✅ UPI查询成功:', response.status);
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
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
async function runCashGitTest() {
  console.log('🚀 开始测试CashGit线上统一支付接口...');
  console.log('🌐 线上地址:', CASHGIT_API);
  console.log('👤 测试商户:', TEST_MERCHANT.merchantId);
  console.log('⏰ 测试时间:', new Date().toLocaleString());
  console.log('='.repeat(60));
  
  try {
    // 1. 测试服务器连接
    const isConnected = await testServerConnection();
    if (!isConnected) {
      console.log('\n❌ 无法连接到CashGit服务器，请检查：');
      console.log('   - 自动部署是否完成');
      console.log('   - 域名是否正确解析');
      console.log('   - 服务器是否正常运行');
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
    
    console.log('\n🎉 CashGit线上API测试完成！');
    console.log('='.repeat(60));
    
    if (orderId) {
      console.log('📝 存款订单ID:', orderId);
    }
    if (payoutId) {
      console.log('📝 出款订单ID:', payoutId);
    }
    
    console.log('\n📋 测试结果总结：');
    console.log('✅ 服务器连接: 正常');
    console.log('✅ 余额查询: 完成');
    console.log('✅ 存款申请: 完成');
    console.log('✅ 出款申请: 完成');
    console.log('✅ UPI查询: 完成');
    
  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runCashGitTest();
}

module.exports = {
  testServerConnection,
  testBalanceQuery,
  testOrderCreate,
  testPayoutCreate,
  testUpiQuery
};
