const axios = require('axios');
const crypto = require('crypto');

// 测试配置
const API_BASE = 'http://localhost:3000/api';
const TEST_APPID = 'test_merchant_001';
const TEST_SECRET_KEY = 'test_secret_key_123';

// 生成签名
function generateSignature(params, secretKey) {
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      filteredParams[key] = params[key];
    }
  });

  const sortedKeys = Object.keys(filteredParams).sort();
  let signStr = '';
  
  sortedKeys.forEach(key => {
    if (key !== 'sign') {
      signStr += `${key}=${filteredParams[key]}&`;
    }
  });

  signStr += `key=${secretKey}`;
  return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
}

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// 记录测试结果
function recordTestResult(testName, success, details = '') {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`   ✅ ${testName}: 通过`);
  } else {
    testResults.failed++;
    console.log(`   ❌ ${testName}: 失败 - ${details}`);
  }
  
  testResults.details.push({
    name: testName,
    success,
    details
  });
}

// 等待函数
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 测试1: 创建代收订单
async function testCreateCollectionOrder() {
  try {
    console.log('\n1. 测试创建代收订单...');
    
    const params = {
      appid: TEST_APPID,
      orderid: 'TEST_COLLECTION_001',
      amount: '100.00',
      desc: '测试代收订单',
      notify_url: 'https://yourgame.com/notify'
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/pay`, params);
    
    if (response.data.success) {
      recordTestResult('创建代收订单', true);
      return response.data.data.trade_no;
    } else {
      recordTestResult('创建代收订单', false, response.data.error);
      return null;
    }
  } catch (error) {
    recordTestResult('创建代收订单', false, error.response?.data?.error || error.message);
    return null;
  }
}

// 测试2: 查询代收订单状态
async function testQueryCollectionOrder(orderId) {
  try {
    console.log('\n2. 测试查询代收订单状态...');
    
    const params = {
      appid: TEST_APPID,
      orderid: orderId
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/query`, params);
    
    if (response.data.success) {
      recordTestResult('查询代收订单状态', true);
      return true;
    } else {
      recordTestResult('查询代收订单状态', false, response.data.error);
      return false;
    }
  } catch (error) {
    recordTestResult('查询代收订单状态', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试3: UTR补单
async function testUTRSubmit(orderId) {
  try {
    console.log('\n3. 测试UTR补单...');
    
    const params = {
      appid: TEST_APPID,
      orderid: orderId,
      utr_number: 'UTR123456789',
      amount: '100.00'
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/utr/submit`, params);
    
    if (response.data.success) {
      recordTestResult('UTR补单', true);
      return true;
    } else {
      recordTestResult('UTR补单', false, response.data.error);
      return false;
    }
  } catch (error) {
    recordTestResult('UTR补单', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试4: 查询UTR状态
async function testUTRQuery(orderId) {
  try {
    console.log('\n4. 测试UTR状态查询...');
    
    const params = {
      appid: TEST_APPID,
      orderid: orderId
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/utr/query`, params);
    
    if (response.data.success) {
      recordTestResult('UTR状态查询', true);
      return true;
    } else {
      recordTestResult('UTR状态查询', false, response.data.error);
    }
  } catch (error) {
    recordTestResult('UTR状态查询', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试5: UPI查询
async function testUPIQuery() {
  try {
    console.log('\n5. 测试UPI查询...');
    
    const params = {
      appid: TEST_APPID
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/upi/query`, params);
    
    if (response.data.success) {
      recordTestResult('UPI查询', true);
      return true;
    } else {
      recordTestResult('UPI查询', false, response.data.error);
      return false;
    }
  } catch (error) {
    recordTestResult('UPI查询', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试6: 创建代付订单
async function testCreatePayoutOrder() {
  try {
    console.log('\n6. 测试创建代付订单...');
    
    const params = {
      appid: TEST_APPID,
      orderid: 'TEST_PAYOUT_001',
      amount: '500.00',
      account_number: '1234567890',
      ifsc_code: 'SBIN0001234',
      account_holder: 'Test User'
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/payout/create`, params);
    
    if (response.data.success) {
      recordTestResult('创建代付订单', true);
      return response.data.data.trade_no;
    } else {
      recordTestResult('创建代付订单', false, response.data.error);
      return null;
    }
  } catch (error) {
    recordTestResult('创建代付订单', false, error.response?.data?.error || error.message);
    return null;
  }
}

// 测试7: 查询代付订单状态
async function testQueryPayoutOrder(orderId) {
  try {
    console.log('\n7. 测试查询代付订单状态...');
    
    const params = {
      appid: TEST_APPID,
      orderid: orderId
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/payout/query`, params);
    
    if (response.data.success) {
      recordTestResult('查询代付订单状态', true);
      return true;
    } else {
      recordTestResult('查询代付订单状态', false, response.data.error);
      return false;
    }
  } catch (error) {
    recordTestResult('查询代付订单状态', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试8: 余额查询
async function testBalanceQuery() {
  try {
    console.log('\n8. 测试余额查询...');
    
    const params = {
      appid: TEST_APPID
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/balance/query`, params);
    
    if (response.data.success) {
      recordTestResult('余额查询', true);
      return true;
    } else {
      recordTestResult('余额查询', false, response.data.error);
      return false;
    }
  } catch (error) {
    recordTestResult('余额查询', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试9: 同步服务状态查询
async function testSyncServiceStatus() {
  try {
    console.log('\n9. 测试同步服务状态查询...');
    
    const params = {
      appid: TEST_APPID
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/passpay-sync/status`, params);
    
    if (response.data.success) {
      recordTestResult('同步服务状态查询', true);
      return true;
    } else {
      recordTestResult('同步服务状态查询', false, response.data.error);
      return false;
    }
  } catch (error) {
    recordTestResult('同步服务状态查询', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试10: 手动同步指定订单
async function testManualSyncOrder(orderId) {
  try {
    console.log('\n10. 测试手动同步指定订单...');
    
    const params = {
      appid: TEST_APPID,
      orderid: orderId
    };
    params.sign = generateSignature(params, TEST_SECRET_KEY);
    
    const response = await axios.post(`${API_BASE}/passpay-sync/sync-order`, params);
    
    if (response.data.success) {
      recordTestResult('手动同步指定订单', true);
      return true;
    } else {
      recordTestResult('手动同步指定订单', false, response.data.error);
      return false;
    }
  } catch (error) {
    recordTestResult('手动同步指定订单', false, error.response?.data?.error || error.message);
    return false;
  }
}

// 主测试函数
async function runCompleteTest() {
  console.log('🚀 开始完整的PassPay功能测试...\n');
  console.log('📋 测试项目:');
  console.log('   1. 创建代收订单');
  console.log('   2. 查询代收订单状态');
  console.log('   3. UTR补单');
  console.log('   4. 查询UTR状态');
  console.log('   5. UPI查询');
  console.log('   6. 创建代付订单');
  console.log('   7. 查询代付订单状态');
  console.log('   8. 余额查询');
  console.log('   9. 同步服务状态查询');
  console.log('   10. 手动同步指定订单\n');

  try {
    // 测试代收功能
    const collectionTradeNo = await testCreateCollectionOrder();
    if (collectionTradeNo) {
      await wait(1000);
      await testQueryCollectionOrder('TEST_COLLECTION_001');
      await wait(1000);
      await testUTRSubmit('TEST_COLLECTION_001');
      await wait(1000);
      await testUTRQuery('TEST_COLLECTION_001');
    }

    await wait(1000);
    
    // 测试UPI查询
    await testUPIQuery();
    
    await wait(1000);
    
    // 测试代付功能
    const payoutTradeNo = await testCreatePayoutOrder();
    if (payoutTradeNo) {
      await wait(1000);
      await testQueryPayoutOrder('TEST_PAYOUT_001');
    }
    
    await wait(1000);
    
    // 测试余额查询
    await testBalanceQuery();
    
    await wait(1000);
    
    // 测试同步服务
    await testSyncServiceStatus();
    if (collectionTradeNo) {
      await wait(1000);
      await testManualSyncOrder('TEST_COLLECTION_001');
    }

    // 输出测试结果
    console.log('\n📊 测试结果汇总:');
    console.log(`   总测试数: ${testResults.total}`);
    console.log(`   通过: ${testResults.passed} ✅`);
    console.log(`   失败: ${testResults.failed} ❌`);
    console.log(`   成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      testResults.details
        .filter(test => !test.success)
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.details}`);
        });
    }

    if (testResults.passed === testResults.total) {
      console.log('\n🎉 所有测试通过！PassPay集成功能正常！');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查系统配置和网络连接');
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runCompleteTest();
}

module.exports = { runCompleteTest };
