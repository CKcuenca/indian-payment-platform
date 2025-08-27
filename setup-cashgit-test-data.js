const axios = require('axios');

// 线上API配置
const CASHGIT_API = 'https://cashgit.com';

// 测试商户信息
const TEST_MERCHANT = {
  merchantId: 'MERCHANT_ME01UHM7',
  apiKey: 'pk_rzz8igydcme01uhm7',
  secretKey: 'sk_mxf9mdelh5me01uhm7',
  email: 'test@cashgit.com',
  companyName: 'CashGit测试商户',
  status: 'ACTIVE'
};

// 测试支付配置
const TEST_PAYMENT_CONFIG = {
  accountName: 'cashgit_test_account_001',
  merchantId: 'MERCHANT_ME01UHM7',
  provider: {
    name: 'unispay',
    accountId: 'cashgit_unispay_001',
    apiKey: 'cashgit_test_api_key',
    secretKey: 'cashgit_test_secret_key',
    baseUrl: 'https://api.unispay.com',
    mchNo: 'CASHGIT001'
  },
  environment: 'PRODUCTION',
  status: 'ACTIVE',
  limits: {
    dailyLimit: 1000000,
    monthlyLimit: 30000000,
    singleTransactionLimit: 100000,
    minTransactionAmount: 100,
    maxTransactionAmount: 100000
  }
};

// 生成MD5签名
function generateSignature(params, secretKey) {
  const crypto = require('crypto');
  
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&') + secretKey;
  
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex');
}

// 创建测试商户
async function createTestMerchant() {
  console.log('🔧 创建测试商户...');
  
  try {
    const params = {
      merchantId: TEST_MERCHANT.merchantId,
      apiKey: TEST_MERCHANT.apiKey,
      secretKey: TEST_MERCHANT.secretKey,
      email: TEST_MERCHANT.email,
      companyName: TEST_MERCHANT.companyName,
      status: TEST_MERCHANT.status,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${CASHGIT_API}/api/admin/merchant/create`, params, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('✅ 商户创建成功:', response.status);
    return true;
    
  } catch (error) {
    console.log('❌ 商户创建失败:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('💡 提示: 管理接口可能不存在，需要手动创建商户');
    }
    return false;
  }
}

// 创建测试支付配置
async function createTestPaymentConfig() {
  console.log('🔧 创建测试支付配置...');
  
  try {
    const params = {
      accountName: TEST_PAYMENT_CONFIG.accountName,
      merchantId: TEST_PAYMENT_CONFIG.merchantId,
      provider: TEST_PAYMENT_CONFIG.provider,
      environment: TEST_PAYMENT_CONFIG.environment,
      status: TEST_PAYMENT_CONFIG.status,
      limits: TEST_PAYMENT_CONFIG.limits,
      timestamp: Date.now().toString()
    };
    
    params.sign = generateSignature(params, TEST_MERCHANT.secretKey);
    
    const response = await axios.post(`${CASHGIT_API}/api/admin/payment-config/create`, params, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('✅ 支付配置创建成功:', response.status);
    return true;
    
  } catch (error) {
    console.log('❌ 支付配置创建失败:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('💡 提示: 管理接口可能不存在，需要手动创建配置');
    }
    return false;
  }
}

// 测试现有接口
async function testExistingAPIs() {
  console.log('\n🧪 测试现有接口...');
  
  try {
    // 测试余额查询
    const balanceParams = {
      appid: TEST_MERCHANT.merchantId,
      timestamp: Date.now().toString()
    };
    balanceParams.sign = generateSignature(balanceParams, TEST_MERCHANT.secretKey);
    
    const balanceResponse = await axios.post(`${CASHGIT_API}/api/balance/query`, balanceParams, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_MERCHANT.apiKey
      },
      timeout: 15000
    });
    
    console.log('✅ 余额查询成功:', balanceResponse.status);
    console.log('📊 响应数据:', JSON.stringify(balanceResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ 接口测试失败:', error.response?.data || error.message);
  }
}

// 主函数
async function setupCashGitTestData() {
  console.log('🚀 开始设置CashGit线上测试数据...');
  console.log('🌐 线上地址:', CASHGIT_API);
  console.log('👤 测试商户:', TEST_MERCHANT.merchantId);
  console.log('='.repeat(60));
  
  try {
    // 1. 尝试创建测试商户
    const merchantCreated = await createTestMerchant();
    
    // 2. 尝试创建支付配置
    const configCreated = await createTestPaymentConfig();
    
    // 3. 测试现有接口
    await testExistingAPIs();
    
    console.log('\n🎉 测试数据设置完成！');
    console.log('='.repeat(60));
    
    if (merchantCreated && configCreated) {
      console.log('✅ 所有测试数据创建成功');
      console.log('🧪 现在可以运行完整API测试了');
    } else {
      console.log('⚠️ 部分测试数据创建失败');
      console.log('💡 建议: 手动在线上数据库创建测试数据');
    }
    
  } catch (error) {
    console.error('\n💥 设置过程中发生错误:', error.message);
  }
}

// 运行设置
if (require.main === module) {
  setupCashGitTestData();
}

module.exports = {
  createTestMerchant,
  createTestPaymentConfig,
  testExistingAPIs
};
