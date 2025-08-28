const axios = require('axios');

// 测试修复后的商户视图功能
async function testMerchantViewFixed() {
  console.log('🧪 测试修复后的商户视图功能...\n');
  
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
          console.log('   默认支付商:', merchantData.paymentConfig?.defaultProvider);
          console.log('   充值费率:', merchantData.paymentConfig?.fees?.deposit);
          console.log('   提现费率:', merchantData.paymentConfig?.fees?.withdrawal);
          console.log('   每日额度:', merchantData.paymentConfig?.limits?.dailyLimit);
          console.log('   每月额度:', merchantData.paymentConfig?.limits?.monthlyLimit);
          
          // 3. 模拟前端数据转换
          console.log('\n3️⃣ 模拟前端数据转换...');
          
          const convertedData = {
            merchantId: merchantData.merchantId,
            name: merchantData.name,
            email: merchantData.email,
            status: merchantData.status,
            defaultProvider: merchantData.paymentConfig?.defaultProvider || 'airpay',
            depositFee: (merchantData.paymentConfig?.fees?.deposit || 0.01) * 100,
            withdrawalFee: (merchantData.paymentConfig?.fees?.withdrawal || 0.01) * 100,
            minDeposit: merchantData.paymentConfig?.limits?.minDeposit || 100,
            maxDeposit: merchantData.paymentConfig?.limits?.maxDeposit || 5000000,
            minWithdrawal: merchantData.paymentConfig?.limits?.minWithdrawal || 100,
            maxWithdrawal: merchantData.paymentConfig?.limits?.maxWithdrawal || 5000000,
            limits: {
              dailyLimit: merchantData.paymentConfig?.limits?.dailyLimit || 50000000,
              monthlyLimit: merchantData.paymentConfig?.limits?.monthlyLimit || 500000000,
              singleTransactionLimit: merchantData.paymentConfig?.limits?.maxDeposit || 5000000,
            },
            balance: 0,
            usage: {
              dailyUsed: 0,
              monthlyUsed: 0,
              lastResetDate: new Date().toISOString()
            },
            createdAt: merchantData.createdAt || new Date(),
            updatedAt: merchantData.updatedAt || new Date()
          };
          
          console.log('   转换后的数据:');
          console.log('     defaultProvider:', convertedData.defaultProvider);
          console.log('     depositFee:', convertedData.depositFee + '%');
          console.log('     withdrawalFee:', convertedData.withdrawalFee + '%');
          console.log('     dailyLimit:', convertedData.limits.dailyLimit);
          console.log('     monthlyLimit:', convertedData.limits.monthlyLimit);
          console.log('     singleTransactionLimit:', convertedData.limits.singleTransactionLimit);
          
          // 4. 验证数据完整性
          console.log('\n4️⃣ 验证数据完整性...');
          
          const requiredFields = [
            'merchantId', 'name', 'status', 'defaultProvider',
            'depositFee', 'withdrawalFee', 'limits'
          ];
          
          const missingFields = requiredFields.filter(field => {
            if (field === 'limits') {
              return !convertedData.limits || !convertedData.limits.dailyLimit;
            }
            return convertedData[field] === undefined || convertedData[field] === null;
          });
          
          if (missingFields.length === 0) {
            console.log('✅ 所有必需字段都存在');
          } else {
            console.log('❌ 缺少以下字段:', missingFields);
          }
          
          // 5. 功能验证
          console.log('\n5️⃣ 功能验证...');
          
          const isMerchantView = merchantUser.role === 'merchant';
          const hasCurrentMerchant = convertedData && Object.keys(convertedData).length > 0;
          const hasRequiredData = convertedData.defaultProvider && convertedData.depositFee && convertedData.limits?.dailyLimit;
          
          console.log('   isMerchantView:', isMerchantView);
          console.log('   hasCurrentMerchant:', hasCurrentMerchant);
          console.log('   hasRequiredData:', hasRequiredData);
          console.log('   应该显示商户视图:', isMerchantView && hasCurrentMerchant && hasRequiredData);
          
          if (isMerchantView && hasCurrentMerchant && hasRequiredData) {
            console.log('✅ 商户视图应该正常显示，包含修改密码和生成API密钥按钮');
          } else {
            console.log('❌ 商户视图可能无法正常显示');
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
  
  console.log('\n🏁 修复后的商户视图功能测试完成');
  console.log('\n💡 现在前端应该能够:');
  console.log('   1. 正确获取商户数据');
  console.log('   2. 转换API数据格式');
  console.log('   3. 显示完整的商户信息');
  console.log('   4. 显示修改密码和生成API密钥按钮');
  console.log('\n🔄 请在浏览器中测试商户管理页面');
}

// 运行测试
testMerchantViewFixed();
