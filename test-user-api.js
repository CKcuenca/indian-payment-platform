const axios = require('axios');

// 测试用户管理API
async function testUserAPI() {
  console.log('🔍 测试用户管理API\n');
  
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
        console.log('用户列表:', usersResponse.data.data.users.map(u => ({
          username: u.username,
          role: u.role,
          status: u.status
        })));
      } else {
        console.log('❌ 获取用户列表失败:', usersResponse.data.error);
      }
      
      // 3. 测试创建用户
      console.log('\n3️⃣ 测试创建用户...');
      const createUserResponse = await api.post('/api/users', {
        username: 'test_user_' + Date.now(),
        password: 'test123456',
        role: 'operator',
        status: 'active',
        fullName: '测试用户',
        email: 'test@example.com'
      });
      
      if (createUserResponse.data.success) {
        console.log('✅ 创建用户成功');
        const newUserId = createUserResponse.data.data.id;
        
        // 4. 测试删除用户
        console.log('\n4️⃣ 测试删除用户...');
        const deleteUserResponse = await api.delete(`/api/users/${newUserId}`);
        
        if (deleteUserResponse.data.success) {
          console.log('✅ 删除用户成功');
        } else {
          console.log('❌ 删除用户失败:', deleteUserResponse.data.error);
        }
      } else {
        console.log('❌ 创建用户失败:', createUserResponse.data.error);
      }
      
    } else {
      console.log('❌ 登录失败:', loginResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
  
  console.log('\n🏁 API测试完成');
}

// 运行测试
testUserAPI();
