const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';

async function createOperatorUser() {
  console.log('🔍 创建运营人员用户\n');

  try {
    // 1. 管理员登录
    console.log('1️⃣ 管理员登录...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!adminLoginResponse.data.success) {
      throw new Error('管理员登录失败');
    }

    const adminToken = adminLoginResponse.data.data.token;
    console.log('✅ 管理员登录成功');

    // 2. 创建运营人员用户
    console.log('\n2️⃣ 创建运营人员用户...');
    const createOperatorResponse = await axios.post(`${BASE_URL}/api/users`, {
      username: 'test_operator_001',
      password: 'test123456',
      role: 'operator',
      status: 'active',
      fullName: '测试运营人员001'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (createOperatorResponse.data.success) {
      console.log('✅ 运营人员用户创建成功');
      console.log('用户ID:', createOperatorResponse.data.data.id);
      console.log('用户名:', createOperatorResponse.data.data.username);
      console.log('角色:', createOperatorResponse.data.data.role);
      console.log('状态:', createOperatorResponse.data.data.status);
    } else {
      throw new Error('创建运营人员用户失败: ' + createOperatorResponse.data.error);
    }

    // 3. 验证用户创建成功
    console.log('\n3️⃣ 验证用户创建成功...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`, { 
      headers: { 'Authorization': `Bearer ${adminToken}` } 
    });
    
    if (usersResponse.data.success) {
      const users = usersResponse.data.data.users || usersResponse.data.data;
      const newOperator = users.find(u => u.username === 'test_operator_001');
      if (newOperator) {
        console.log('✅ 确认运营人员用户已创建');
        console.log('用户详情:', { 
          id: newOperator.id, 
          username: newOperator.username, 
          role: newOperator.role, 
          status: newOperator.status 
        });
      } else {
        console.log('❌ 未找到新创建的运营人员用户');
      }
    }

    console.log('\n🏁 运营人员用户创建完成');

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行脚本
createOperatorUser();
