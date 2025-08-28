const crypto = require('crypto');

/**
 * 测试签名生成和验证
 * 验证文档中描述的签名算法是否正确
 */

// 商户信息
const MERCHANT_ID = 'test_merchant_001';
const SECRET_KEY = 'test_secret_key_123';

/**
 * 生成签名 - 按照文档中的算法
 * @param {Object} params 请求参数
 * @param {string} secretKey 商户密钥
 * @returns {string} 签名
 */
function generateSign(params, secretKey) {
  console.log('🔐 开始生成签名...');
  console.log('原始参数:', params);
  
  // 1. 过滤空值
  const filteredParams = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  console.log('过滤后的参数:', filteredParams);
  
  // 2. 排序并拼接
  const signString = Object.keys(filteredParams)
    .sort()
    .map(key => `${key}=${filteredParams[key]}`)
    .join('&') + `&key=${secretKey}`;
  
  console.log('拼接后的签名字符串:', signString);
  
  // 3. SHA-256计算
  const sign = crypto.createHash('sha256').update(signString).digest('hex');
  console.log('生成的签名:', sign);
  
  return sign;
}

/**
 * 验证签名
 * @param {Object} params 请求参数
 * @param {string} secretKey 商户密钥
 * @param {string} receivedSign 接收到的签名
 * @returns {boolean} 验证结果
 */
function verifySignature(params, secretKey, receivedSign) {
  const calculatedSign = generateSign(params, secretKey);
  const isValid = calculatedSign === receivedSign;
  
  console.log('🔍 签名验证结果:');
  console.log('计算得到的签名:', calculatedSign);
  console.log('接收到的签名:', receivedSign);
  console.log('验证结果:', isValid ? '✅ 通过' : '❌ 失败');
  
  return isValid;
}

/**
 * 测试存款订单签名
 */
function testDepositOrderSignature() {
  console.log('\n💰 测试存款订单签名...');
  
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
  const sign = generateSign(params, SECRET_KEY);
  
  // 验证签名
  const isValid = verifySignature(params, SECRET_KEY, sign);
  
  console.log('\n📋 测试结果:');
  console.log('商户ID:', MERCHANT_ID);
  console.log('订单ID:', params.mchOrderId);
  console.log('签名验证:', isValid ? '✅ 成功' : '❌ 失败');
  
  return { params, sign, isValid };
}

/**
 * 测试出款订单签名
 */
function testWithdrawOrderSignature() {
  console.log('\n💸 测试出款订单签名...');
  
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
  const sign = generateSign(params, SECRET_KEY);
  
  // 验证签名
  const isValid = verifySignature(params, SECRET_KEY, sign);
  
  console.log('\n📋 测试结果:');
  console.log('商户ID:', MERCHANT_ID);
  console.log('订单ID:', params.mchOrderId);
  console.log('签名验证:', isValid ? '✅ 成功' : '❌ 失败');
  
  return { params, sign, isValid };
}

/**
 * 测试订单查询签名
 */
function testQueryOrderSignature() {
  console.log('\n🔍 测试订单查询签名...');
  
  const params = {
    appid: MERCHANT_ID,
    mchOrderId: 'test_wakeup_' + Date.now(),
    timestamp: Date.now().toString()
  };
  
  // 生成签名
  const sign = generateSign(params, SECRET_KEY);
  
  // 验证签名
  const isValid = verifySignature(params, SECRET_KEY, sign);
  
  console.log('\n📋 测试结果:');
  console.log('商户ID:', MERCHANT_ID);
  console.log('订单ID:', params.mchOrderId);
  console.log('签名验证:', isValid ? '✅ 成功' : '❌ 失败');
  
  return { params, sign, isValid };
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始签名算法验证测试...\n');
  
  try {
    // 测试存款订单签名
    const depositResult = testDepositOrderSignature();
    
    // 测试出款订单签名
    const withdrawResult = testWithdrawOrderSignature();
    
    // 测试订单查询签名
    const queryResult = testQueryOrderSignature();
    
    console.log('\n🎯 测试总结:');
    console.log('存款订单签名:', depositResult.isValid ? '✅ 通过' : '❌ 失败');
    console.log('出款订单签名:', withdrawResult.isValid ? '✅ 通过' : '❌ 失败');
    console.log('订单查询签名:', queryResult.isValid ? '✅ 通过' : '❌ 失败');
    
    const allPassed = depositResult.isValid && withdrawResult.isValid && queryResult.isValid;
    console.log('\n总体结果:', allPassed ? '🎉 所有测试通过！' : '💥 部分测试失败！');
    
    return {
      deposit: depositResult,
      withdraw: withdrawResult,
      query: queryResult,
      allPassed
    };
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    return null;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests()
    .then((result) => {
      if (result && result.allPassed) {
        console.log('\n🎊 签名算法验证完成！可以继续进行API测试。');
        process.exit(0);
      } else {
        console.log('\n💥 签名算法验证失败！请检查算法实现。');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  generateSign,
  verifySignature,
  testDepositOrderSignature,
  testWithdrawOrderSignature,
  testQueryOrderSignature,
  runAllTests
};
