const axios = require('axios');

// 测试权限控制
async function testPermissionControl() {
  console.log('🧪 测试权限控制...\n');
  
  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. 商户登录
    console.log('1️⃣ 商户登录...');
    const merchantLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'test_merchant_001',
      password: 'new_password_456'
    });
    
    if (merchantLoginResponse.data.success) {
      console.log('✅ 商户登录成功');
      const merchantToken = merchantLoginResponse.data.data.token;
      const merchantPermissions = merchantLoginResponse.data.data.user.permissions;
      console.log('   权限:', merchantPermissions);
      
      // 2. 测试商户可以访问的页面
      console.log('\n2️⃣ 测试商户权限...');
      
      // 商户应该可以访问商户管理页面（自己的账户信息）
      if (merchantPermissions.includes('VIEW_OWN_MERCHANT_DATA')) {
        console.log('✅ 商户有权限访问商户管理页面');
      } else {
        console.log('❌ 商户没有权限访问商户管理页面');
      }
      
      // 商户不应该有支付管理权限
      if (merchantPermissions.includes('VIEW_PAYMENT_CONFIG')) {
        console.log('❌ 商户不应该有支付管理权限');
      } else {
        console.log('✅ 商户没有支付管理权限（正确）');
      }
      
      // 商户不应该有用户管理权限
      if (merchantPermissions.includes('MANAGE_USERS')) {
        console.log('❌ 商户不应该有用户管理权限');
      } else {
        console.log('✅ 商户没有用户管理权限（正确）');
      }
      
      // 3. 管理员登录
      console.log('\n3️⃣ 管理员登录...');
      const adminLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });
      
      if (adminLoginResponse.data.success) {
        console.log('✅ 管理员登录成功');
        const adminPermissions = adminLoginResponse.data.data.user.permissions;
        console.log('   权限:', adminPermissions);
        
        // 4. 测试管理员权限
        console.log('\n4️⃣ 测试管理员权限...');
        
        if (adminPermissions.includes('VIEW_ALL_MERCHANTS')) {
          console.log('✅ 管理员有权限查看所有商户');
        } else {
          console.log('❌ 管理员没有权限查看所有商户');
        }
        
        if (adminPermissions.includes('MANAGE_USERS')) {
          console.log('✅ 管理员有权限管理用户');
        } else {
          console.log('❌ 管理员没有权限管理用户');
        }
        
        if (adminPermissions.includes('VIEW_PAYMENT_CONFIG')) {
          console.log('✅ 管理员有权限查看支付配置');
        } else {
          console.log('❌ 管理员没有权限查看支付配置');
        }
      }
      
    } else {
      console.log('❌ 商户登录失败:', merchantLoginResponse.data.error);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.response?.data?.error || error.message);
  }
  
  console.log('\n🏁 权限控制测试完成');
  console.log('\n📋 权限控制总结:');
  console.log('   - 商户用户: 只能看到自己的账户信息、交易记录');
  console.log('   - 管理员用户: 可以看到所有功能模块');
  console.log('   - 支付测试页面: 只有有支付配置权限的用户才能看到');
  console.log('   - 支付统计页面: 只有有交易权限的用户才能看到');
}

// 运行测试
testPermissionControl();
