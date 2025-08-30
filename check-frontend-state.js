const axios = require('axios');

// 检查前端的实际状态
async function checkFrontendState() {
  console.log('🔍 检查前端状态\n');
  
  const baseURL = 'http://localhost:3001';
  const api = axios.create({ baseURL });
  
  try {
    // 1. 测试登录
    console.log('1️⃣ 测试登录...');
    const loginResponse = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      const { user, token, permissions } = loginResponse.data.data;
      console.log('✅ 登录成功');
      console.log('用户信息:', {
        username: user.username,
        role: user.role,
        permissions: user.permissions
      });
      console.log('API返回的权限:', permissions);
      
      // 设置认证头
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // 2. 检查用户列表API
      console.log('\n2️⃣ 检查用户列表API...');
      const usersResponse = await api.get('/api/users');
      
      if (usersResponse.data.success) {
        console.log('✅ 获取用户列表成功');
        const adminUser = usersResponse.data.data.users.find(u => u.username === 'admin');
        if (adminUser) {
          console.log('🔍 用户列表中的admin用户:');
          console.log('  - 用户名:', adminUser.username);
          console.log('  - 角色:', adminUser.role);
          console.log('  - 权限:', adminUser.permissions);
          console.log('  - 是否有MANAGE_USERS:', adminUser.permissions.includes('MANAGE_USERS'));
        }
      }
      
      // 3. 检查前端可能的问题
      console.log('\n3️⃣ 分析可能的问题...');
      
      // 检查权限是否一致
      const loginPermissions = user.permissions || permissions;
      const listPermissions = adminUser ? adminUser.permissions : [];
      
      console.log('登录API返回的权限:', loginPermissions);
      console.log('用户列表API返回的权限:', listPermissions);
      console.log('权限是否一致:', JSON.stringify(loginPermissions) === JSON.stringify(listPermissions));
      
      // 检查角色格式
      console.log('\n4️⃣ 检查角色格式...');
      console.log('登录API返回的角色:', user.role, '类型:', typeof user.role);
      console.log('用户列表API返回的角色:', adminUser ? adminUser.role : 'N/A', '类型:', typeof (adminUser ? adminUser.role : 'N/A'));
      
      // 检查权限格式
      console.log('\n5️⃣ 检查权限格式...');
      if (loginPermissions.length > 0) {
        console.log('第一个权限:', loginPermissions[0], '类型:', typeof loginPermissions[0]);
        console.log('是否包含MANAGE_USERS:', loginPermissions.includes('MANAGE_USERS'));
        console.log('是否包含MANAGE_USERS (严格比较):', loginPermissions.some(p => p === 'MANAGE_USERS'));
      }
      
      // 6. 模拟前端权限检查
      console.log('\n6️⃣ 模拟前端权限检查...');
      const requiredPermission = 'MANAGE_USERS';
      
      // 模拟登录后的权限检查
      const hasPermissionFromLogin = loginPermissions.includes(requiredPermission);
      console.log('从登录API检查权限:', hasPermissionFromLogin);
      
      // 模拟用户列表后的权限检查
      const hasPermissionFromList = listPermissions.includes(requiredPermission);
      console.log('从用户列表API检查权限:', hasPermissionFromList);
      
      if (hasPermissionFromLogin && hasPermissionFromList) {
        console.log('✅ 权限检查通过，前端应该能正常显示用户管理功能');
      } else {
        console.log('❌ 权限检查失败，前端可能无法显示用户管理功能');
        if (!hasPermissionFromLogin) {
          console.log('  - 登录API权限检查失败');
        }
        if (!hasPermissionFromList) {
          console.log('  - 用户列表API权限检查失败');
        }
      }
      
    } else {
      console.log('❌ 登录失败:', loginResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
  
  console.log('\n🏁 前端状态检查完成');
}

// 运行检查
checkFrontendState();
