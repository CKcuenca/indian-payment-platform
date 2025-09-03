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

// 测试获取支付配置列表 (使用商户认证)
async function testGetPaymentConfigs() {
  try {
    console.log('📋 测试获取支付配置列表...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/payment-config`, {
      params: params
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
async function testGetPaymentConfig(configId) {
  try {
    console.log(`\n🔍 测试获取单个支付配置 (ID: ${configId})...`);
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString(),
      configId: configId
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/payment-config/${configId}`, {
      params: params
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

// 测试支付配置状态查询
async function testPaymentConfigStatus() {
  try {
    console.log('\n📊 测试支付配置状态查询...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/payment-config/status`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 支付配置状态查询成功');
      console.log('📋 状态概览:');
      
      const status = response.data.data;
      console.log(`  总配置数: ${status.total}`);
      console.log(`  活跃配置: ${status.active}`);
      console.log(`  非活跃配置: ${status.inactive}`);
      
      if (status.providers) {
        console.log('  提供商分布:');
        Object.entries(status.providers).forEach(([provider, count]) => {
          console.log(`    ${provider}: ${count}个`);
        });
      }
      
      return status;
    } else {
      throw new Error('状态查询失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 支付配置状态查询失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试支付配置验证
async function testPaymentConfigValidation() {
  try {
    console.log('\n🔍 测试支付配置验证...');
    
    // 测试获取配置列表来验证接口是否正常
    const configs = await testGetPaymentConfigs();
    
    if (configs.length > 0) {
      console.log('✅ 支付配置验证通过 - 接口正常响应');
      
      // 测试获取第一个配置的详细信息
      const firstConfig = configs[0];
      await testGetPaymentConfig(firstConfig._id);
      
      return true;
    } else {
      console.log('⚠️ 支付配置验证 - 没有找到配置');
      return false;
    }
  } catch (error) {
    console.error('❌ 支付配置验证失败:', error.message);
    return false;
  }
}

// 测试支付配置统计信息
async function testPaymentConfigStats() {
  try {
    console.log('\n📈 测试支付配置统计信息...');
    
    const params = {
      appid: MERCHANT_INFO.merchantId,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, MERCHANT_INFO.secretKey);
    
    const response = await axios.get(`${BASE_URL}/api/payment-config/stats`, {
      params: params
    });
    
    if (response.data.success) {
      console.log('✅ 支付配置统计信息获取成功');
      console.log('📋 统计信息:');
      
      const stats = response.data.data;
      console.log(`  总配置数: ${stats.totalConfigs}`);
      console.log(`  活跃配置: ${stats.activeConfigs}`);
      console.log(`  今日新增: ${stats.todayAdded}`);
      console.log(`  本周新增: ${stats.weekAdded}`);
      
      if (stats.providerStats) {
        console.log('  提供商统计:');
        stats.providerStats.forEach(stat => {
          console.log(`    ${stat.provider}: ${stat.count}个配置`);
        });
      }
      
      return stats;
    } else {
      throw new Error('统计信息获取失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 支付配置统计信息获取失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主测试函数
async function testPaymentConfigOnline() {
  console.log('🚀 开始测试线上支付配置接口...\n');
  
  try {
    // 1. 测试获取支付配置列表
    const configs = await testGetPaymentConfigs();
    
    // 2. 测试支付配置状态查询
    await testPaymentConfigStatus();
    
    // 3. 测试支付配置统计信息
    await testPaymentConfigStats();
    
    // 4. 测试支付配置验证
    await testPaymentConfigValidation();
    
    console.log('\n🎉 支付配置接口测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 支付配置接口测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testPaymentConfigOnline().catch(console.error);
