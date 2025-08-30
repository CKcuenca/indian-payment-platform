const axios = require('axios');

// 测试前端集成的各个方面
async function testFrontendIntegration() {
  console.log('🔍 测试前端集成\n');
  
  const baseURL = 'http://localhost:3001';
  const api = axios.create({ baseURL });
  
  try {
    // 1. 测试登录获取token
    console.log('1️⃣ 测试登录...');
    const loginResponse = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      console.log('✅ 登录成功，获取到token');
      
      // 设置认证头
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // 2. 测试获取用户列表
      console.log('\n2️⃣ 测试获取用户列表...');
      const usersResponse = await api.get('/api/users');
      
      if (usersResponse.data.success) {
        console.log('✅ 获取用户列表成功');
        console.log('用户数量:', usersResponse.data.data.users.length);
        
        // 检查admin用户的权限
        const adminUser = usersResponse.data.data.users.find(u => u.username === 'admin');
        if (adminUser) {
          console.log('🔍 admin用户权限:', adminUser.permissions);
          console.log('是否有MANAGE_USERS权限:', adminUser.permissions.includes('MANAGE_USERS'));
        }
      } else {
        console.log('❌ 获取用户列表失败:', usersResponse.data.error);
      }
      
      // 3. 测试创建用户 - 使用不同的用户名
      console.log('\n3️⃣ 测试创建用户...');
      const timestamp = Date.now();
      const testUserData = {
        username: 'integration_test_' + timestamp,
        password: 'test123456',
        role: 'operator',
        status: 'active',
        fullName: '集成测试用户'
      };
      
      console.log('📋 要创建的用户数据:', testUserData);
      
      try {
        const createResponse = await api.post('/api/users', testUserData);
        
        if (createResponse.data.success) {
          console.log('✅ 创建用户成功');
          console.log('新用户ID:', createResponse.data.data.id);
          console.log('新用户权限:', createResponse.data.data.permissions);
          
          // 4. 测试删除用户
          console.log('\n4️⃣ 测试删除用户...');
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
      
      // 5. 测试权限检查
      console.log('\n5️⃣ 测试权限检查...');
      const adminUser = usersResponse.data.data.users.find(u => u.username === 'admin');
      if (adminUser) {
        const hasManageUsers = adminUser.permissions.includes('MANAGE_USERS');
        console.log('admin用户角色:', adminUser.role);
        console.log('admin用户权限:', adminUser.permissions);
        console.log('是否有MANAGE_USERS权限:', hasManageUsers);
        
        if (hasManageUsers) {
          console.log('✅ admin用户应该能够在用户管理界面创建和删除用户');
        } else {
          console.log('❌ admin用户缺少MANAGE_USERS权限');
        }
      }
      
    } else {
      console.log('❌ 登录失败:', loginResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
  
  console.log('\n🏁 前端集成测试完成');
}

// 运行测试
testFrontendIntegration();
