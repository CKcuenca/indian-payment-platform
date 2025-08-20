const axios = require('axios');

// 测试配置
const config = {
  baseURL: 'http://localhost:3000/api',
  apiKey: 'pk_rzz8igydcme01uhm7',
  merchantId: 'MERCHANT_ME01UHM7'
};

// 创建axios实例
const api = axios.create({
  baseURL: config.baseURL,
  headers: {
    'X-API-Key': config.apiKey,
    'Content-Type': 'application/json'
  }
});

// 测试函数
async function testMockAPI() {
  console.log('开始模拟API测试...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('健康检查结果:', healthResponse.data);
    console.log('');

    // 2. 测试获取商户信息
    console.log('2. 测试获取商户信息');
    const merchantResponse = await api.get('/merchant/info');
    console.log('商户信息:', merchantResponse.data);
    console.log('');

    // 3. 测试创建充值订单（使用mock提供者）
    console.log('3. 测试创建充值订单（Mock）');
    const createPaymentData = {
      merchantId: config.merchantId,
      amount: 10000, // 100元
      currency: 'INR',
      customerEmail: 'test@example.com',
      customerPhone: '919876543210',
      returnUrl: 'https://example.com/return',
      notifyUrl: 'https://example.com/notify',
      provider: 'mock', // 使用mock提供者
      description: 'Test deposit with mock provider'
    };

    const paymentResponse = await api.post('/payment/create', createPaymentData);
    console.log('创建充值订单结果:', paymentResponse.data);
    
    const orderId = paymentResponse.data.data.orderId;
    console.log('订单ID:', orderId);
    console.log('');

    // 4. 测试查询订单状态
    console.log('4. 测试查询订单状态');
    const statusResponse = await api.get(`/payment/status/${orderId}?merchantId=${config.merchantId}`);
    console.log('查询订单状态结果:', statusResponse.data);
    console.log('');

    // 5. 测试获取交易历史
    console.log('5. 测试获取交易历史');
    const transactionsResponse = await api.get('/merchant/transactions?page=1&limit=5');
    console.log('交易历史结果:', transactionsResponse.data);
    console.log('');

    console.log('所有测试完成！');

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
if (require.main === module) {
  testMockAPI();
}

module.exports = { testMockAPI };
