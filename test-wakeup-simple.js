const axios = require('axios');
const crypto = require('crypto');

// 配置
const BASE_URL = 'https://cashgit.com';

// 商户信息 (从之前的测试中获取)
const MERCHANT_INFO = {
  merchantId: 'cgpay',
  secretKey: 'cgpay_secret_key_2024'
};

// 生成签名
function generateSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  const signString = queryString + '&key=' + secretKey;
  return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
}

// 测试唤醒支付创建接口
async function testWakeupCreate() {
  try {
    console.log('🔔 测试唤醒支付创建接口...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      amount: '500.00',
      orderid: `WAKEUP_${Date.now()}`,
      desc: '唤醒支付测试',
      notify_url: 'https://cashgit.com/api/wakeup/callback',
      return_url: 'https://cashgit.com/return',
      customer_phone: '9876543210'
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/wakeup/create`, params);
    
    if (response.data.success) {
      console.log('✅ 唤醒支付创建接口正常');
      console.log(`📋 响应信息:`);
      console.log(`  订单ID: ${response.data.data.orderid}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  金额: ${response.data.data.amount}`);
      console.log(`  交易号: ${response.data.data.trade_no || 'N/A'}`);
      console.log(`  UPI信息: ${response.data.data.upi_info || 'N/A'}`);
      console.log(`  支付链接: ${response.data.data.payment_url || 'N/A'}`);
      return response.data.data;
    } else {
      throw new Error('唤醒支付创建失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 唤醒支付创建接口测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试唤醒支付查询接口
async function testWakeupQuery(orderId) {
  try {
    console.log(`\n📊 测试唤醒支付查询接口 (订单: ${orderId})...`);
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      orderid: orderId
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/wakeup/query`, params);
    
    if (response.data.success) {
      console.log('✅ 唤醒支付查询接口正常');
      console.log(`📋 订单状态:`);
      console.log(`  订单ID: ${response.data.data.orderid}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  金额: ${response.data.data.amount}`);
      console.log(`  交易号: ${response.data.data.trade_no || 'N/A'}`);
      console.log(`  创建时间: ${response.data.data.created_at || 'N/A'}`);
      console.log(`  更新时间: ${response.data.data.updated_at || 'N/A'}`);
      return response.data.data;
    } else {
      throw new Error('唤醒支付查询失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 唤醒支付查询接口测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试唤醒支付回调接口
async function testWakeupCallback() {
  try {
    console.log('\n🔔 测试唤醒支付回调接口...');
    
    const callbackData = {
      orderid: `CALLBACK_TEST_${Date.now()}`,
      merchant_id: MERCHANT_INFO.merchantId,
      amount: '500.00',
      status: 'SUCCESS',
      trade_no: `TXN_${Date.now()}`,
      timestamp: Date.now().toString(),
      sign: 'test_signature'
    };
    
    const response = await axios.post(`${BASE_URL}/api/wakeup/callback`, callbackData);
    
    if (response.data.success) {
      console.log('✅ 唤醒支付回调接口正常');
      console.log(`📋 回调响应: ${response.data.message}`);
      return true;
    } else {
      throw new Error('回调测试失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 唤醒支付回调测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试唤醒支付接口可用性
async function testWakeupAvailability() {
  try {
    console.log('\n🔍 测试唤醒支付接口可用性...');
    
    const endpoints = [
      '/api/wakeup/create',
      '/api/wakeup/query',
      '/api/wakeup/callback'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.post(`${BASE_URL}${endpoint}`, {});
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.push({
          endpoint,
          status: 'success',
          responseTime,
          statusCode: response.status
        });
        
        console.log(`✅ ${endpoint} - ${responseTime}ms`);
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: error.response?.status || 'Network Error'
        });
        
        console.log(`❌ ${endpoint} - ${error.response?.status || 'Network Error'}`);
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    console.log(`\n📊 唤醒支付接口可用性统计:`);
    console.log(`  成功: ${successCount}/${totalCount}`);
    console.log(`  成功率: ${Math.round((successCount / totalCount) * 100)}%`);
    
    return results;
  } catch (error) {
    console.error('❌ 唤醒支付接口可用性测试失败:', error.message);
    throw error;
  }
}

// 主测试函数
async function testWakeupSimple() {
  console.log('🚀 开始测试唤醒支付接口...\n');
  
  try {
    // 1. 测试唤醒支付接口可用性
    await testWakeupAvailability();
    
    // 2. 测试唤醒支付创建接口
    const orderData = await testWakeupCreate();
    
    // 3. 测试唤醒支付查询接口
    if (orderData && orderData.orderid) {
      await testWakeupQuery(orderData.orderid);
    }
    
    // 4. 测试唤醒支付回调接口
    await testWakeupCallback();
    
    console.log('\n🎉 唤醒支付接口测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 唤醒支付接口测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testWakeupSimple().catch(console.error);
