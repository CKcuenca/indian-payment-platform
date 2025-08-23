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
async function testPassPayIntegration() {
  console.log('🚀 开始测试PassPay集成功能...\n');

  try {
    // 1. 测试创建支付订单（调用PassPay）
    console.log('1. 测试创建支付订单（PassPay集成）...');
    const payParams = {
      appid: TEST_APPID,
      orderid: 'TEST_PAY_001',
      amount: '100.00',
      desc: '测试支付订单',
      notify_url: 'https://yourgame.com/notify'
    };
    payParams.sign = generateSignature(payParams, TEST_SECRET_KEY);
    
    try {
      const payResponse = await axios.post(`${API_BASE}/pay`, payParams);
      console.log('   ✅ 支付订单创建成功:', payResponse.data);
      
      // 保存trade_no用于后续测试
      const tradeNo = payResponse.data.data.trade_no;
      
      // 2. 测试查询订单状态（调用PassPay）
      console.log('\n2. 测试查询订单状态（PassPay集成）...');
      const queryParams = {
        appid: TEST_APPID,
        orderid: 'TEST_PAY_001'
      };
      queryParams.sign = generateSignature(queryParams, TEST_SECRET_KEY);
      
      try {
        const queryResponse = await axios.post(`${API_BASE}/query`, queryParams);
        console.log('   ✅ 订单状态查询成功:', queryResponse.data);
      } catch (error) {
        console.log('   ❌ 订单状态查询失败:', error.response?.data || error.message);
      }
      
      // 3. 测试UTR补单（调用PassPay）
      console.log('\n3. 测试UTR补单（PassPay集成）...');
      const utrParams = {
        appid: TEST_APPID,
        orderid: 'TEST_PAY_001',
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
      
      // 4. 测试UTR状态查询（调用PassPay）
      console.log('\n4. 测试UTR状态查询（PassPay集成）...');
      const utrQueryParams = {
        appid: TEST_APPID,
        orderid: 'TEST_PAY_001'
      };
      utrQueryParams.sign = generateSignature(utrQueryParams, TEST_SECRET_KEY);
      
      try {
        const utrQueryResponse = await axios.post(`${API_BASE}/utr/query`, utrQueryParams);
        console.log('   ✅ UTR状态查询成功:', utrQueryResponse.data);
      } catch (error) {
        console.log('   ❌ UTR状态查询失败:', error.response?.data || error.message);
      }
      
    } catch (error) {
      console.log('   ❌ 支付订单创建失败:', error.response?.data || error.message);
    }

    // 5. 测试UPI查询（调用PassPay）
    console.log('\n5. 测试UPI查询（PassPay集成）...');
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

    // 6. 测试代付订单创建（调用PassPay）
    console.log('\n6. 测试代付订单创建（PassPay集成）...');
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

    // 7. 测试代付订单查询（调用PassPay）
    console.log('\n7. 测试代付订单查询（PassPay集成）...');
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

    // 8. 测试余额查询（调用PassPay）
    console.log('\n8. 测试余额查询（PassPay集成）...');
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

    console.log('\n🎉 PassPay集成测试完成！');
    console.log('\n📋 测试总结：');
    console.log('   - 您的系统现在作为PassPay的下游聚合平台');
    console.log('   - 所有支付请求都会转发给PassPay处理');
    console.log('   - 系统会自动同步PassPay的订单状态');
    console.log('   - 支持UTR补单、UPI查询、代付等完整功能');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testPassPayIntegration();
}

module.exports = { testPassPayIntegration };
