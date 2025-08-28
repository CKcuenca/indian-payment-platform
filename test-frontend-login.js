const axios = require('axios');

// 测试前端登录功能
async function testFrontendLogin() {
  console.log('🧪 测试前端登录功能...\n');
  
  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. 测试商户登录
    console.log('1️⃣ 测试商户登录...');
    const merchantLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'test_merchant_001',
      password: 'new_password_456'
    });
    
    if (merchantLoginResponse.data.success) {
      console.log('✅ 商户登录成功');
      console.log('   用户角色:', merchantLoginResponse.data.data.user.role);
      console.log('   商户ID:', merchantLoginResponse.data.data.user.merchantId);
      console.log('   权限:', merchantLoginResponse.data.data.user.permissions);
      
      const merchantToken = merchantLoginResponse.data.data.token;
      
      // 2. 测试商户个人资料API
      console.log('\n2️⃣ 测试商户个人资料API...');
      const profileResponse = await axios.get(`${baseURL}/api/merchant-profile/profile`, {
        headers: {
          'Authorization': `Bearer ${merchantToken}`
        }
      });
      
      if (profileResponse.data.success) {
        console.log('✅ 获取商户个人资料成功');
        console.log('   商户名称:', profileResponse.data.data.name);
        console.log('   状态:', profileResponse.data.data.status);
      } else {
        console.log('❌ 获取商户个人资料失败:', profileResponse.data.error);
      }
      
    } else {
      console.log('❌ 商户登录失败:', merchantLoginResponse.data.error);
    }
    
    // 3. 测试管理员登录
    console.log('\n3️⃣ 测试管理员登录...');
    const adminLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (adminLoginResponse.data.success) {
      console.log('✅ 管理员登录成功');
      console.log('   用户角色:', adminLoginResponse.data.data.user.role);
      console.log('   权限:', adminLoginResponse.data.data.user.permissions);
    } else {
      console.log('❌ 管理员登录失败:', adminLoginResponse.data.error);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.response?.data?.error || error.message);
  }
  
  console.log('\n🏁 前端登录功能测试完成');
  console.log('\n🌐 现在您可以打开浏览器访问: http://localhost:3000');
  console.log('   使用以下账户测试登录:');
  console.log('   - 商户账户: test_merchant_001 / new_password_456');
  console.log('   - 管理员账户: admin / admin123');
}

// 运行测试
testFrontendLogin();
