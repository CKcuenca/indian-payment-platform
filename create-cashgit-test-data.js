const mongoose = require('mongoose');

// MongoDB连接配置
const MONGODB_URI = 'mongodb://localhost:27017/payment-platform';

// 测试商户数据
const TEST_MERCHANT = {
  merchantId: 'MERCHANT_ME01UHM7',
  apiKey: 'pk_rzz8igydcme01uhm7',
  secretKey: 'sk_mxf9mdelh5me01uhm7',
  email: 'test@cashgit.com',
  companyName: 'CashGit测试商户',
  status: 'ACTIVE',
  createTime: new Date(),
  updateTime: new Date()
};

// 测试支付配置数据
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
  },
  createTime: new Date(),
  updateTime: new Date()
};

// 商户模型
const merchantSchema = new mongoose.Schema({
  merchantId: { type: String, required: true, unique: true },
  apiKey: { type: String, required: true, unique: true },
  secretKey: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

// 支付配置模型
const paymentConfigSchema = new mongoose.Schema({
  accountName: { type: String, required: true, unique: true },
  merchantId: { type: String, required: true, index: true },
  provider: {
    name: { type: String, required: true },
    accountId: { type: String, required: true },
    apiKey: { type: String, required: true },
    secretKey: { type: String, required: true },
    baseUrl: { type: String, required: true },
    mchNo: { type: String, required: true }
  },
  environment: { type: String, enum: ['DEVELOPMENT', 'PRODUCTION'], default: 'PRODUCTION' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  limits: {
    dailyLimit: { type: Number, default: 1000000 },
    monthlyLimit: { type: Number, default: 30000000 },
    singleTransactionLimit: { type: Number, default: 100000 },
    minTransactionAmount: { type: Number, default: 100 },
    maxTransactionAmount: { type: Number, default: 100000 }
  },
  createTime: { type: Date, default: Date.now },
  updateTime: { type: Date, default: Date.now }
});

// 创建模型
const Merchant = mongoose.model('Merchant', merchantSchema);
const PaymentConfig = mongoose.model('PaymentConfig', paymentConfigSchema);

// 创建测试商户
async function createTestMerchant() {
  try {
    console.log('🔧 创建测试商户...');
    
    // 检查是否已存在
    const existingMerchant = await Merchant.findOne({ merchantId: TEST_MERCHANT.merchantId });
    if (existingMerchant) {
      console.log('✅ 商户已存在，跳过创建');
      return existingMerchant;
    }
    
    // 创建新商户
    const merchant = new Merchant(TEST_MERCHANT);
    await merchant.save();
    
    console.log('✅ 测试商户创建成功:', merchant.merchantId);
    return merchant;
    
  } catch (error) {
    console.log('❌ 创建商户失败:', error.message);
    throw error;
  }
}

// 创建测试支付配置
async function createTestPaymentConfig() {
  try {
    console.log('🔧 创建测试支付配置...');
    
    // 检查是否已存在
    const existingConfig = await PaymentConfig.findOne({ 
      accountName: TEST_PAYMENT_CONFIG.accountName 
    });
    if (existingConfig) {
      console.log('✅ 支付配置已存在，跳过创建');
      return existingConfig;
    }
    
    // 创建新配置
    const config = new PaymentConfig(TEST_PAYMENT_CONFIG);
    await config.save();
    
    console.log('✅ 测试支付配置创建成功:', config.accountName);
    return config;
    
  } catch (error) {
    console.log('❌ 创建支付配置失败:', error.message);
    throw error;
  }
}

// 验证数据
async function verifyTestData() {
  try {
    console.log('\n🔍 验证测试数据...');
    
    // 检查商户
    const merchant = await Merchant.findOne({ merchantId: TEST_MERCHANT.merchantId });
    if (merchant) {
      console.log('✅ 商户验证成功:', merchant.merchantId, merchant.status);
    } else {
      console.log('❌ 商户验证失败: 未找到');
    }
    
    // 检查支付配置
    const config = await PaymentConfig.findOne({ 
      merchantId: TEST_MERCHANT.merchantId 
    });
    if (config) {
      console.log('✅ 支付配置验证成功:', config.accountName, config.status);
    } else {
      console.log('❌ 支付配置验证失败: 未找到');
    }
    
  } catch (error) {
    console.log('❌ 数据验证失败:', error.message);
  }
}

// 主函数
async function setupCashGitTestData() {
  console.log('🚀 开始设置CashGit线上测试数据...');
  console.log('🗄️ 数据库:', MONGODB_URI);
  console.log('👤 测试商户:', TEST_MERCHANT.merchantId);
  console.log('='.repeat(60));
  
  try {
    // 连接数据库
    console.log('🔌 连接MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    // 创建测试数据
    await createTestMerchant();
    await createTestPaymentConfig();
    
    // 验证数据
    await verifyTestData();
    
    console.log('\n🎉 测试数据设置完成！');
    console.log('='.repeat(60));
    console.log('🧪 现在可以运行完整API测试了');
    console.log('💡 运行: node test-cashgit-online.js');
    
  } catch (error) {
    console.error('\n💥 设置过程中发生错误:', error.message);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 MongoDB连接已关闭');
  }
}

// 运行设置
if (require.main === module) {
  setupCashGitTestData();
}

module.exports = {
  createTestMerchant,
  createTestPaymentConfig,
  verifyTestData
};

