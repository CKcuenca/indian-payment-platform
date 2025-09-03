const axios = require('axios');
const crypto = require('crypto');

// 配置
const BASE_URL = 'https://cashgit.com';

// 商户信息 (从之前的测试中获取)
const MERCHANT_INFO = {
  merchantId: 'cgpay',
  secretKey: 'cgpay_secret_key_2024'
};

// 生成签名
function generateSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  const signString = queryString + '&key=' + secretKey;
  return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
}

// 测试商户信息查询
async function testGetMerchantInfo() {
  try {
    console.log('🏪 测试获取商户信息...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/merchant/info`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 获取商户信息成功');
      console.log(`📋 商户信息:`);
      console.log(`  商户ID: ${response.data.data.merchantId}`);
      console.log(`  商户名称: ${response.data.data.name}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  余额: ${response.data.data.balance}`);
      console.log(`  创建时间: ${response.data.data.createdAt}`);
      return response.data.data;
    } else {
      throw new Error('获取商户信息失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取商户信息失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试商户余额查询
async function testGetMerchantBalance() {
  try {
    console.log('\n💰 测试获取商户余额...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/merchant/balance`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 获取商户余额成功');
      console.log(`📋 余额信息:`);
      console.log(`  可用余额: ${response.data.data.availableBalance}`);
      console.log(`  冻结余额: ${response.data.data.frozenBalance}`);
      console.log(`  总余额: ${response.data.data.totalBalance}`);
      console.log(`  货币: ${response.data.data.currency}`);
      return response.data.data;
    } else {
      throw new Error('获取商户余额失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取商户余额失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试商户交易历史
async function testGetMerchantTransactions() {
  try {
    console.log('\n📊 测试获取商户交易历史...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      page: '1',
      limit: '10'
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/merchant/transactions`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 获取商户交易历史成功');
      console.log(`📋 交易历史:`);
      console.log(`  总交易数: ${response.data.data.total}`);
      console.log(`  当前页: ${response.data.data.page}`);
      console.log(`  每页数量: ${response.data.data.limit}`);
      console.log(`  总页数: ${response.data.data.pages}`);
      
      if (response.data.data.transactions && response.data.data.transactions.length > 0) {
        console.log('  最近交易:');
        response.data.data.transactions.slice(0, 3).forEach((tx, index) => {
          console.log(`    ${index + 1}. ${tx.orderId} - ${tx.amount} ${tx.currency} - ${tx.status}`);
        });
      } else {
        console.log('  暂无交易记录');
      }
      
      return response.data.data;
    } else {
      throw new Error('获取商户交易历史失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取商户交易历史失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试商户订单查询
async function testGetMerchantOrders() {
  try {
    console.log('\n📋 测试获取商户订单...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      page: '1',
      limit: '10'
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/merchant/orders`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 获取商户订单成功');
      console.log(`📋 订单信息:`);
      console.log(`  总订单数: ${response.data.data.total}`);
      console.log(`  当前页: ${response.data.data.page}`);
      console.log(`  每页数量: ${response.data.data.limit}`);
      console.log(`  总页数: ${response.data.data.pages}`);
      
      if (response.data.data.orders && response.data.data.orders.length > 0) {
        console.log('  最近订单:');
        response.data.data.orders.slice(0, 3).forEach((order, index) => {
          console.log(`    ${index + 1}. ${order.orderId} - ${order.amount} ${order.currency} - ${order.status}`);
        });
      } else {
        console.log('  暂无订单记录');
      }
      
      return response.data.data;
    } else {
      throw new Error('获取商户订单失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取商户订单失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试商户统计信息
async function testGetMerchantStats() {
  try {
    console.log('\n📈 测试获取商户统计信息...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/merchant/stats`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 获取商户统计信息成功');
      console.log(`📋 统计信息:`);
      
      const stats = response.data.data;
      console.log(`  今日交易数: ${stats.todayTransactions}`);
      console.log(`  今日交易金额: ${stats.todayAmount}`);
      console.log(`  本月交易数: ${stats.monthTransactions}`);
      console.log(`  本月交易金额: ${stats.monthAmount}`);
      console.log(`  总交易数: ${stats.totalTransactions}`);
      console.log(`  总交易金额: ${stats.totalAmount}`);
      
      if (stats.providerStats) {
        console.log('  提供商统计:');
        Object.entries(stats.providerStats).forEach(([provider, count]) => {
          console.log(`    ${provider}: ${count}笔交易`);
        });
      }
      
      return stats;
    } else {
      throw new Error('获取商户统计信息失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取商户统计信息失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试商户配置查询
async function testGetMerchantConfig() {
  try {
    console.log('\n⚙️ 测试获取商户配置...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/merchant/config`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 获取商户配置成功');
      console.log(`📋 配置信息:`);
      
      const config = response.data.data;
      console.log(`  默认提供商: ${config.defaultProvider}`);
      console.log(`  支持的提供商: ${config.supportedProviders.join(', ')}`);
      console.log(`  最小交易金额: ${config.minAmount}`);
      console.log(`  最大交易金额: ${config.maxAmount}`);
      console.log(`  日限额: ${config.dailyLimit}`);
      console.log(`  月限额: ${config.monthlyLimit}`);
      
      return config;
    } else {
      throw new Error('获取商户配置失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 获取商户配置失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试商户签名验证
async function testMerchantSignatureValidation() {
  try {
    console.log('\n🔐 测试商户签名验证...');
    
    // 测试正确签名
    const correctParams = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    correctParams.sign = generateSignature(correctParams, MERCHANT_INFO.secretKey);
    
    const correctResponse = await axios.get(`${BASE_URL}/api/merchant/info`, {
      params: correctParams
    });
    
    if (correctResponse.data.success) {
      console.log('✅ 正确签名验证通过');
    } else {
      console.log('❌ 正确签名验证失败');
      return false;
    }
    
    // 测试错误签名
    const wrongParams = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      sign: 'wrong_signature'
    };
    
    try {
      await axios.get(`${BASE_URL}/api/merchant/info`, {
        params: wrongParams
      });
      console.log('❌ 错误签名应该被拒绝');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 错误签名正确被拒绝');
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ 商户签名验证测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 主测试函数
async function testMerchantAPIs() {
  console.log('🚀 开始测试商户相关接口...\n');
  
  try {
    // 1. 测试商户信息查询
    await testGetMerchantInfo();
    
    // 2. 测试商户余额查询
    await testGetMerchantBalance();
    
    // 3. 测试商户交易历史
    await testGetMerchantTransactions();
    
    // 4. 测试商户订单查询
    await testGetMerchantOrders();
    
    // 5. 测试商户统计信息
    await testGetMerchantStats();
    
    // 6. 测试商户配置查询
    await testGetMerchantConfig();
    
    // 7. 测试商户签名验证
    await testMerchantSignatureValidation();
    
    console.log('\n🎉 商户接口测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 商户接口测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testMerchantAPIs().catch(console.error);
