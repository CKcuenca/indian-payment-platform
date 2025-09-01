const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

/**
 * 获取有效的认证token
 */
async function getValidToken() {
  try {
    // 尝试登录获取token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      return loginResponse.data.token;
    }
  } catch (error) {
    console.log('登录失败，使用默认token...');
  }
  
  // 如果登录失败，尝试使用其他方式获取token
  try {
    const response = await axios.get(`${BASE_URL}/auth/status`);
    if (response.data.success && response.data.token) {
      return response.data.token;
    }
  } catch (error) {
    console.log('获取认证状态失败...');
  }
  
  return null;
}

/**
 * DhPay集成测试（带认证）
 */
async function testDhPayWithAuth() {
  console.log('🧪 开始DhPay集成测试（带认证）...\n');

  try {
    // 1. 获取有效token
    console.log('1. 获取认证token...');
    const token = await getValidToken();
    
    if (!token) {
      console.log('❌ 无法获取有效token，跳过需要认证的测试');
      console.log('   继续测试不需要认证的接口...\n');
    } else {
      console.log('✅ 获取token成功\n');
    }

    // 2. 测试DhPay信息（需要认证）
    if (token) {
      console.log('2. 测试获取DhPay信息...');
      try {
        const infoResponse = await axios.get(`${BASE_URL}/dhpay/info`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ DhPay信息获取成功');
        console.log(`   提供者: ${infoResponse.data.data.name}`);
        console.log(`   代码: ${infoResponse.data.data.code}`);
        console.log(`   版本: ${infoResponse.data.data.version}`);
        console.log(`   支持功能: ${infoResponse.data.data.supportedFeatures.join(', ')}`);
        console.log(`   支持货币: ${infoResponse.data.data.currencies.join(', ')}\n`);
      } catch (error) {
        console.log('❌ DhPay信息获取失败:', error.response?.data?.error || error.message);
      }
    }

    // 3. 测试DhPay配置（需要认证）
    if (token) {
      console.log('3. 测试获取DhPay配置...');
      try {
        const configResponse = await axios.get(`${BASE_URL}/dhpay/config`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ DhPay配置获取成功');
        console.log(`   商户ID: ${configResponse.data.data.mchId}`);
        console.log(`   API地址: ${configResponse.data.data.baseUrl}`);
        console.log(`   环境: ${configResponse.data.data.environment}\n`);
      } catch (error) {
        console.log('❌ DhPay配置获取失败:', error.response?.data?.error || error.message);
      }
    }

    // 4. 测试DhPay余额查询（需要认证）
    if (token) {
      console.log('4. 测试DhPay余额查询...');
      try {
        const balanceResponse = await axios.get(`${BASE_URL}/dhpay/balance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ DhPay余额查询成功');
        console.log(`   余额: ${balanceResponse.data.data.balance}`);
        console.log(`   冻结金额: ${balanceResponse.data.data.frozenAmount}`);
        console.log(`   可用余额: ${balanceResponse.data.data.availableBalance}\n`);
      } catch (error) {
        console.log('❌ DhPay余额查询失败:', error.response?.data?.error || error.message);
      }
    }

    // 5. 测试DhPay代收下单（需要认证）
    if (token) {
      console.log('5. 测试DhPay代收下单...');
      try {
        const depositResponse = await axios.post(`${BASE_URL}/dhpay/deposit`, {
          amount: 100, // 1卢比
          orderId: `TEST_${Date.now()}`,
          notifyUrl: 'http://localhost:3001/api/dhpay/notify',
          returnUrl: 'http://localhost:3001/api/dhpay/return',
          productId: '3001'
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ DhPay代收下单成功');
        console.log(`   订单ID: ${depositResponse.data.data.orderId}`);
        console.log(`   支付链接: ${depositResponse.data.data.payUrl}\n`);
      } catch (error) {
        console.log('❌ DhPay代收下单失败:', error.response?.data?.error || error.message);
      }
    }

    // 6. 测试DhPay代付下单（需要认证）
    if (token) {
      console.log('6. 测试DhPay代付下单...');
      try {
        const withdrawResponse = await axios.post(`${BASE_URL}/dhpay/withdraw`, {
          amount: 100, // 1卢比
          orderId: `WITHDRAW_${Date.now()}`,
          notifyUrl: 'http://localhost:3001/api/dhpay/notify',
          bankCode: 'HDFC',
          accountNumber: '1234567890',
          accountName: 'Test User',
          ifscCode: 'HDFC0001234',
          productId: '3002'
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ DhPay代付下单成功');
        console.log(`   订单ID: ${withdrawResponse.data.data.orderId}`);
        console.log(`   状态: ${withdrawResponse.data.data.status}\n`);
      } catch (error) {
        console.log('❌ DhPay代付下单失败:', error.response?.data?.error || error.message);
      }
    }

    // 7. 测试DhPay订单查询（需要认证）
    if (token) {
      console.log('7. 测试DhPay订单查询...');
      try {
        const queryResponse = await axios.get(`${BASE_URL}/dhpay/query?orderId=TEST_123`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ DhPay订单查询成功');
        console.log(`   订单ID: ${queryResponse.data.data.orderId}`);
        console.log(`   状态: ${queryResponse.data.data.status}\n`);
      } catch (error) {
        console.log('❌ DhPay订单查询失败:', error.response?.data?.error || error.message);
      }
    }

    // 8. 测试DhPay回调验证
    console.log('8. 测试DhPay回调验证...');
    try {
      const testParams = {
        orderId: 'TEST_123',
        amount: '100',
        status: 'SUCCESS',
        timestamp: Date.now().toString()
      };
      
      const signature = crypto
        .createHash('md5')
        .update(Object.keys(testParams).sort().map(key => `${key}=${testParams[key]}`).join('&') + 'test_secret_key')
        .digest('hex')
        .toUpperCase();
      
      testParams.sign = signature;
      
      const notifyResponse = await axios.post(`${BASE_URL}/dhpay/notify`, testParams);
      console.log('✅ DhPay回调验证成功');
      console.log(`   验证结果: ${notifyResponse.data.message}\n`);
    } catch (error) {
      console.log('❌ DhPay回调验证失败:', error.response?.data?.error || error.message);
    }

    console.log('🎉 DhPay集成测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
testDhPayWithAuth();
