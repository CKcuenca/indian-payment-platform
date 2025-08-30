const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3001';

async function testFrontendPermissions() {
  console.log('🔍 测试前端权限控制\n');

  try {
    // 1. 测试管理员登录
    console.log('1️⃣ 测试管理员登录...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!adminLoginResponse.data.success) {
      throw new Error('管理员登录失败');
    }

    const adminToken = adminLoginResponse.data.data.token;
    const adminUser = adminLoginResponse.data.data.user;
    console.log('✅ 管理员登录成功');
    console.log('管理员权限:', adminUser.permissions);

    // 2. 测试运营人员登录
    console.log('\n2️⃣ 测试运营人员登录...');
    const operatorLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'test_operator_001',
      password: 'test123456'
    });

    if (!operatorLoginResponse.data.success) {
      console.log('⚠️ 运营人员登录失败，可能需要先创建用户');
      // 创建运营人员用户
      console.log('创建运营人员用户...');
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
        // 重新尝试登录
        const retryLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          username: 'test_operator_001',
          password: 'test123456'
        });
        
        if (retryLoginResponse.data.success) {
          const operatorToken = retryLoginResponse.data.data.token;
          const operatorUser = retryLoginResponse.data.data.user;
          console.log('✅ 运营人员登录成功');
          console.log('运营人员权限:', operatorUser.permissions);
        } else {
          console.log('❌ 运营人员登录仍然失败');
        }
      } else {
        console.log('❌ 运营人员用户创建失败');
      }
    } else {
      const operatorToken = operatorLoginResponse.data.data.token;
      const operatorUser = operatorLoginResponse.data.data.user;
      console.log('✅ 运营人员登录成功');
      console.log('运营人员权限:', operatorUser.permissions);
    }

    // 3. 测试商户登录
    console.log('\n3️⃣ 测试商户登录...');
    const merchantLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'test_merchant_001',
      password: 'test123456'
    });

    if (merchantLoginResponse.data.success) {
      const merchantToken = merchantLoginResponse.data.data.token;
      const merchantUser = merchantLoginResponse.data.data.user;
      console.log('✅ 商户登录成功');
      console.log('商户权限:', merchantUser.permissions);
    } else {
      console.log('⚠️ 商户登录失败');
    }

    // 4. 测试权限检查
    console.log('\n4️⃣ 测试权限检查...');
    
    // 检查管理员权限
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
    const adminUsersResponse = await axios.get(`${BASE_URL}/api/users`, { headers: adminHeaders });
    console.log('管理员访问用户列表:', adminUsersResponse.data.success ? '✅ 成功' : '❌ 失败');

    // 检查运营人员权限
    if (operatorLoginResponse.data.success) {
      const operatorHeaders = { 'Authorization': `Bearer ${operatorLoginResponse.data.data.token}` };
      const operatorUsersResponse = await axios.get(`${BASE_URL}/api/users`, { headers: operatorHeaders });
      console.log('运营人员访问用户列表:', operatorUsersResponse.data.success ? '✅ 成功' : '❌ 失败');
    }

    // 检查商户权限
    if (merchantLoginResponse.data.success) {
      const merchantHeaders = { 'Authorization': `Bearer ${merchantLoginResponse.data.data.token}` };
      const merchantUsersResponse = await axios.get(`${BASE_URL}/api/users`, { headers: merchantHeaders });
      console.log('商户访问用户列表:', merchantUsersResponse.data.success ? '✅ 成功' : '❌ 失败');
    }

    console.log('\n🏁 前端权限控制测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testFrontendPermissions();
