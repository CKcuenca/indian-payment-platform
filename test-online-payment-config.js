const axios = require('axios');

// 线上API地址
const ONLINE_API_URL = 'https://cashgit.com/api';

async function testOnlinePaymentConfig() {
  console.log('=== 测试线上支付配置API ===\n');
  
  try {
    // 1. 测试支付配置列表API
    console.log('1. 测试获取支付配置列表...');
    console.log(`请求URL: ${ONLINE_API_URL}/payment-config`);
    
    const response = await axios.get(`${ONLINE_API_URL}/payment-config`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ 响应状态:', response.status);
    console.log('✅ 响应数据:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ 请求失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('状态文本:', error.response.statusText);
      console.error('响应头:', error.response.headers);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求错误:', error.request);
    } else {
      console.error('错误信息:', error.message);
    }
    console.error('完整错误:', error);
  }
}

// 运行测试
testOnlinePaymentConfig().catch(console.error);
