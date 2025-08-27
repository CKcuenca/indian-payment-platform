const UnispayProvider = require('./server/services/payment-providers/unispay-provider');

// 测试配置
const testConfig = {
  accountId: 'test_account',
  apiKey: 'test_api_key',
  secretKey: 'test_secret_key',
  environment: 'sandbox'
};

// 模拟网络请求
class MockUnispayProvider extends UnispayProvider {
  async makeRequest(endpoint, params) {
    console.log(`🔍 模拟请求到: ${endpoint}`);
    console.log('📋 请求参数:', JSON.stringify(params, null, 2));
    
    // 模拟成功响应
    return {
      code: 200,
      data: {
        orderId: 'MOCK_ORDER_001',
        status: 'PROCESSING'
      }
    };
  }
}

async function testUnispayProvider() {
  try {
    console.log('🔍 测试UNISPAY提供商（模拟网络）...\n');
    
    const provider = new MockUnispayProvider(testConfig);
    
    // 测试创建出款订单
    console.log('📝 测试创建出款订单...');
    const orderData = {
      orderId: 'TEST_ORDER_001',
      amount: 500,
      currency: 'INR',
      bankCode: 'HDFC',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      accountName: 'Test User',
      transferMode: 'IMPS',
      remark: '测试提现'
    };
    
    console.log('📋 订单数据:', JSON.stringify(orderData, null, 2));
    
    const result = await provider.createPayoutOrder(orderData);
    console.log('✅ 结果:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testUnispayProvider();
}
