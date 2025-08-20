const axios = require('axios');
const SignatureUtil = require('./server/utils/signature');

const BASE_URL = 'http://localhost:3000/api';

// 测试商户信息
const testMerchant = {
  appid: 'test_merchant_001',
  secretKey: 'test_secret_key_123'
};

// 生成签名
function generateSignedParams(params, secretKey) {
  const signature = SignatureUtil.generateMD5Signature(params, secretKey);
  return { ...params, sign: signature };
}

// 测试退款
async function testRefund() {
  console.log('=== 测试CashGit退款功能 ===');
  
  // 先创建一个订单
  const createParams = {
    appid: testMerchant.appid,
    orderid: `refund_test_${Date.now()}`,
    amount: '200.00',
    desc: '退款测试订单',
    notify_url: 'http://example.com/notify',
    return_url: 'http://example.com/return'
  };
  
  const signedCreateParams = generateSignedParams(createParams, testMerchant.secretKey);
  
  try {
    // 创建订单
    const createResponse = await axios.post(`${BASE_URL}/pay`, signedCreateParams);
    console.log('创建订单响应:', createResponse.data);
    
    if (createResponse.data.code === 200) {
      const orderid = createResponse.data.data.orderid;
      
      // 测试退款
      const refundParams = {
        appid: testMerchant.appid,
        orderid: orderid,
        amount: '100.00',
        desc: '部分退款'
      };
      
      const signedRefundParams = generateSignedParams(refundParams, testMerchant.secretKey);
      
      const refundResponse = await axios.post(`${BASE_URL}/refund`, signedRefundParams);
      console.log('退款响应:', refundResponse.data);
    }
  } catch (error) {
    console.error('退款测试失败:', error.response?.data || error.message);
  }
}

testRefund();
