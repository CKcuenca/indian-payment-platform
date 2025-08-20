const axios = require('axios');

async function debugCashGit() {
  try {
    console.log('=== 调试CashGit API ===');
    
    // 测试健康检查
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('健康检查:', healthResponse.data);
    
    // 测试简单的POST请求
    const testResponse = await axios.post('http://localhost:3000/api/pay', {
      appid: 'test_merchant_001',
      orderid: 'debug_test_001',
      amount: '100.00',
      desc: '调试测试',
      sign: 'test_sign'
    });
    
    console.log('测试响应:', testResponse.data);
  } catch (error) {
    console.error('调试错误:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('状态码:', error.response.status);
    }
  }
}

debugCashGit();
