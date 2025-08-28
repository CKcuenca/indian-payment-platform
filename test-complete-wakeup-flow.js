const crypto = require('crypto');

/**
 * 完整的唤醒支付API测试流程
 * 从商户创建到订单完成的完整测试
 */

// 商户信息
const MERCHANT_ID = 'test_merchant_001';
const SECRET_KEY = 'test_secret_key_123';
const API_BASE_URL = 'https://cashgit.com';

/**
 * 生成签名
 */
function generateSign(params, secretKey) {
  const filteredParams = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  const signString = Object.keys(filteredParams)
    .sort()
    .map(key => `${key}=${filteredParams[key]}`)
    .join('&') + `&key=${secretKey}`;
  
  return crypto.createHash('sha256').update(signString).digest('hex');
}

/**
 * 测试存款订单创建
 */
async function testCreateDepositOrder() {
  console.log('\n💰 测试存款订单创建...');
  
  const params = {
    appid: MERCHANT_ID,
    mchOrderId: 'test_wakeup_' + Date.now(),
    timestamp: Date.now().toString(),
    payType: 9111,
    amount: '100',
    currency: 'INR',
    notifyUrl: 'http://localhost:8080/notify'
  };
  
  // 生成签名
  params.sign = generateSign(params, SECRET_KEY);
  
  console.log('请求参数:', JSON.stringify(params, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应内容:', JSON.stringify(result, null, 2));
    
    if (result.code === 200) {
      console.log('✅ 存款订单创建成功！');
      return {
        success: true,
        orderId: params.mchOrderId,
        data: result.data
      };
    } else {
      console.log('❌ 存款订单创建失败:', result.message);
      return {
        success: false,
        error: result.message,
        code: result.code
      };
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试出款订单创建
 */
async function testCreateWithdrawOrder() {
  console.log('\n💸 测试出款订单创建...');
  
  const params = {
    appid: MERCHANT_ID,
    mchOrderId: 'withdraw_test_' + Date.now(),
    timestamp: Date.now().toString(),
    payType: 9111,
    amount: '100',
    currency: 'INR',
    notifyUrl: 'http://localhost:8080/withdraw_notify',
    customerPhone: '919876543210'
  };
  
  // 生成签名
  params.sign = generateSign(params, SECRET_KEY);
  
  console.log('请求参数:', JSON.stringify(params, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/payout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应内容:', JSON.stringify(result, null, 2));
    
    if (result.code === 200) {
      console.log('✅ 出款订单创建成功！');
      return {
        success: true,
        orderId: params.mchOrderId,
        data: result.data
      };
    } else {
      console.log('❌ 出款订单创建失败:', result.message);
      return {
        success: false,
        error: result.message,
        code: result.code
      };
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return {
      success: false,
      error: error.message
    };
    }
}

/**
 * 测试订单查询
 */
async function testQueryOrder(orderId) {
  console.log(`\n🔍 测试订单查询: ${orderId}...`);
  
  const params = {
    appid: MERCHANT_ID,
    mchOrderId: orderId,
    timestamp: Date.now().toString()
  };
  
  // 生成签名
  params.sign = generateSign(params, SECRET_KEY);
  
  console.log('请求参数:', JSON.stringify(params, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/order/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应内容:', JSON.stringify(result, null, 2));
    
    if (result.code === 200) {
      console.log('✅ 订单查询成功！');
      return {
        success: true,
        data: result.data
      };
    } else {
      console.log('❌ 订单查询失败:', result.message);
      return {
        success: false,
        error: result.message,
        code: result.code
      };
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 测试系统健康状态
 */
async function testSystemHealth() {
  console.log('\n🏥 测试系统健康状态...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应内容:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ 系统健康检查通过！');
      return true;
    } else {
      console.log('❌ 系统健康检查失败');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 健康检查请求失败:', error.message);
    return false;
  }
}

/**
 * 测试支付配置接口
 */
async function testPaymentConfig() {
  console.log('\n⚙️ 测试支付配置接口...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/payment-config`);
    const result = await response.json();
    
    console.log('响应状态:', response.status);
    console.log('响应内容:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 支付配置获取成功！');
      return true;
    } else {
      console.log('❌ 支付配置获取失败');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 支付配置请求失败:', error.message);
    return false;
  }
}

/**
 * 运行完整的测试流程
 */
async function runCompleteTest() {
  console.log('🚀 开始完整的唤醒支付API测试流程...\n');
  
  const results = {
    systemHealth: false,
    paymentConfig: false,
    depositOrder: null,
    withdrawOrder: null,
    depositQuery: null,
    withdrawQuery: null
  };
  
  try {
    // 1. 测试系统健康状态
    results.systemHealth = await testSystemHealth();
    
    // 2. 测试支付配置接口
    results.paymentConfig = await testPaymentConfig();
    
    // 3. 测试存款订单创建
    results.depositOrder = await testCreateDepositOrder();
    
    // 4. 测试出款订单创建
    results.withdrawOrder = await testCreateWithdrawOrder();
    
    // 5. 测试存款订单查询
    if (results.depositOrder.success) {
      results.depositQuery = await testQueryOrder(results.depositOrder.orderId);
    }
    
    // 6. 测试出款订单查询
    if (results.withdrawOrder.success) {
      results.withdrawQuery = await testQueryOrder(results.withdrawOrder.orderId);
    }
    
    // 输出测试总结
    console.log('\n🎯 完整测试流程总结:');
    console.log('系统健康状态:', results.systemHealth ? '✅ 通过' : '❌ 失败');
    console.log('支付配置接口:', results.paymentConfig ? '✅ 通过' : '❌ 失败');
    console.log('存款订单创建:', results.depositOrder?.success ? '✅ 通过' : '❌ 失败');
    console.log('出款订单创建:', results.withdrawOrder?.success ? '✅ 通过' : '❌ 失败');
    console.log('存款订单查询:', results.depositQuery?.success ? '✅ 通过' : '❌ 失败');
    console.log('出款订单查询:', results.withdrawQuery?.success ? '✅ 通过' : '❌ 失败');
    
    // 计算成功率
    const totalTests = 6;
    const passedTests = [
      results.systemHealth,
      results.paymentConfig,
      results.depositOrder?.success,
      results.withdrawOrder?.success,
      results.depositQuery?.success,
      results.withdrawQuery?.success
    ].filter(Boolean).length;
    
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    console.log(`\n📊 测试成功率: ${passedTests}/${totalTests} (${successRate}%)`);
    
    if (successRate >= 80) {
      console.log('🎉 测试流程基本成功！');
    } else if (successRate >= 50) {
      console.log('⚠️ 测试流程部分成功，需要进一步检查');
    } else {
      console.log('💥 测试流程失败较多，需要排查问题');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ 测试流程执行失败:', error);
    return null;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runCompleteTest()
    .then((results) => {
      if (results) {
        console.log('\n🎊 完整测试流程执行完成！');
        process.exit(0);
      } else {
        console.log('\n💥 测试流程执行失败！');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 测试流程执行异常:', error);
      process.exit(1);
    });
}

module.exports = {
  testSystemHealth,
  testPaymentConfig,
  testCreateDepositOrder,
  testCreateWithdrawOrder,
  testQueryOrder,
  runCompleteTest
};
