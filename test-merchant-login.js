const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';

async function testMerchantLogin() {
  console.log('🔍 测试商户登录\n');

  try {
    // 测试商户登录
    console.log('1️⃣ 测试商户登录...');
    const merchantLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'test_merchant_001',
      password: 'test123456'
    });

    if (merchantLoginResponse.data.success) {
      const merchantToken = merchantLoginResponse.data.data.token;
      const merchantUser = merchantLoginResponse.data.data.user;
      console.log('✅ 商户登录成功');
      console.log('商户权限:', merchantUser.permissions);
      console.log('商户ID:', merchantUser.merchantId);
      console.log('用户状态:', merchantUser.status);
    } else {
      console.log('❌ 商户登录失败');
      console.log('错误信息:', merchantLoginResponse.data.error);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testMerchantLogin();
