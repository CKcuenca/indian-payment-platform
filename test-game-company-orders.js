#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

// 生产环境配置
const BASE_URL = 'https://cashgit.com';

// 根据生产环境的真实商户信息配置
const GAME_COMPANY_CONFIG = {
  merchantId: 'MERCHANT_MEWZV8HV',  // 真实的商户ID
  apiKey: 'pk_0u3x5ivp9mewzv8hv',      // API密钥
  secretKey: 'sk_wdvi3j7hy7mewzv8hv'    // 秘钥
};

/**
 * 生成签名
 */
function generateSign(params, secretKey) {
  // 排序参数并过滤空值
  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  // 构建签名字符串 - 注意：按照系统实际算法，最后直接拼接secretKey
  const signString = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&') + secretKey;  // 直接拼接secretKey，不用&key=格式
  
  console.log('🔐 签名字符串:', signString);
  
  // MD5加密转小写
  return crypto.createHash('md5').update(signString).digest('hex').toLowerCase();
}

/**
 * 模拟游戏公司发起代收订单（充值）
 */
async function testGameChargeOrder() {
  console.log('\n🎮 === 模拟游戏公司发起充值代收订单 ===');
  
  const orderData = {
    appid: GAME_COMPANY_CONFIG.merchantId,
    orderid: `GAME_CHARGE_${Date.now()}`,
    amount: '100.00',  // 100卢比充值
    currency: 'INR',
    subject: 'Game Coin Purchase - 1000 Coins',
    description: 'Teen Patti Game Coin Purchase',
    customer_phone: '9876543210',
    customer_email: 'player@example.com',
    notify_url: 'https://game-company.com/api/payment/notify',
    return_url: 'https://game-company.com/payment/success',
    timestamp: Math.floor(Date.now() / 1000).toString()
  };
  
  // 生成签名
  orderData.sign = generateSign(orderData, GAME_COMPANY_CONFIG.secretKey);
  
  try {
    console.log('📤 发送代收订单请求...');
    console.log('订单数据:', JSON.stringify(orderData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/pay`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GameCompany-API-Client/1.0'
      },
      timeout: 30000
    });
    
    console.log('✅ 代收订单响应:');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 代收订单失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    } else {
      console.error('错误信息:', error.message);
    }
    return null;
  }
}

/**
 * 模拟游戏公司发起代付订单（提现）
 */
async function testGameWithdrawOrder() {
  console.log('\n💰 === 模拟游戏公司发起提现代付订单 ===');
  
  const payoutData = {
    appid: GAME_COMPANY_CONFIG.merchantId,
    orderid: `GAME_WITHDRAW_${Date.now()}`,
    amount: '50.00',  // 50卢比提现
    currency: 'INR',
    account_name: 'Player Name',
    account_number: '1234567890',
    ifsc_code: 'SBIN0001234',
    bank_name: 'State Bank of India',
    purpose: 'Game Winnings Withdrawal',
    notify_url: 'https://game-company.com/api/payout/notify',
    timestamp: Math.floor(Date.now() / 1000).toString()
  };
  
  // 生成签名
  payoutData.sign = generateSign(payoutData, GAME_COMPANY_CONFIG.secretKey);
  
  try {
    console.log('📤 发送代付订单请求...');
    console.log('提现数据:', JSON.stringify(payoutData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/payout/create`, payoutData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GameCompany-API-Client/1.0'
      },
      timeout: 30000
    });
    
    console.log('✅ 代付订单响应:');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 代付订单失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    } else {
      console.error('错误信息:', error.message);
    }
    return null;
  }
}

/**
 * 查询订单状态
 */
async function testOrderQuery(orderid) {
  console.log(`\n🔍 === 查询订单状态: ${orderid} ===`);
  
  const queryData = {
    appid: GAME_COMPANY_CONFIG.merchantId,
    orderid: orderid,
    timestamp: Math.floor(Date.now() / 1000).toString()
  };
  
  // 生成签名
  queryData.sign = generateSign(queryData, GAME_COMPANY_CONFIG.secretKey);
  
  try {
    console.log('📤 发送查询请求...');
    
    const response = await axios.post(`${BASE_URL}/api/query`, queryData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GameCompany-API-Client/1.0'
      },
      timeout: 30000
    });
    
    console.log('✅ 订单查询响应:');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 订单查询失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    } else {
      console.error('错误信息:', error.message);
    }
    return null;
  }
}

/**
 * 查询商户余额
 */
async function testBalanceQuery() {
  console.log('\n💳 === 查询商户余额 ===');
  
  const balanceData = {
    appid: GAME_COMPANY_CONFIG.merchantId,
    timestamp: Math.floor(Date.now() / 1000).toString()
  };
  
  // 生成签名
  balanceData.sign = generateSign(balanceData, GAME_COMPANY_CONFIG.secretKey);
  
  try {
    console.log('📤 发送余额查询请求...');
    
    const response = await axios.post(`${BASE_URL}/api/balance/query`, balanceData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GameCompany-API-Client/1.0'
      },
      timeout: 30000
    });
    
    console.log('✅ 余额查询响应:');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 余额查询失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    } else {
      console.error('错误信息:', error.message);
    }
    return null;
  }
}

/**
 * 主测试流程
 */
async function runGameCompanyTests() {
  console.log('🎯 === 印度支付平台 - 游戏公司接入测试 ===');
  console.log(`🌐 测试环境: ${BASE_URL}`);
  console.log(`🏪 商户ID: ${GAME_COMPANY_CONFIG.merchantId}`);
  console.log(`⏰ 测试时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'})}`);
  
  // 检查基础连接
  try {
    console.log('\n🔗 检查API基础连接...');
    const healthCheck = await axios.get(`${BASE_URL}/api/health`, { timeout: 10000 });
    console.log('✅ API连接正常');
  } catch (error) {
    console.log('⚠️  API健康检查失败，但继续测试...');
  }
  
  // 1. 查询商户余额
  await testBalanceQuery();
  
  // 2. 测试代收订单（游戏充值）
  const chargeResult = await testGameChargeOrder();
  
  // 3. 测试代付订单（游戏提现）
  const withdrawResult = await testGameWithdrawOrder();
  
  // 4. 查询订单状态
  if (chargeResult && chargeResult.orderid) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    await testOrderQuery(chargeResult.orderid);
  }
  
  if (withdrawResult && withdrawResult.orderid) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    await testOrderQuery(withdrawResult.orderid);
  }
  
  console.log('\n🏁 === 测试完成 ===');
  console.log('请查看上述结果，确认游戏公司接入是否正常工作。');
  console.log('\n📝 注意事项:');
  console.log('1. 需要配置正确的secretKey才能正常调用');
  console.log('2. 签名验证失败可能导致认证错误');
  console.log('3. 生产环境需要真实的银行账户信息');
  console.log('4. 测试金额使用的是sandbox环境的虚拟金额');
}

// 运行测试
if (require.main === module) {
  runGameCompanyTests().catch(console.error);
}

module.exports = {
  testGameChargeOrder,
  testGameWithdrawOrder,
  testOrderQuery,
  testBalanceQuery,
  generateSign
};