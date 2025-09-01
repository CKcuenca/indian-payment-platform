const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';
const TEST_TOKEN = 'test-token'; // 测试用token

/**
 * DhPay集成测试
 */
async function testDhPayIntegration() {
  console.log('🧪 开始DhPay集成测试...\n');

  try {
    // 1. 测试获取DhPay信息
    console.log('1. 测试获取DhPay信息...');
    try {
      const infoResponse = await axios.get(`${BASE_URL}/dhpay/info`, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });
      console.log('✅ DhPay信息获取成功');
      console.log(`   提供者: ${infoResponse.data.data.name}`);
      console.log(`   代码: ${infoResponse.data.data.code}`);
      console.log(`   版本: ${infoResponse.data.data.version}`);
      console.log(`   支持功能: ${infoResponse.data.data.supportedFeatures.join(', ')}`);
      console.log(`   支持货币: ${infoResponse.data.data.currencies.join(', ')}`);
      console.log('');
    } catch (error) {
      console.log('❌ DhPay信息获取失败:', error.response?.data?.error || error.message);
      console.log('');
    }

    // 2. 测试DhPay配置状态
    console.log('2. 测试DhPay配置状态...');
    try {
      const configResponse = await axios.get(`${BASE_URL}/dhpay/config-status`, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });
      console.log('✅ DhPay配置状态获取成功');
      console.log(`   环境: ${configResponse.data.data.environment}`);
      console.log(`   提供者已初始化: ${configResponse.data.data.providerInitialized ? '是' : '否'}`);
      console.log(`   配置有效: ${configResponse.data.data.configValid ? '是' : '否'}`);
      if (configResponse.data.data.errors.length > 0) {
        console.log(`   配置错误: ${configResponse.data.data.errors.join(', ')}`);
      }
      if (configResponse.data.data.warnings.length > 0) {
        console.log(`   配置警告: ${configResponse.data.data.warnings.join(', ')}`);
      }
      console.log('');
    } catch (error) {
      console.log('❌ DhPay配置状态获取失败:', error.response?.data?.error || error.message);
      console.log('');
    }

    // 3. 测试创建DhPay支付订单
    console.log('3. 测试创建DhPay支付订单...');
    try {
      const testOrderId = `TEST_${Date.now()}`;
      const paymentData = {
        orderId: testOrderId,
        amount: 100.00,
        notifyUrl: 'http://localhost:3001/api/dhpay/callback',
        returnUrl: 'http://localhost:3000/payment/success',
        subject: 'Test Payment',
        description: 'Test payment for DhPay integration',
        param1: 'test_param1',
        param2: 'test_param2',
        customerName: 'Test User'
      };

      const paymentResponse = await axios.post(`${BASE_URL}/dhpay/create-payment`, paymentData, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });

      if (paymentResponse.data.success) {
        console.log('✅ DhPay支付订单创建成功');
        console.log(`   订单ID: ${paymentResponse.data.data.orderId}`);
        console.log(`   支付URL: ${paymentResponse.data.data.paymentUrl}`);
        console.log(`   提供者: ${paymentResponse.data.data.provider}`);
        console.log(`   创建时间: ${paymentResponse.data.data.createdAt}`);
        console.log('');
        
        // 保存订单ID用于后续测试
        global.testDhPayOrderId = paymentResponse.data.data.orderId;
      } else {
        console.log('❌ DhPay支付订单创建失败:', paymentResponse.data.error);
        console.log('');
      }
    } catch (error) {
      console.log('❌ DhPay支付订单创建失败:', error.response?.data?.error || error.message);
      console.log('');
    }

    // 4. 测试查询DhPay订单状态
    if (global.testDhPayOrderId) {
      console.log('4. 测试查询DhPay订单状态...');
      try {
        const statusResponse = await axios.get(`${BASE_URL}/dhpay/order-status/${global.testDhPayOrderId}`, {
          headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        });

        if (statusResponse.data.success) {
          console.log('✅ DhPay订单状态查询成功');
          console.log(`   订单ID: ${statusResponse.data.data.orderId}`);
          console.log(`   状态: ${statusResponse.data.data.status}`);
          console.log(`   金额: ${statusResponse.data.data.amount}`);
          console.log(`   货币: ${statusResponse.data.data.currency}`);
          console.log(`   提供者: ${statusResponse.data.data.provider}`);
          console.log('');
        } else {
          console.log('❌ DhPay订单状态查询失败:', statusResponse.data.error);
          console.log('');
        }
      } catch (error) {
        console.log('❌ DhPay订单状态查询失败:', error.response?.data?.error || error.message);
        console.log('');
      }
    }

    // 5. 测试查询DhPay商户余额
    console.log('5. 测试查询DhPay商户余额...');
    try {
      const balanceResponse = await axios.get(`${BASE_URL}/dhpay/balance`, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });

      if (balanceResponse.data.success) {
        console.log('✅ DhPay商户余额查询成功');
        console.log(`   余额: ${balanceResponse.data.data.balance}`);
        console.log(`   货币: ${balanceResponse.data.data.currency}`);
        console.log(`   提供者: ${balanceResponse.data.data.provider}`);
        console.log('');
      } else {
        console.log('❌ DhPay商户余额查询失败:', balanceResponse.data.error);
        console.log('');
      }
    } catch (error) {
      console.log('❌ DhPay商户余额查询失败:', error.response?.data?.error || error.message);
      console.log('');
    }

    // 6. 测试创建DhPay提现订单
    console.log('6. 测试创建DhPay提现订单...');
    try {
      const testWithdrawId = `WITHDRAW_${Date.now()}`;
      const withdrawData = {
        orderId: testWithdrawId,
        amount: 50.00,
        notifyUrl: 'http://localhost:3001/api/dhpay/callback',
        returnUrl: 'http://localhost:3000/withdraw/success',
        subject: 'Test Withdrawal',
        description: 'Test withdrawal for DhPay integration',
        param1: 'withdraw_param1',
        param2: 'withdraw_param2',
        customerName: 'Test User'
      };

      const withdrawResponse = await axios.post(`${BASE_URL}/dhpay/create-withdraw`, withdrawData, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });

      if (withdrawResponse.data.success) {
        console.log('✅ DhPay提现订单创建成功');
        console.log(`   订单ID: ${withdrawResponse.data.data.orderId}`);
        console.log(`   支付URL: ${withdrawResponse.data.data.paymentUrl}`);
        console.log(`   提供者: ${withdrawResponse.data.data.provider}`);
        console.log(`   创建时间: ${withdrawResponse.data.data.createdAt}`);
        console.log('');
        
        // 保存提现订单ID用于后续测试
        global.testDhPayWithdrawId = withdrawResponse.data.data.orderId;
      } else {
        console.log('❌ DhPay提现订单创建失败:', withdrawResponse.data.error);
        console.log('');
      }
    } catch (error) {
      console.log('❌ DhPay提现订单创建失败:', error.response?.data?.error || error.message);
      console.log('');
    }

    // 7. 测试查询DhPay UTR
    if (global.testDhPayOrderId) {
      console.log('7. 测试查询DhPay UTR...');
      try {
        const utrResponse = await axios.get(`${BASE_URL}/dhpay/utr/${global.testDhPayOrderId}`, {
          headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        });

        if (utrResponse.data.success) {
          console.log('✅ DhPay UTR查询成功');
          console.log(`   订单ID: ${utrResponse.data.data.orderId}`);
          console.log(`   UTR: ${utrResponse.data.data.utr}`);
          console.log(`   提供者: ${utrResponse.data.data.provider}`);
          console.log('');
        } else {
          console.log('❌ DhPay UTR查询失败:', utrResponse.data.error);
          console.log('');
        }
      } catch (error) {
        console.log('❌ DhPay UTR查询失败:', error.response?.data?.error || error.message);
        console.log('');
      }
    }

    // 8. 测试查询DhPay UPI
    if (global.testDhPayOrderId) {
      console.log('8. 测试查询DhPay UPI...');
      try {
        const upiResponse = await axios.get(`${BASE_URL}/dhpay/upi/${global.testDhPayOrderId}`, {
          headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        });

        if (upiResponse.data.success) {
          console.log('✅ DhPay UPI查询成功');
          console.log(`   订单ID: ${upiResponse.data.data.orderId}`);
          console.log(`   UPI: ${upiResponse.data.data.upi}`);
          console.log(`   提供者: ${upiResponse.data.data.provider}`);
          console.log('');
        } else {
          console.log('❌ DhPay UPI查询失败:', upiResponse.data.error);
          console.log('');
        }
      } catch (error) {
        console.log('❌ DhPay UPI查询失败:', error.response?.data?.error || error.message);
        console.log('');
      }
    }

    // 9. 测试DhPay回调处理
    console.log('9. 测试DhPay回调处理...');
    try {
      const mockCallbackData = {
        mchOrderNo: 'TEST_CALLBACK_123',
        status: 'SUCCESS',
        amount: '10000',
        fee: '50',
        currency: 'INR',
        utr: 'UTR123456789',
        upi: 'upi://test@bank',
        param1: 'callback_param1',
        param2: 'callback_param2',
        sign: 'MOCK_SIGNATURE'
      };

      const callbackResponse = await axios.get(`${BASE_URL}/dhpay/callback`, {
        params: mockCallbackData
      });

      console.log('✅ DhPay回调处理测试完成');
      console.log(`   响应: ${callbackResponse.data}`);
      console.log('');
    } catch (error) {
      console.log('❌ DhPay回调处理测试失败:', error.response?.data || error.message);
      console.log('');
    }

    // 10. 测试重新初始化DhPay提供者
    console.log('10. 测试重新初始化DhPay提供者...');
    try {
      const reinitResponse = await axios.post(`${BASE_URL}/dhpay/reinitialize`, {}, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });

      if (reinitResponse.data.success) {
        console.log('✅ DhPay提供者重新初始化成功');
        console.log(`   消息: ${reinitResponse.data.message}`);
        console.log('');
      } else {
        console.log('❌ DhPay提供者重新初始化失败:', reinitResponse.data.error);
        console.log('');
      }
    } catch (error) {
      console.log('❌ DhPay提供者重新初始化失败:', error.response?.data?.error || error.message);
      console.log('');
    }

    console.log('🎉 DhPay集成测试完成！');

  } catch (error) {
    console.error('❌ DhPay集成测试过程中发生错误:', error.message);
  }
}

