const axios = require('axios');

// 测试路由访问
async function testRouteAccess() {
  console.log('🧪 测试路由访问...\n');
  
  try {
    // 1. 测试前端路由
    console.log('1️⃣ 测试前端路由...');
    
    const frontendResponse = await axios.get('http://localhost:3000', {
      timeout: 5000
    });
    
    if (frontendResponse.status === 200) {
      console.log('✅ 前端路由正常');
      console.log('   状态码:', frontendResponse.status);
      console.log('   标题:', frontendResponse.data.match(/<title>(.*?)<\/title>/)?.[1] || '未找到标题');
    } else {
      console.log('❌ 前端路由异常');
      console.log('   状态码:', frontendResponse.status);
    }
    
    // 2. 测试后端API
    console.log('\n2️⃣ 测试后端API...');
    
    const backendResponse = await axios.get('http://localhost:3001/api/health', {
      timeout: 5000
    });
    
    if (backendResponse.status === 200) {
      console.log('✅ 后端API正常');
      console.log('   状态码:', backendResponse.status);
      console.log('   服务状态:', backendResponse.data.status);
    } else {
      console.log('❌ 后端API异常');
      console.log('   状态码:', backendResponse.status);
    }
    
    // 3. 测试商户登录
    console.log('\n3️⃣ 测试商户登录...');
    
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'test_merchant_001',
      password: 'new_password_456'
    }, {
      timeout: 5000
    });
    
    if (loginResponse.data.success) {
      console.log('✅ 商户登录成功');
      console.log('   用户角色:', loginResponse.data.data.user.role);
      console.log('   用户权限:', loginResponse.data.data.user.permissions);
      
      // 4. 测试商户管理API
      console.log('\n4️⃣ 测试商户管理API...');
      
      const token = loginResponse.data.data.token;
      const profileResponse = await axios.get('http://localhost:3001/api/merchant-profile/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      
      if (profileResponse.data.success) {
        console.log('✅ 商户管理API正常');
        console.log('   商户信息:', profileResponse.data.data.name);
      } else {
        console.log('❌ 商户管理API异常');
        console.log('   错误:', profileResponse.data.error);
      }
      
    } else {
      console.log('❌ 商户登录失败');
      console.log('   错误:', loginResponse.data.error);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   连接被拒绝，服务可能未启动');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   请求超时，服务响应慢');
    }
  }
  
  console.log('\n🏁 路由访问测试完成');
  console.log('\n💡 如果所有测试都通过，商户管理页面应该能正常访问');
  console.log('   请刷新浏览器页面并重新测试');
}

// 运行测试
testRouteAccess();
