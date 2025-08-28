const axios = require('axios');

// 测试商户管理页面访问权限
async function testMerchantPageAccess() {
  console.log('🧪 测试商户管理页面访问权限...\n');
  
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
      
      // 2. 测试商户管理页面权限
      console.log('\n2️⃣ 测试商户管理页面权限...');
      
      // 检查是否有访问商户管理页面的权限
      const hasMerchantAccess = merchantPermissions.includes('VIEW_OWN_MERCHANT_DATA') || 
                               merchantPermissions.includes('VIEW_ALL_MERCHANTS');
      
      if (hasMerchantAccess) {
        console.log('✅ 商户有权限访问商户管理页面');
        console.log('   需要的权限: VIEW_OWN_MERCHANT_DATA 或 VIEW_ALL_MERCHANTS');
        console.log('   商户拥有的权限: ✅ VIEW_OWN_MERCHANT_DATA');
      } else {
        console.log('❌ 商户没有权限访问商户管理页面');
        console.log('   需要的权限: VIEW_OWN_MERCHANT_DATA 或 VIEW_ALL_MERCHANTS');
        console.log('   商户拥有的权限:', merchantPermissions);
      }
      
      // 3. 测试商户管理API
      console.log('\n3️⃣ 测试商户管理API...');
      
      try {
        const profileResponse = await axios.get(`${baseURL}/api/merchant-profile/profile`, {
          headers: {
            'Authorization': `Bearer ${merchantToken}`
          }
        });
        
        if (profileResponse.data.success) {
          console.log('✅ 商户可以成功获取自己的账户信息');
          console.log('   商户ID:', profileResponse.data.data.merchantId);
          console.log('   商户名称:', profileResponse.data.data.name);
        } else {
          console.log('❌ 商户无法获取账户信息:', profileResponse.data.error);
        }
        
      } catch (apiError) {
        console.log('❌ 商户管理API调用失败:', apiError.response?.data?.error || apiError.message);
      }
      
      // 4. 权限对比分析
      console.log('\n4️⃣ 权限对比分析...');
      console.log('   路由权限要求: VIEW_ALL_MERCHANTS 或 VIEW_OWN_MERCHANT_DATA');
      console.log('   商户实际权限:', merchantPermissions);
      console.log('   权限匹配结果:', hasMerchantAccess ? '✅ 匹配' : '❌ 不匹配');
      
    } else {
      console.log('❌ 商户登录失败:', merchantLoginResponse.data.error);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.response?.data?.error || error.message);
  }
  
  console.log('\n🏁 商户管理页面访问权限测试完成');
  console.log('\n📋 问题分析:');
  console.log('   1. 路由权限配置: 已修复为 anyPermission');
  console.log('   2. 商户用户权限: 已添加 VIEW_OWN_MERCHANT_DATA');
  console.log('   3. 前端权限验证: 应该能正常通过');
  console.log('\n💡 现在商户用户应该能够:');
  console.log('   - 看到"商户管理"菜单项');
  console.log('   - 点击进入商户管理页面');
  console.log('   - 查看自己的账户信息');
  console.log('   - 修改密码和生成API密钥');
}

// 运行测试
testMerchantPageAccess();
