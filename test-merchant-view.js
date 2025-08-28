const axios = require('axios');

// 测试商户视图功能
async function testMerchantView() {
  console.log('🧪 开始测试商户视图功能...\n');
  
  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. 测试商户登录
    console.log('1️⃣ 测试商户登录...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'test_merchant_001',
      password: 'test_password_123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ 商户登录成功');
      console.log('   用户信息:', {
        id: loginResponse.data.data.user.id,
        username: loginResponse.data.data.user.username,
        role: loginResponse.data.data.user.role,
        merchantId: loginResponse.data.data.user.merchantId
      });
      
      const token = loginResponse.data.data.token;
      
      // 2. 测试获取商户信息
      console.log('\n2️⃣ 测试获取商户信息...');
      const merchantResponse = await axios.get(`${baseURL}/api/merchant/${loginResponse.data.data.user.merchantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (merchantResponse.data.success) {
        console.log('✅ 获取商户信息成功');
        console.log('   商户信息:', {
          merchantId: merchantResponse.data.data.merchantId,
          name: merchantResponse.data.data.name,
          status: merchantResponse.data.data.status,
          defaultProvider: merchantResponse.data.data.defaultProvider
        });
      } else {
        console.log('❌ 获取商户信息失败:', merchantResponse.data.message);
      }
      
      // 3. 测试修改密码API
      console.log('\n3️⃣ 测试修改密码API...');
      try {
        const passwordResponse = await axios.post(`${baseURL}/api/merchant/change-password`, {
          currentPassword: 'test_password_123',
          newPassword: 'new_password_456'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (passwordResponse.data.success) {
          console.log('✅ 修改密码API调用成功');
        } else {
          console.log('⚠️ 修改密码API返回错误:', passwordResponse.data.message);
        }
      } catch (error) {
        console.log('⚠️ 修改密码API调用失败 (可能是接口未实现):', error.response?.data?.message || error.message);
      }
      
      // 4. 测试生成API密钥API
      console.log('\n4️⃣ 测试生成API密钥API...');
      try {
        const apiKeyResponse = await axios.post(`${baseURL}/api/merchant/generate-api-key`, {
          name: '测试密钥',
          description: '用于测试的API密钥'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (apiKeyResponse.data.success) {
          console.log('✅ 生成API密钥API调用成功');
        } else {
          console.log('⚠️ 生成API密钥API返回错误:', apiKeyResponse.data.message);
        }
      } catch (error) {
        console.log('⚠️ 生成API密钥API调用失败 (可能是接口未实现):', error.response?.data?.message || error.message);
      }
      
    } else {
      console.log('❌ 商户登录失败:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.response?.data?.message || error.message);
  }
  
  console.log('\n🏁 商户视图功能测试完成');
}

// 运行测试
testMerchantView();
