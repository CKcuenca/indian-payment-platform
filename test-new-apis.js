const axios = require('axios');
const crypto = require('crypto');

// 测试配置
const API_BASE = 'http://localhost:3000/api';
const TEST_APPID = 'test_merchant_001';
const TEST_SECRET_KEY = 'test_secret_key_123';

// 生成签名
function generateSignature(params, secretKey) {
  // 过滤空值和null，按ASCII排序
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      filteredParams[key] = params[key];
    }
  });

  // 按ASCII排序并拼接
  const sortedKeys = Object.keys(filteredParams).sort();
  let signStr = '';
  
  sortedKeys.forEach(key => {
    if (key !== 'sign') {
      signStr += `${key}=${filteredParams[key]}&`;
    }
  });

  // 末尾拼接密钥
  signStr += `key=${secretKey}`;

  // MD5加密并转小写
  return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
}

// 测试函数
async function testNewAPIs() {
  console.log('🚀 开始测试新添加的API接口...\n');

  try {
    // 1. 测试UTR补单接口
    console.log('1. 测试UTR补单接口...');
    const utrParams = {
      appid: TEST_APPID,
      orderid: 'TEST_UTR_001',
      utr_number: 'UTR123456789',
      amount: '100.00'
    };
    utrParams.sign = generateSignature(utrParams, TEST_SECRET_KEY);
    
    try {
      const utrResponse = await axios.post(`${API_BASE}/utr/submit`, utrParams);
      console.log('   ✅ UTR补单成功:', utrResponse.data);
    } catch (error) {
      console.log('   ❌ UTR补单失败:', error.response?.data || error.message);
    }

    // 2. 测试UTR查询接口
    console.log('\n2. 测试UTR查询接口...');
    const utrQueryParams = {
      appid: TEST_APPID,
      orderid: 'TEST_UTR_001'
    };
    utrQueryParams.sign = generateSignature(utrQueryParams, TEST_SECRET_KEY);
    
    try {
      const utrQueryResponse = await axios.post(`${API_BASE}/utr/query`, utrQueryParams);
      console.log('   ✅ UTR查询成功:', utrQueryResponse.data);
    } catch (error) {
      console.log('   ❌ UTR查询失败:', error.response?.data || error.message);
    }

    // 3. 测试UPI查询接口
    console.log('\n3. 测试UPI查询接口...');
    const upiParams = {
      appid: TEST_APPID
    };
    upiParams.sign = generateSignature(upiParams, TEST_SECRET_KEY);
    
    try {
      const upiResponse = await axios.post(`${API_BASE}/upi/query`, upiParams);
      console.log('   ✅ UPI查询成功:', upiResponse.data);
    } catch (error) {
      console.log('   ❌ UPI查询失败:', error.response?.data || error.message);
    }

    // 4. 测试代付订单创建接口
    console.log('\n4. 测试代付订单创建接口...');
    const payoutParams = {
      appid: TEST_APPID,
      orderid: 'TEST_PAYOUT_001',
      amount: '500.00',
      account_number: '1234567890',
      ifsc_code: 'SBIN0001234',
      account_holder: 'Test User'
    };
    payoutParams.sign = generateSignature(payoutParams, TEST_SECRET_KEY);
    
    try {
      const payoutResponse = await axios.post(`${API_BASE}/payout/create`, payoutParams);
      console.log('   ✅ 代付订单创建成功:', payoutResponse.data);
    } catch (error) {
      console.log('   ❌ 代付订单创建失败:', error.response?.data || error.message);
    }

    // 5. 测试代付订单查询接口
    console.log('\n5. 测试代付订单查询接口...');
    const payoutQueryParams = {
      appid: TEST_APPID,
      orderid: 'TEST_PAYOUT_001'
    };
    payoutQueryParams.sign = generateSignature(payoutQueryParams, TEST_SECRET_KEY);
    
    try {
      const payoutQueryResponse = await axios.post(`${API_BASE}/payout/query`, payoutQueryParams);
      console.log('   ✅ 代付订单查询成功:', payoutQueryResponse.data);
    } catch (error) {
      console.log('   ❌ 代付订单查询失败:', error.response?.data || error.message);
    }

    // 6. 测试余额查询接口
    console.log('\n6. 测试余额查询接口...');
    const balanceParams = {
      appid: TEST_APPID
    };
    balanceParams.sign = generateSignature(balanceParams, TEST_SECRET_KEY);
    
    try {
      const balanceResponse = await axios.post(`${API_BASE}/balance/query`, balanceParams);
      console.log('   ✅ 余额查询成功:', balanceResponse.data);
    } catch (error) {
      console.log('   ❌ 余额查询失败:', error.response?.data || error.message);
    }

    console.log('\n🎉 所有API接口测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testNewAPIs();
}

module.exports = { testNewAPIs };
