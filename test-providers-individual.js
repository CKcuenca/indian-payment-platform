const https = require('https');
const crypto = require('crypto');

// 配置
const BASE_URL = 'https://cashgit.com';
const MERCHANT_ID = 'MERCHANT_MEWZV8HV';
const MERCHANT_SECRET_KEY = 'sk_wdvi3j7hy7mewzv8hv';

// 签名生成函数
function generateSignature(params, secretKey) {
  const sortedParams = {};
  const keys = Object.keys(params).sort();
  
  keys.forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '' && key !== 'sign') {
      sortedParams[key] = params[key];
    }
  });
  
  const sourceString = Object.keys(sortedParams).map(key => `${key}=${sortedParams[key]}`).join('&');
  const finalString = sourceString + secretKey;
  const signature = crypto.createHash('md5').update(finalString, 'utf8').digest('hex');
  
  return signature;
}

// HTTP请求函数
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'cashgit.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CashGit-Test-Client/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 测试代收订单创建
async function testCollectionOrder(providerName) {
  console.log(`\n🧪 测试 ${providerName} 代收订单创建`);
  console.log('============================================================');
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const orderId = `TEST_${providerName.toUpperCase()}_${timestamp}`;
    
    const params = {
      appid: MERCHANT_ID,
      mchOrderId: orderId,
      amount: '500.00',
      currency: 'INR',
      payType: 'UPI',
      notifyUrl: 'https://webhook.site/test',
      timestamp: timestamp
    };
    
    const sign = generateSignature(params, MERCHANT_SECRET_KEY);
    const requestData = { ...params, sign };
    
    console.log('📤 发送订单数据:', requestData);
    
    const response = await makeRequest('/api/order/create', 'POST', requestData);
    
    if (response.status === 200 && response.data.code === 200) {
      console.log('✅ 代收订单创建成功');
      console.log('📊 响应数据:', response.data);
      return { success: true, orderId: orderId, data: response.data.data };
    } else {
      console.log('❌ 代收订单创建失败:', response.data);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log('❌ 代收订单创建错误:', error.message);
    return { success: false, error: error.message };
  }
}

// 测试代付订单创建
async function testPayoutOrder(providerName) {
  console.log(`\n🧪 测试 ${providerName} 代付订单创建`);
  console.log('============================================================');
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const orderId = `TEST_${providerName.toUpperCase()}_PAYOUT_${timestamp}`;
    
    const params = {
      appid: MERCHANT_ID,
      mchOrderId: orderId,
      amount: '1000.00',
      currency: 'INR',
      bankCode: 'SBIN',
      accountNumber: '1234567890',
      ifscCode: 'SBIN0001234',
      accountName: 'Test Beneficiary',
      transferMode: 'IMPS',
      remark: `Test ${providerName} Payout Order`,
      timestamp: timestamp
    };
    
    const sign = generateSignature(params, MERCHANT_SECRET_KEY);
    const requestData = { ...params, sign };
    
    console.log('📤 发送代付数据:', requestData);
    
    const response = await makeRequest('/api/payout/create', 'POST', requestData);
    
    if (response.status === 200 && response.data.code === 200) {
      console.log('✅ 代付订单创建成功');
      console.log('📊 响应数据:', response.data);
      return { success: true, orderId: orderId, data: response.data.data };
    } else {
      console.log('❌ 代付订单创建失败:', response.data);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log('❌ 代付订单创建错误:', error.message);
    return { success: false, error: error.message };
  }
}

// 主测试函数
async function testProviders() {
  console.log('🚀 开始测试各个支付提供商...');
  console.log('🌐 测试目标:', BASE_URL);
  console.log('🏪 商户ID:', MERCHANT_ID);
  console.log('⏰ 开始时间:', new Date().toLocaleString('zh-CN'));
  
  const results = {
    unispay: {
      collection: false,
      payout: false
    },
    dhpay: {
      collection: false,
      payout: false
    }
  };
  
  // 测试UnisPay
  console.log('\n🔵 测试 UnisPay 提供商');
  console.log('============================================================');
  
  const unispayCollection = await testCollectionOrder('unispay');
  if (unispayCollection.success) {
    results.unispay.collection = true;
  }
  
  const unispayPayout = await testPayoutOrder('unispay');
  if (unispayPayout.success) {
    results.unispay.payout = true;
  }
  
  // 测试DhPay
  console.log('\n🟢 测试 DhPay 提供商');
  console.log('============================================================');
  
  const dhpayCollection = await testCollectionOrder('dhpay');
  if (dhpayCollection.success) {
    results.dhpay.collection = true;
  }
  
  const dhpayPayout = await testPayoutOrder('dhpay');
  if (dhpayPayout.success) {
    results.dhpay.payout = true;
  }
  
  // 汇总结果
  console.log('\n================================================================================');
  console.log('📊 支付提供商测试结果汇总');
  console.log('================================================================================');
  
  console.log('\n🔵 UnisPay 测试结果:');
  console.log('  代收功能:', results.unispay.collection ? '✅ 正常' : '❌ 异常');
  console.log('  代付功能:', results.unispay.payout ? '✅ 正常' : '❌ 异常');
  
  console.log('\n🟢 DhPay 测试结果:');
  console.log('  代收功能:', results.dhpay.collection ? '✅ 正常' : '❌ 异常');
  console.log('  代付功能:', results.dhpay.payout ? '✅ 正常' : '❌ 异常');
  
  console.log('\n⏰ 结束时间:', new Date().toLocaleString('zh-CN'));
  
  // 总结
  const totalTests = 4;
  const passedTests = Object.values(results).reduce((sum, provider) => 
    sum + (provider.collection ? 1 : 0) + (provider.payout ? 1 : 0), 0);
  const successRate = ((passedTests / totalTests) * 100).toFixed(2);
  
  console.log(`\n📈 总体成功率: ${successRate}% (${passedTests}/${totalTests})`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有支付提供商功能正常！');
  } else {
    console.log('\n⚠️ 部分支付提供商功能异常，请检查上述错误信息。');
  }
}

// 运行测试
testProviders().catch(console.error);
