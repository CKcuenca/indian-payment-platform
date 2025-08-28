const axios = require('axios');

// 测试商户视图渲染逻辑
async function testMerchantViewRendering() {
  console.log('🧪 测试商户视图渲染逻辑...\n');
  
  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. 商户登录
    console.log('1️⃣ 商户登录...');
    const merchantLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'test_merchant_001',
      password: 'merchant123'
    });
    
    if (merchantLoginResponse.data.success) {
      console.log('✅ 商户登录成功');
      const merchantToken = merchantLoginResponse.data.data.token;
      const merchantUser = merchantLoginResponse.data.data.user;
      console.log('   用户角色:', merchantUser.role);
      console.log('   用户权限:', merchantUser.permissions);
      console.log('   商户ID:', merchantUser.merchantId);
      
      // 2. 测试商户管理API
      console.log('\n2️⃣ 测试商户管理API...');
      
      try {
        const profileResponse = await axios.get(`${baseURL}/api/merchant-profile/profile`, {
          headers: {
            'Authorization': `Bearer ${merchantToken}`
          }
        });
        
        if (profileResponse.data.success) {
          console.log('✅ 商户管理API正常');
          const merchantData = profileResponse.data.data;
          console.log('   商户ID:', merchantData.merchantId);
          console.log('   商户名称:', merchantData.name);
          console.log('   状态:', merchantData.status);
          console.log('   默认支付商:', merchantData.defaultProvider);
          console.log('   充值费率:', merchantData.depositFee);
          console.log('   提现费率:', merchantData.withdrawalFee);
          console.log('   每日额度:', merchantData.limits?.dailyLimit);
          console.log('   每月额度:', merchantData.limits?.monthlyLimit);
          console.log('   单笔限额:', merchantData.limits?.singleTransactionLimit);
          
          // 3. 检查数据完整性
          console.log('\n3️⃣ 检查数据完整性...');
          
          const requiredFields = [
            'merchantId', 'name', 'status', 'defaultProvider',
            'depositFee', 'withdrawalFee', 'limits'
          ];
          
          const missingFields = requiredFields.filter(field => {
            if (field === 'limits') {
              return !merchantData.limits || !merchantData.limits.dailyLimit;
            }
            return merchantData[field] === undefined || merchantData[field] === null;
          });
          
          if (missingFields.length === 0) {
            console.log('✅ 所有必需字段都存在');
          } else {
            console.log('❌ 缺少以下字段:', missingFields);
          }
          
          // 4. 模拟前端渲染逻辑
          console.log('\n4️⃣ 模拟前端渲染逻辑...');
          
          const isMerchantView = merchantUser.role === 'merchant';
          const hasCurrentMerchant = merchantData && Object.keys(merchantData).length > 0;
          
          console.log('   isMerchantView:', isMerchantView);
          console.log('   hasCurrentMerchant:', hasCurrentMerchant);
          console.log('   渲染商户视图:', isMerchantView && hasCurrentMerchant);
          
          if (isMerchantView && hasCurrentMerchant) {
            console.log('✅ 应该显示商户视图（包含修改密码和生成API密钥按钮）');
          } else {
            console.log('❌ 不会显示商户视图');
            if (!isMerchantView) console.log('   原因: 用户角色不是merchant');
            if (!hasCurrentMerchant) console.log('   原因: 没有获取到商户数据');
          }
          
        } else {
          console.log('❌ 商户管理API异常:', profileResponse.data.error);
        }
        
      } catch (apiError) {
        console.log('❌ 商户管理API调用失败:', apiError.response?.data?.error || apiError.message);
      }
      
    } else {
      console.log('❌ 商户登录失败:', merchantLoginResponse.data.error);
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.response?.data?.error || error.message);
  }
  
  console.log('\n🏁 商户视图渲染逻辑测试完成');
  console.log('\n💡 如果测试显示应该渲染商户视图，但前端没有显示按钮，可能的原因:');
  console.log('   1. 前端代码没有重新编译');
  console.log('   2. 浏览器缓存问题');
  console.log('   3. 前端开发服务器没有重启');
  console.log('   4. 权限检查组件有问题');
}

// 运行测试
testMerchantViewRendering();