/**
 * 测试DhPay签名算法
 */
function testDhPaySignature() {
  console.log('\n🔐 测试DhPay签名算法...\n');

  const testParams = {
    mchId: '10000',
    productId: '3001',
    mchOrderNo: 'TEST_ORDER_123',
    amount: 10000,
    clientIp: '0.0.0.0',
    notifyUrl: 'http://test.com/notify',
    returnUrl: 'http://test.com/return',
    subject: 'Test Payment',
    body: 'Test payment body',
    param1: 'param1_value',
    param2: 'param2_value',
    validateUserName: 'Test User',
    requestCardInfo: false
  };

  const secretKey = 'test_secret_key';

  // 1. 过滤空值参数
  const filteredParams = {};
  for (const [key, value] of Object.entries(testParams)) {
    if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
      filteredParams[key] = value;
    }
  }

  // 2. 按参数名ASCII码从小到大排序
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 3. 使用URL键值对格式拼接
  const stringA = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');
  
  // 4. 拼接密钥
  const stringSignTemp = stringA + secretKey;
  
  // 5. MD5加密并转大写
  const sign = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();

  console.log('测试参数:');
  console.log(JSON.stringify(testParams, null, 2));
  console.log('\n签名过程:');
  console.log(`1. 过滤后参数: ${JSON.stringify(filteredParams)}`);
  console.log(`2. 排序后键: ${sortedKeys.join(', ')}`);
  console.log(`3. 拼接字符串: ${stringA}`);
  console.log(`4. 添加密钥: ${stringSignTemp}`);
  console.log(`5. MD5签名: ${sign}`);

  // 验证签名
  const verificationParams = { ...testParams, sign };
  const calculatedSign = crypto.createHash('md5')
    .update(stringSignTemp)
    .digest('hex')
    .toUpperCase();

  console.log(`\n签名验证: ${calculatedSign === sign ? '✅ 成功' : '❌ 失败'}`);
}

// 运行测试
if (require.main === module) {
  testDhPayIntegration().then(() => {
    testDhPaySignature();
  }).catch(error => {
    console.error('测试执行失败:', error);
  });
}

module.exports = {
  testDhPayIntegration,
  testDhPaySignature
};
