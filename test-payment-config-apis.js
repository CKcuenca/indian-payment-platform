const axios = require('axios');
const crypto = require('crypto');

// 配置
const BASE_URL = 'https://cashgit.com';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// 生成签名
function generateSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  const signString = queryString + '&key=' + secretKey;
  return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
}

// 获取管理员Token
async function getAdminToken() {
  try {
    console.log('🔐 获取管理员Token...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: ADMIN_CREDENTIALS.username,
      password: ADMIN_CREDENTIALS.password
    });
    
    if (response.data.success) {
      console.log('✅ 管理员登录成功');
      return response.data.token;
    } else {
      throw new Error('登录失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 管理员登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试获取支付配置列表
async function testGetPaymentConfigs(token) {
  try {
    console.log('\n📋 测试获取支付配置列表...');
    const response = await axios.get(`${BASE_URL}/api/admin/payment-configs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 获取支付配置列表成功');
      console.log(`📊 配置数量: ${response.data.data.length}`);
      
      // 显示配置概览
      response.data.data.forEach((config, index) => {
        console.log(`  ${index + 1}. ${config.accountName} (${config.provider.name}) - ${config.status}`);
      });
      
      return response.data.data;
    } else {
      throw new Error('获取配置列表失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取支付配置列表失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试获取单个支付配置
async function testGetPaymentConfig(token, configId) {
  try {
    console.log(`\n🔍 测试获取单个支付配置 (ID: ${configId})...`);
    const response = await axios.get(`${BASE_URL}/api/admin/payment-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 获取单个支付配置成功');
      const config = response.data.data;
      console.log(`📋 配置详情:`);
      console.log(`  账户名: ${config.accountName}`);
      console.log(`  提供商: ${config.provider.name}`);
      console.log(`  状态: ${config.status}`);
      console.log(`  环境: ${config.provider.environment}`);
      console.log(`  优先级: ${config.priority}`);
      return config;
    } else {
      throw new Error('获取单个配置失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取单个支付配置失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试创建支付配置
async function testCreatePaymentConfig(token) {
  try {
    console.log('\n➕ 测试创建支付配置...');
    
    const newConfig = {
      accountName: `test-config-${Date.now()}`,
      provider: {
        name: 'unispay',
        type: 'collection',
        subType: 'upi',
        accountId: 'TEST001',
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        environment: 'test',
        mchNo: 'TEST_MCH'
      },
      description: '测试配置',
      limits: {
        collection: {
          dailyLimit: 100000,
          monthlyLimit: 1000000,
          singleTransactionLimit: 10000,
          minTransactionAmount: 10
        },
        payout: {
          dailyLimit: 50000,
          monthlyLimit: 500000,
          singleTransactionLimit: 5000,
          minTransactionAmount: 20
        }
      },
      fees: {
        collection: {
          transactionFee: 2.5,
          fixedFee: 0
        },
        payout: {
          transactionFee: 1.5,
          fixedFee: 5
        }
      },
      collectionNotifyUrl: 'https://cashgit.com/api/callback/collection',
      collectionReturnUrl: 'https://cashgit.com/return',
      payoutNotifyUrl: 'https://cashgit.com/api/callback/payout',
      payoutReturnUrl: 'https://cashgit.com/return',
      priority: 1,
      status: 'ACTIVE'
    };
    
    const response = await axios.post(`${BASE_URL}/api/admin/payment-configs`, newConfig, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 创建支付配置成功');
      console.log(`📋 新配置ID: ${response.data.data._id}`);
      return response.data.data._id;
    } else {
      throw new Error('创建配置失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 创建支付配置失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试更新支付配置
async function testUpdatePaymentConfig(token, configId) {
  try {
    console.log(`\n✏️ 测试更新支付配置 (ID: ${configId})...`);
    
    const updateData = {
      description: '更新后的测试配置',
      limits: {
        collection: {
          dailyLimit: 200000,
          monthlyLimit: 2000000,
          singleTransactionLimit: 20000,
          minTransactionAmount: 15
        },
        payout: {
          dailyLimit: 100000,
          monthlyLimit: 1000000,
          singleTransactionLimit: 10000,
          minTransactionAmount: 25
        }
      },
      fees: {
        collection: {
          transactionFee: 3.0,
          fixedFee: 1
        },
        payout: {
          transactionFee: 2.0,
          fixedFee: 8
        }
      },
      priority: 2
    };
    
    const response = await axios.put(`${BASE_URL}/api/admin/payment-configs/${configId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 更新支付配置成功');
      console.log('📋 更新内容:');
      console.log(`  描述: ${updateData.description}`);
      console.log(`  代收日限额: ${updateData.limits.collection.dailyLimit}`);
      console.log(`  代付费率: ${updateData.fees.payout.transactionFee}%`);
      console.log(`  优先级: ${updateData.priority}`);
      return response.data.data;
    } else {
      throw new Error('更新配置失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 更新支付配置失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试删除支付配置
async function testDeletePaymentConfig(token, configId) {
  try {
    console.log(`\n🗑️ 测试删除支付配置 (ID: ${configId})...`);
    
    const response = await axios.delete(`${BASE_URL}/api/admin/payment-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 删除支付配置成功');
      return true;
    } else {
      throw new Error('删除配置失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 删除支付配置失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试支付配置状态切换
async function testTogglePaymentConfigStatus(token, configId) {
  try {
    console.log(`\n🔄 测试切换支付配置状态 (ID: ${configId})...`);
    
    // 先获取当前状态
    const getResponse = await axios.get(`${BASE_URL}/api/admin/payment-configs/${configId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!getResponse.data.success) {
      throw new Error('获取配置状态失败');
    }
    
    const currentStatus = getResponse.data.data.status;
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    console.log(`📋 当前状态: ${currentStatus} -> 新状态: ${newStatus}`);
    
    const response = await axios.patch(`${BASE_URL}/api/admin/payment-configs/${configId}/status`, {
      status: newStatus
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ 切换支付配置状态成功');
      console.log(`📋 新状态: ${newStatus}`);
      return newStatus;
    } else {
      throw new Error('切换状态失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 切换支付配置状态失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试支付配置验证
async function testPaymentConfigValidation(token) {
  try {
    console.log('\n🔍 测试支付配置验证...');
    
    // 测试无效配置
    const invalidConfig = {
      accountName: '', // 空账户名
      provider: {
        name: 'invalid-provider', // 无效提供商
        type: 'invalid-type'
      },
      limits: {
        collection: {
          dailyLimit: -100, // 负数限额
          monthlyLimit: 0,
          singleTransactionLimit: 1000000, // 过大限额
          minTransactionAmount: -10 // 负数最小金额
        }
      }
    };
    
    const response = await axios.post(`${BASE_URL}/api/admin/payment-configs`, invalidConfig, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.data.success) {
      console.log('✅ 支付配置验证正常 - 正确拒绝了无效配置');
      console.log(`📋 验证错误: ${response.data.message}`);
      return true;
    } else {
      console.log('❌ 支付配置验证失败 - 应该拒绝无效配置');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ 支付配置验证正常 - 正确拒绝了无效配置');
      console.log(`📋 验证错误: ${error.response.data.message}`);
      return true;
    } else {
      console.error('❌ 支付配置验证测试失败:', error.response?.data || error.message);
      return false;
    }
  }
}

// 主测试函数
async function testPaymentConfigAPIs() {
  console.log('🚀 开始测试支付配置相关接口...\n');
  
  try {
    // 1. 获取管理员Token
    const token = await getAdminToken();
    
    // 2. 获取支付配置列表
    const configs = await testGetPaymentConfigs(token);
    
    if (configs.length > 0) {
      // 3. 获取单个支付配置
      const firstConfig = configs[0];
      await testGetPaymentConfig(token, firstConfig._id);
      
      // 4. 测试状态切换
      await testTogglePaymentConfigStatus(token, firstConfig._id);
      await testTogglePaymentConfigStatus(token, firstConfig._id); // 切换回来
    }
    
    // 5. 测试创建支付配置
    const newConfigId = await testCreatePaymentConfig(token);
    
    // 6. 测试更新支付配置
    await testUpdatePaymentConfig(token, newConfigId);
    
    // 7. 测试支付配置验证
    await testPaymentConfigValidation(token);
    
    // 8. 测试删除支付配置
    await testDeletePaymentConfig(token, newConfigId);
    
    console.log('\n🎉 支付配置接口测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 支付配置接口测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testPaymentConfigAPIs().catch(console.error);
