const axios = require('axios');

// 配置
const BASE_URL = 'https://cashgit.com';

// 测试用户注册
async function testUserRegistration() {
  try {
    console.log('📝 测试用户注册...');
    
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'test123456',
      fullName: '测试用户',
      role: 'user',
      phone: '1234567890'
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
    
    if (response.data.success) {
      console.log('✅ 用户注册成功');
      console.log(`📋 用户信息:`);
      console.log(`  用户名: ${response.data.data.user.username}`);
      console.log(`  邮箱: ${response.data.data.user.email}`);
      console.log(`  角色: ${response.data.data.user.role}`);
      console.log(`  状态: ${response.data.data.user.status}`);
      console.log(`  Token: ${response.data.data.token.substring(0, 20)}...`);
      
      return {
        user: response.data.data.user,
        token: response.data.data.token
      };
    } else {
      throw new Error('注册失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 用户注册失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试用户登录
async function testUserLogin(username, password) {
  try {
    console.log(`\n🔐 测试用户登录 (${username})...`);
    
    const loginData = {
      username: username,
      password: password
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    
    if (response.data.success) {
      console.log('✅ 用户登录成功');
      console.log(`📋 登录信息:`);
      console.log(`  用户名: ${response.data.data.user.username}`);
      console.log(`  角色: ${response.data.data.user.role}`);
      console.log(`  状态: ${response.data.data.user.status}`);
      console.log(`  Token: ${response.data.data.token.substring(0, 20)}...`);
      
      return {
        user: response.data.data.user,
        token: response.data.data.token
      };
    } else {
      throw new Error('登录失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 用户登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试Token验证
async function testTokenValidation(token) {
  try {
    console.log('\n🔍 测试Token验证...');
    
    const response = await axios.get(`${BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ Token验证成功');
      console.log(`📋 用户信息:`);
      console.log(`  用户ID: ${response.data.data.userId}`);
      console.log(`  用户名: ${response.data.data.username}`);
      console.log(`  角色: ${response.data.data.role}`);
      return response.data.data;
    } else {
      throw new Error('Token验证失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ Token验证失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试用户信息获取
async function testGetUserProfile(token) {
  try {
    console.log('\n👤 测试获取用户信息...');
    
    const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 获取用户信息成功');
      console.log(`📋 用户详情:`);
      console.log(`  用户名: ${response.data.data.username}`);
      console.log(`  邮箱: ${response.data.data.email}`);
      console.log(`  姓名: ${response.data.data.fullName}`);
      console.log(`  角色: ${response.data.data.role}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  创建时间: ${response.data.data.createdAt}`);
      return response.data.data;
    } else {
      throw new Error('获取用户信息失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试密码修改
async function testChangePassword(token, oldPassword, newPassword) {
  try {
    console.log('\n🔒 测试修改密码...');
    
    const passwordData = {
      oldPassword: oldPassword,
      newPassword: newPassword
    };
    
    const response = await axios.put(`${BASE_URL}/api/auth/change-password`, passwordData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 修改密码成功');
      return true;
    } else {
      throw new Error('修改密码失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 修改密码失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试用户登出
async function testUserLogout(token) {
  try {
    console.log('\n🚪 测试用户登出...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 用户登出成功');
      return true;
    } else {
      throw new Error('用户登出失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 用户登出失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试无效Token
async function testInvalidToken() {
  try {
    console.log('\n❌ 测试无效Token...');
    
    const invalidToken = 'invalid.token.here';
    
    const response = await axios.get(`${BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${invalidToken}` }
    });
    
    if (!response.data.success) {
      console.log('✅ 无效Token正确被拒绝');
      console.log(`📋 错误信息: ${response.data.error}`);
      return true;
    } else {
      console.log('❌ 无效Token应该被拒绝');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ 无效Token正确被拒绝');
      console.log(`📋 错误信息: ${error.response.data.error}`);
      return true;
    } else {
      console.error('❌ 无效Token测试失败:', error.response?.data || error.message);
      return false;
    }
  }
}

// 测试认证中间件
async function testAuthMiddleware() {
  try {
    console.log('\n🛡️ 测试认证中间件...');
    
    // 测试无Token访问受保护接口
    try {
      await axios.get(`${BASE_URL}/api/auth/profile`);
      console.log('❌ 无Token访问应该被拒绝');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 无Token访问正确被拒绝');
        console.log(`📋 错误信息: ${error.response.data.error}`);
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ 认证中间件测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 主测试函数
async function testAuthAPIs() {
  console.log('🚀 开始测试认证相关接口...\n');
  
  try {
    // 1. 测试用户注册
    const registrationResult = await testUserRegistration();
    const { user, token } = registrationResult;
    
    // 2. 测试用户登录
    const loginResult = await testUserLogin(user.username, 'test123456');
    const loginToken = loginResult.token;
    
    // 3. 测试Token验证
    await testTokenValidation(loginToken);
    
    // 4. 测试获取用户信息
    await testGetUserProfile(loginToken);
    
    // 5. 测试修改密码
    await testChangePassword(loginToken, 'test123456', 'newpassword123');
    
    // 6. 测试新密码登录
    const newLoginResult = await testUserLogin(user.username, 'newpassword123');
    
    // 7. 测试用户登出
    await testUserLogout(newLoginResult.token);
    
    // 8. 测试无效Token
    await testInvalidToken();
    
    // 9. 测试认证中间件
    await testAuthMiddleware();
    
    console.log('\n🎉 认证接口测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 认证接口测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testAuthAPIs().catch(console.error);
