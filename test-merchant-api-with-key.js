const axios = require('axios');

// 测试使用API密钥访问商户API
async function testMerchantApiWithKey() {
  console.log('🧪 测试使用API密钥访问商户API...\n');
  
  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. 先登录获取商户信息
    console.log('1️⃣ 登录获取商户信息...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'test_merchant_001',
      password: 'new_password_456'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ 商户登录成功');
      const merchantId = loginResponse.data.data.user.merchantId;
      console.log('   商户ID:', merchantId);
      
      // 2. 使用API密钥访问商户API
      console.log('\n2️⃣ 使用API密钥访问商户API...');
      const apiKeyResponse = await axios.get(`${baseURL}/api/merchant`, {
        headers: {
          'X-API-Key': 'test_api_key_1756303754346' // 从商户信息中获取的API密钥
        }
      });
      
      if (apiKeyResponse.data.success) {
        console.log('✅ 使用API密钥访问商户API成功');
        console.log('   返回商户数量:', apiKeyResponse.data.data.merchants.length);
      } else {
        console.log('❌ 使用API密钥访问商户API失败:', apiKeyResponse.data.error);
      }
      
      // 3. 测试获取单个商户信息
      console.log('\n3️⃣ 测试获取单个商户信息...');
      const singleMerchantResponse = await axios.get(`${baseURL}/api/merchant/${merchantId}`, {
        headers: {
          'X-API-Key': 'test_api_key_1756303754346'
        }
      });
      
      if (singleMerchantResponse.data.success) {
        console.log('✅ 获取单个商户信息成功');
        console.log('   商户名称:', singleMerchantResponse.data.data.merchant.name);
      } else {
        console.log('❌ 获取单个商户信息失败:', singleMerchantResponse.data.error);
      }
      
    } else {
      console.log('❌ 商户登录失败:', loginResponse.data.error);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.response?.data?.error || error.message);
  }
  
  console.log('\n🏁 商户API测试完成');
}

// 运行测试
testMerchantApiWithKey();
