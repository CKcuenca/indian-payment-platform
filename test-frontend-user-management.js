const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  username: 'test_user_001',
  password: 'test123456',
  role: 'operator',
  status: 'active',
  fullName: '测试用户001'
};

async function testFrontendUserManagement() {
  console.log('🔍 测试前端用户管理功能\n');

  try {
    // 1. 测试登录
    console.log('1️⃣ 测试登录...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      throw new Error('登录失败');
    }

    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功，获取到token');

    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. 测试获取用户列表
    console.log('\n2️⃣ 测试获取用户列表...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`, { headers });
    
    if (usersResponse.data.success) {
      const users = usersResponse.data.data.users || usersResponse.data.data;
      console.log('✅ 获取用户列表成功');
      console.log(`用户数量: ${users.length}`);
      console.log('用户列表:', users.map(u => ({ username: u.username, role: u.role, status: u.status })));
    } else {
      throw new Error('获取用户列表失败');
    }

    // 3. 测试创建用户
    console.log('\n3️⃣ 测试创建用户...');
    const createResponse = await axios.post(`${BASE_URL}/api/users`, TEST_USER, { headers });
    
    if (createResponse.data.success) {
      console.log('✅ 创建用户成功');
      console.log('新用户ID:', createResponse.data.data.id || '未返回ID');
    } else {
      throw new Error('创建用户失败: ' + createResponse.data.error);
    }

    // 4. 再次获取用户列表，确认用户已创建
    console.log('\n4️⃣ 确认用户已创建...');
    const usersResponse2 = await axios.get(`${BASE_URL}/api/users`, { headers });
    
    if (usersResponse2.data.success) {
      const users = usersResponse2.data.data.users || usersResponse2.data.data;
      const newUser = users.find(u => u.username === TEST_USER.username);
      if (newUser) {
        console.log('✅ 确认新用户已创建');
        console.log('新用户详情:', { 
          id: newUser.id, 
          username: newUser.username, 
          role: newUser.role, 
          status: newUser.status 
        });
      } else {
        console.log('❌ 未找到新创建的用户');
      }
    }

    // 5. 测试删除用户
    console.log('\n5️⃣ 测试删除用户...');
    const usersResponse3 = await axios.get(`${BASE_URL}/api/users`, { headers });
    const users3 = usersResponse3.data.data.users || usersResponse3.data.data;
    const userToDelete = users3.find(u => u.username === TEST_USER.username);
    
    if (userToDelete) {
      const deleteResponse = await axios.delete(`${BASE_URL}/api/users/${userToDelete.id}`, { headers });
      
      if (deleteResponse.data.success) {
        console.log('✅ 删除用户成功');
      } else {
        throw new Error('删除用户失败: ' + deleteResponse.data.error);
      }
    } else {
      console.log('⚠️ 未找到要删除的用户');
    }

    // 6. 最终确认用户已删除
    console.log('\n6️⃣ 确认用户已删除...');
    const finalUsersResponse = await axios.get(`${BASE_URL}/api/users`, { headers });
    const finalUsers = finalUsersResponse.data.data.users || finalUsersResponse.data.data;
    const deletedUser = finalUsers.find(u => u.username === TEST_USER.username);
    
    if (!deletedUser) {
      console.log('✅ 确认用户已删除');
    } else {
      console.log('❌ 用户仍然存在，删除可能失败');
    }

    console.log('\n🏁 前端用户管理功能测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testFrontendUserManagement();
