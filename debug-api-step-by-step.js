const axios = require('axios');

// 逐步调试用户管理API
async function debugAPI() {
  console.log('🔍 逐步调试用户管理API\n');
  
  const baseURL = 'http://localhost:3001';
  const api = axios.create({ baseURL });
  
  try {
    // 1. 测试服务器连接
    console.log('1️⃣ 测试服务器连接...');
    try {
      const healthResponse = await api.get('/api/health');
      console.log('✅ 服务器连接正常');
      console.log('服务器状态:', healthResponse.data);
    } catch (error) {
      console.log('❌ 服务器连接失败:', error.message);
      return;
    }
    
    // 2. 测试登录
    console.log('\n2️⃣ 测试登录...');
    let token = null;
    try {
      const loginResponse = await api.post('/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });
      
      if (loginResponse.data.success) {
        token = loginResponse.data.data.token;
        console.log('✅ 登录成功，获取到token');
        console.log('Token长度:', token.length);
        
        // 设置认证头
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('❌ 登录失败:', loginResponse.data.error);
        return;
      }
    } catch (error) {
      console.log('❌ 登录请求失败:', error.message);
      if (error.response) {
        console.log('响应状态:', error.response.status);
        console.log('响应数据:', error.response.data);
      }
      return;
    }
    
    // 3. 测试获取用户列表
    console.log('\n3️⃣ 测试获取用户列表...');
    try {
      const usersResponse = await api.get('/api/users');
      
      if (usersResponse.data.success) {
        console.log('✅ 获取用户列表成功');
        console.log('用户数量:', usersResponse.data.data.users.length);
        console.log('用户列表:', usersResponse.data.data.users.map(u => ({
          username: u.username,
          role: u.role,
          status: u.status
        })));
      } else {
        console.log('❌ 获取用户列表失败:', usersResponse.data.error);
      }
    } catch (error) {
      console.log('❌ 获取用户列表失败:', error.message);
      if (error.response) {
        console.log('响应状态:', error.response.status);
        console.log('响应数据:', error.response.data);
      }
    }
    
    // 4. 测试创建用户 - 详细调试
    console.log('\n4️⃣ 测试创建用户...');
    const timestamp = Date.now();
    const testUserData = {
      username: 'debug_user_' + timestamp,
      password: 'test123456',
      role: 'operator',
      status: 'active',
      fullName: '调试用户',
      // 邮箱字段已移除
    };
    
    console.log('📋 要创建的用户数据:', testUserData);
    
    try {
      const createResponse = await api.post('/api/users', testUserData);
      
      if (createResponse.data.success) {
        console.log('✅ 创建用户成功');
        console.log('新用户ID:', createResponse.data.data.id);
        console.log('新用户权限:', createResponse.data.data.permissions);
        
        // 5. 测试删除用户
        console.log('\n5️⃣ 测试删除用户...');
        try {
          const deleteResponse = await api.delete(`/api/users/${createResponse.data.data.id}`);
          
          if (deleteResponse.data.success) {
            console.log('✅ 删除用户成功');
          } else {
            console.log('❌ 删除用户失败:', deleteResponse.data.error);
          }
        } catch (deleteError) {
          console.log('❌ 删除用户请求失败:', deleteError.message);
          if (deleteError.response) {
            console.log('删除响应状态:', deleteError.response.status);
            console.log('删除响应数据:', deleteError.response.data);
          }
        }
      } else {
        console.log('❌ 创建用户失败:', createResponse.data.error);
      }
    } catch (createError) {
      console.log('❌ 创建用户请求失败:', createError.message);
      if (createError.response) {
        console.log('创建响应状态:', createError.response.status);
        console.log('创建响应数据:', createError.response.data);
        console.log('创建响应头:', createError.response.headers);
      }
    }
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message);
  }
  
  console.log('\n🏁 API调试完成');
}

// 运行调试
debugAPI();
