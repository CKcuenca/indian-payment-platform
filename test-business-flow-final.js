const https = require('https');
const crypto = require('crypto');

// 配置
const BASE_URL = 'https://cashgit.com';
const MERCHANT_ID = 'MERCHANT_MEWZV8HV';
const MERCHANT_SECRET_KEY = 'sk_wdvi3j7hy7mewzv8hv';

// 签名生成函数 - 使用服务器端相同的逻辑
function generateSignature(params, secretKey) {
  // 1. 参数按ASCII码从小到大排序
  const sortedParams = {};
  const keys = Object.keys(params).sort();
  
  keys.forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '' && key !== 'sign') {
      sortedParams[key] = params[key];
    }
  });
  
  // 2. 按 key=value&key=value... 格式拼接参数签名源串
  const sourceString = Object.keys(sortedParams).map(key => `${key}=${sortedParams[key]}`).join('&');
  
  // 3. 拼接好的源串最后拼接上 secret key
  const finalString = sourceString + secretKey;
  
  // 4. 计算最终拼接好签名源串的MD5散列值
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

// 测试函数
async function testHealthCheck() {
  console.log('🧪 测试: 健康检查');
  console.log('============================================================');
  
  try {
    const response = await makeRequest('/api/health');
    if (response.status === 200) {
      console.log('✅ 健康检查 - 通过');
      console.log('📊 响应数据:', response.data);
      return true;
    } else {
      console.log('❌ 健康检查 - 失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ 健康检查 - 错误:', error.message);
    return false;
  }
}

async function testProviderStatus() {
  console.log('\n🧪 测试: 支付提供商状态');
  console.log('============================================================');
  
  try {
    const response = await makeRequest('/api/providers');
    if (response.status === 200) {
      console.log('✅ 支付提供商状态 - 通过');
      console.log('📊 响应数据:', response.data);
      return true;
    } else {
      console.log('❌ 支付提供商状态 - 失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ 支付提供商状态 - 错误:', error.message);
    return false;
  }
}

async function testCreateCollectionOrder() {
  console.log('\n🧪 测试: 创建代收订单');
  console.log('============================================================');
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const orderId = `TEST_COLLECTION_${timestamp}`;
    
    const params = {
      appid: MERCHANT_ID,
      mchOrderId: orderId,
      amount: '500.00', // 使用符合限制的金额
      currency: 'INR',
      payType: 'UPI',
      notifyUrl: 'https://webhook.site/test',
      timestamp: timestamp
    };
    
    const sign = generateSignature(params, MERCHANT_SECRET_KEY);
    const requestData = { ...params, sign };
    
    console.log('🔍 签名生成调试:');
    console.log('原始参数:', params);
    console.log('生成的签名:', sign);
    console.log('📤 发送订单数据:', requestData);
    
    const response = await makeRequest('/api/order/create', 'POST', requestData);
    
    if (response.status === 200 && response.data.code === 200) {
      console.log('✅ 创建代收订单 - 通过');
      console.log('📊 响应数据:', response.data);
      return { success: true, orderId: orderId, data: response.data.data };
    } else {
      console.log('❌ 创建代收订单 - 失败:', response.data);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log('❌ 创建代收订单 - 错误:', error.message);
    return { success: false, error: error.message };
  }
}

async function testQueryOrder(orderId) {
  console.log('\n🧪 测试: 查询订单状态');
  console.log('============================================================');
  
  if (!orderId) {
    console.log('❌ 查询订单状态 - 失败: 没有可查询的订单ID');
    return false;
  }
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const params = {
      appid: MERCHANT_ID,
      mchOrderId: orderId,
      timestamp: timestamp
    };
    
    const sign = generateSignature(params, MERCHANT_SECRET_KEY);
    const requestData = { ...params, sign };
    
    console.log('📤 发送查询数据:', requestData);
    
    const response = await makeRequest('/api/order/query', 'POST', requestData);
    
    if (response.status === 200 && response.data.code === 200) {
      console.log('✅ 查询订单状态 - 通过');
      console.log('📊 响应数据:', response.data);
      return true;
    } else {
      console.log('❌ 查询订单状态 - 失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ 查询订单状态 - 错误:', error.message);
    return false;
  }
}

async function testCreatePayoutOrder() {
  console.log('\n🧪 测试: 创建代付订单');
  console.log('============================================================');
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const orderId = `TEST_PAYOUT_${timestamp}`;
    
    const params = {
      appid: MERCHANT_ID,
      mchOrderId: orderId,
      amount: '1000.00', // 使用符合限制的金额
      currency: 'INR',
      bankCode: 'SBIN', // 银行代码
      accountNumber: '1234567890', // 账户号码
      ifscCode: 'SBIN0001234', // IFSC代码
      accountName: 'Test Beneficiary', // 账户持有人姓名
      transferMode: 'IMPS', // 转账模式
      remark: 'Test Payout Order', // 备注
      timestamp: timestamp
    };
    
    const sign = generateSignature(params, MERCHANT_SECRET_KEY);
    const requestData = { ...params, sign };
    
    console.log('📤 发送代付数据:', requestData);
    
    const response = await makeRequest('/api/payout/create', 'POST', requestData);
    
    if (response.status === 200 && response.data.code === 200) {
      console.log('✅ 创建代付订单 - 通过');
      console.log('📊 响应数据:', response.data);
      return { success: true, orderId: orderId, data: response.data.data };
    } else {
      console.log('❌ 创建代付订单 - 失败:', response.data);
      return { success: false, error: response.data.message };
    }
  } catch (error) {
    console.log('❌ 创建代付订单 - 错误:', error.message);
    return { success: false, error: error.message };
  }
}

async function testQueryPayoutOrder(orderId) {
  console.log('\n🧪 测试: 查询代付状态');
  console.log('============================================================');
  
  if (!orderId) {
    console.log('❌ 查询代付状态 - 失败: 没有可查询的订单ID');
    return false;
  }
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const params = {
      appid: MERCHANT_ID,
      mchOrderId: orderId,
      timestamp: timestamp
    };
    
    const sign = generateSignature(params, MERCHANT_SECRET_KEY);
    const requestData = { ...params, sign };
    
    console.log('📤 发送代付查询数据:', requestData);
    
    const response = await makeRequest('/api/payout/query', 'POST', requestData);
    
    if (response.status === 200 && response.data.code === 200) {
      console.log('✅ 查询代付状态 - 通过');
      console.log('📊 响应数据:', response.data);
      return true;
    } else {
      console.log('❌ 查询代付状态 - 失败:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ 查询代付状态 - 错误:', error.message);
    return false;
  }
}

// 主测试函数
async function runBusinessFlowTest() {
  console.log('🚀 开始测试完整业务流程...');
  console.log('🌐 测试目标:', BASE_URL);
  console.log('🏪 商户ID:', MERCHANT_ID);
  console.log('⏰ 开始时间:', new Date().toLocaleString('zh-CN'));
  console.log('');
  
  const results = {
    healthCheck: false,
    providerStatus: false,
    createCollection: false,
    queryCollection: false,
    createPayout: false,
    queryPayout: false
  };
  
  let collectionOrderId = null;
  let payoutOrderId = null;
  
  // 1. 健康检查
  results.healthCheck = await testHealthCheck();
  
  // 2. 支付提供商状态
  results.providerStatus = await testProviderStatus();
  
  // 3. 创建代收订单
  const collectionResult = await testCreateCollectionOrder();
  if (collectionResult.success) {
    results.createCollection = true;
    collectionOrderId = collectionResult.orderId;
  }
  
  // 4. 查询代收订单
  results.queryCollection = await testQueryOrder(collectionOrderId);
  
  // 5. 创建代付订单
  const payoutResult = await testCreatePayoutOrder();
  if (payoutResult.success) {
    results.createPayout = true;
    payoutOrderId = payoutResult.orderId;
  }
  
  // 6. 查询代付订单
  results.queryPayout = await testQueryPayoutOrder(payoutOrderId);
  
  // 汇总结果
  console.log('\n================================================================================');
  console.log('📊 业务流程测试结果汇总');
  console.log('================================================================================');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(2);
  
  console.log(`总测试数: ${totalTests}`);
  console.log(`✅ 通过: ${passedTests}`);
  console.log(`❌ 失败: ${totalTests - passedTests}`);
  console.log(`📈 成功率: ${successRate}%`);
  
  if (passedTests < totalTests) {
    console.log('\n❌ 失败详情:');
    Object.entries(results).forEach(([test, result], index) => {
      if (!result) {
        const testNames = [
          '健康检查',
          '支付提供商状态',
          '创建代收订单',
          '查询订单状态',
          '创建代付订单',
          '查询代付状态'
        ];
        console.log(`${index + 1}. ${testNames[index]}`);
      }
    });
  }
  
  console.log('\n⏰ 结束时间:', new Date().toLocaleString('zh-CN'));
  
  console.log('\n📋 测试数据摘要:');
  console.log('商户ID:', MERCHANT_ID);
  console.log('代收订单ID:', collectionOrderId || '未创建');
  console.log('代付订单ID:', payoutOrderId || '未创建');
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有业务流程测试通过！系统运行正常。');
  } else {
    console.log('\n⚠️ 部分业务流程测试失败，请检查上述错误信息。');
  }
}

// 运行测试
runBusinessFlowTest().catch(console.error);
