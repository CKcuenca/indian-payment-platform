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

// 测试唤醒支付接口
async function testWakeupPayment() {
  try {
    console.log('🔔 测试唤醒支付接口...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      amount: '500.00',
      currency: 'INR',
      orderid: `WAKEUP_${Date.now()}`,
      customerEmail: 'test@example.com',
      customerPhone: '9876543210',
      description: '唤醒支付测试'
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.post(`${BASE_URL}/api/wakeup/create`, params);
    
    if (response.data.success) {
      console.log('✅ 唤醒支付接口正常');
      console.log(`📋 响应信息:`);
      console.log(`  订单ID: ${response.data.data.orderId}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  金额: ${response.data.data.amount} ${response.data.data.currency}`);
      console.log(`  支付链接: ${response.data.data.paymentUrl || 'N/A'}`);
      console.log(`  UPI信息: ${response.data.data.upiInfo || 'N/A'}`);
      return response.data.data;
    } else {
      throw new Error('唤醒支付失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 唤醒支付接口测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试唤醒支付状态查询
async function testWakeupPaymentStatus(orderId) {
  try {
    console.log(`\n📊 测试唤醒支付状态查询 (订单: ${orderId})...`);
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      orderid: orderId
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/wakeup/status`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 唤醒支付状态查询正常');
      console.log(`📋 订单状态:`);
      console.log(`  订单ID: ${response.data.data.orderId}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  金额: ${response.data.data.amount}`);
      console.log(`  创建时间: ${response.data.data.createdAt}`);
      console.log(`  更新时间: ${response.data.data.updatedAt}`);
      return response.data.data;
    } else {
      throw new Error('状态查询失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 唤醒支付状态查询失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试唤醒支付回调
async function testWakeupPaymentCallback() {
  try {
    console.log('\n🔔 测试唤醒支付回调接口...');
    
    const callbackData = {
      orderId: `CALLBACK_TEST_${Date.now()}`,
      merchantId: MERCHANT_INFO.merchantId,
      amount: '500.00',
      currency: 'INR',
      status: 'SUCCESS',
      transactionId: `TXN_${Date.now()}`,
      provider: 'wakeup',
      timestamp: Date.now().toString(),
      signature: 'test_signature'
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

// 测试唤醒支付配置
async function testWakeupPaymentConfig() {
  try {
    console.log('\n⚙️ 测试唤醒支付配置...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/wakeup/config`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 唤醒支付配置正常');
      console.log(`📋 配置信息:`);
      console.log(`  提供商: ${response.data.data.provider}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  最小金额: ${response.data.data.minAmount}`);
      console.log(`  最大金额: ${response.data.data.maxAmount}`);
      console.log(`  费率: ${response.data.data.feeRate}%`);
      return response.data.data;
    } else {
      throw new Error('配置查询失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 唤醒支付配置查询失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试唤醒支付历史
async function testWakeupPaymentHistory() {
  try {
    console.log('\n📋 测试唤醒支付历史...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      page: '1',
      limit: '10'
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/wakeup/history`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 唤醒支付历史查询正常');
      console.log(`📋 历史信息:`);
      console.log(`  总订单数: ${response.data.data.total}`);
      console.log(`  当前页: ${response.data.data.page}`);
      console.log(`  每页数量: ${response.data.data.limit}`);
      console.log(`  总页数: ${response.data.data.pages}`);
      
      if (response.data.data.orders && response.data.data.orders.length > 0) {
        console.log('  最近订单:');
        response.data.data.orders.slice(0, 3).forEach((order, index) => {
          console.log(`    ${index + 1}. ${order.orderId} - ${order.amount} ${order.currency} - ${order.status}`);
        });
      } else {
        console.log('  暂无订单记录');
      }
      
      return response.data.data;
    } else {
      throw new Error('历史查询失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 唤醒支付历史查询失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主测试函数
async function testWakeupPaymentMain() {
  console.log('🚀 开始测试唤醒支付接口...\n');
  
  try {
    // 1. 测试唤醒支付配置
    await testWakeupPaymentConfig();
    
    // 2. 测试唤醒支付接口
    const orderData = await testWakeupPayment();
    
    // 3. 测试唤醒支付状态查询
    if (orderData && orderData.orderId) {
      await testWakeupPaymentStatus(orderData.orderId);
    }
    
    // 4. 测试唤醒支付历史
    await testWakeupPaymentHistory();
    
    // 5. 测试唤醒支付回调
    await testWakeupPaymentCallback();
    
    console.log('\n🎉 唤醒支付接口测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 唤醒支付接口测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testWakeupPaymentMain().catch(console.error);
