const axios = require('axios');
const crypto = require('crypto');

// UNISPAY配置
const UNISPAY_CONFIG = {
  mchNo: 'K8886120871',
  secretKey: '8d64f6b25d704ebb9ca3e67fbc274dc7',
  baseUrl: 'https://asia666.unispay.xyz'
};

// 正确的UNISPAY签名算法（基于官方文档）
function generateCorrectSignature(data) {
  const { sign, ...signParams } = data;
  
  // 1. 按ASCII码排序参数名
  const sortedKeys = Object.keys(signParams).sort();
  
  // 2. 构建签名字符串，只包含非空值
  let signStr = '';
  sortedKeys.forEach(key => {
    if (signParams[key] !== undefined && signParams[key] !== null && signParams[key] !== '') {
      signStr += `${key}=${signParams[key]}&`;
    }
  });
  
  // 3. 拼接key=密钥（官方文档格式）
  signStr = signStr.slice(0, -1) + `&key=${UNISPAY_CONFIG.secretKey}`;
  
  console.log('🔍 签名字符串:', signStr);
  
  // 4. 进行SHA-256加密，得到16进制小写
  return crypto.createHash('sha256').update(signStr).digest('hex');
}

// 验证签名
function verifySignature(data, receivedSign) {
  const calculatedSign = generateCorrectSignature(data);
  const isValid = calculatedSign === receivedSign;
  console.log('🔍 签名验证:', isValid ? '✅ 通过' : '❌ 失败');
  console.log('🔍 计算签名:', calculatedSign);
  console.log('🔍 接收签名:', receivedSign);
  return isValid;
}

// 1. 测试签名生成和验证
async function testSignature() {
  console.log('\n🔐 1. 测试签名生成和验证');
  console.log('=' .repeat(50));
  
  const testData = {
    mchNo: UNISPAY_CONFIG.mchNo,
    mchOrderId: 'TEST_SIGN_' + Date.now(),
    timestamp: Date.now().toString(),
    amount: '100.00'
  };
  
  // 生成签名
  const signature = generateCorrectSignature(testData);
  console.log('📝 测试数据:', JSON.stringify(testData, null, 2));
  console.log('🔑 生成签名:', signature);
  
  // 验证签名
  const isValid = verifySignature(testData, signature);
  console.log('✅ 签名测试结果:', isValid ? '通过' : '失败');
  
  return { testData, signature, isValid };
}

// 2.1 测试代收-存款
async function testDeposit() {
  console.log('\n💰 2.1 测试代收-存款');
  console.log('=' .repeat(50));
  
  try {
    const depositData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: `DEPOSIT_${Date.now()}`,
      payType: 9111, // 印度一类（唤醒）
      amount: '100.00', // 100卢比
      notifyUrl: 'https://cashgit.com/api/webhook/unispay/collection',
      returnUrl: 'https://cashgit.com/return',
      timestamp: Date.now()
    };
    
    // 生成签名
    const signature = generateCorrectSignature(depositData);
    depositData.sign = signature;
    
    console.log('📋 存款请求数据:', JSON.stringify(depositData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/order/create`,
      depositData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ 存款请求成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data, orderId: depositData.mchOrderId };
    
  } catch (error) {
    console.error('❌ 存款请求失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 2.2 测试代收-存款查询
async function testDepositQuery(orderId) {
  console.log('\n🔍 2.2 测试代收-存款查询');
  console.log('=' .repeat(50));
  
  try {
    const queryData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: orderId,
      timestamp: Date.now()
    };
    
    // 生成签名
    const signature = generateCorrectSignature(queryData);
    queryData.sign = signature;
    
    console.log('📋 查询请求数据:', JSON.stringify(queryData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/order/query`,
      queryData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ 存款查询成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ 存款查询失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 3. 测试UPI查询
async function testUpiQuery() {
  console.log('\n📱 3. 测试UPI查询');
  console.log('=' .repeat(50));
  
  try {
    const upiQueryData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: `UPI_QUERY_${Date.now()}`,
      timestamp: Date.now(),
      upiId: 'test@upi'
    };
    
    // 生成签名
    const signature = generateCorrectSignature(upiQueryData);
    upiQueryData.sign = signature;
    
    console.log('📋 UPI查询请求数据:', JSON.stringify(upiQueryData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/order/queryUpi`,
      upiQueryData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ UPI查询成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ UPI查询失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 4.1 测试UTR查询
async function testUtrQuery() {
  console.log('\n🔢 4.1 测试UTR查询');
  console.log('=' .repeat(50));
  
  try {
    const utrQueryData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: `UTR_QUERY_${Date.now()}`,
      timestamp: Date.now(),
      utr: '123456789012345'
    };
    
    // 生成签名
    const signature = generateCorrectSignature(utrQueryData);
    utrQueryData.sign = signature;
    
    console.log('📋 UTR查询请求数据:', JSON.stringify(utrQueryData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/order/queryUtr`,
      utrQueryData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ UTR查询成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ UTR查询失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 4.2 测试UTR补单
async function testUtrRepair() {
  console.log('\n🔧 4.2 测试UTR补单');
  console.log('=' .repeat(50));
  
  try {
    const utrRepairData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: `UTR_REPAIR_${Date.now()}`,
      timestamp: Date.now(),
      utr: '123456789012345'
    };
    
    // 生成签名
    const signature = generateCorrectSignature(utrRepairData);
    utrRepairData.sign = signature;
    
    console.log('📋 UTR补单请求数据:', JSON.stringify(utrRepairData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/order/repairUtr`,
      utrRepairData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ UTR补单成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ UTR补单失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 5.1 测试代付-出款
async function testWithdraw() {
  console.log('\n💸 5.1 测试代付-出款');
  console.log('=' .repeat(50));
  
  try {
    const withdrawData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: `WITHDRAW_${Date.now()}`,
      timestamp: Date.now().toString(),
      payType: 9111, // 印度一类（唤醒）
      paymentMethod: 'IMPS',
      accNumber: '1234226',
      accName: 'zs',
      amount: '100.00', // 使用有效金额范围
      notifyUrl: 'https://cashgit.com/api/webhook/unispay/withdraw',
      channelExtra: JSON.stringify({
        ifsc: 'AIRP0000001' // IMPS出款必填
      })
    };
    
    // 生成签名
    const signature = generateCorrectSignature(withdrawData);
    withdrawData.sign = signature;
    
    console.log('📋 出款请求数据:', JSON.stringify(withdrawData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/payout/create`,
      withdrawData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ 出款请求成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data, orderId: withdrawData.mchOrderId };
    
  } catch (error) {
    console.error('❌ 出款请求失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 5.2 测试代付-出款查询
async function testWithdrawQuery(orderId) {
  console.log('\n🔍 5.2 测试代付-出款查询');
  console.log('=' .repeat(50));
  
  try {
    const queryData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: orderId,
      timestamp: Date.now()
    };
    
    // 生成签名
    const signature = generateCorrectSignature(queryData);
    queryData.sign = signature;
    
    console.log('📋 出款查询请求数据:', JSON.stringify(queryData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/payout/query`,
      queryData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ 出款查询成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ 出款查询失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 6. 测试余额查询
async function testBalanceQuery() {
  console.log('\n💰 6. 测试余额查询');
  console.log('=' .repeat(50));
  
  try {
    const balanceData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      timestamp: Date.now()
    };
    
    // 生成签名
    const signature = generateCorrectSignature(balanceData);
    balanceData.sign = signature;
    
    console.log('📋 余额查询请求数据:', JSON.stringify(balanceData, null, 2));
    
    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/mch/balance`,
      balanceData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ 余额查询成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('❌ 余额查询失败:', error.message);
    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// 主测试函数
async function runCompleteTest() {
  console.log('🚀 开始UNISPAY完整流程测试');
  console.log('=' .repeat(60));
  console.log(`🔧 商户号: ${UNISPAY_CONFIG.mchNo}`);
  console.log(`🌐 API地址: ${UNISPAY_CONFIG.baseUrl}`);
  console.log('=' .repeat(60));
  
  const results = {};
  
  try {
    // 1. 测试签名
    results.signature = await testSignature();
    
    // 2.1 测试代收-存款
    results.deposit = await testDeposit();
    
    // 2.2 测试代收-存款查询（如果有订单ID）
    if (results.deposit.success && results.deposit.orderId) {
      results.depositQuery = await testDepositQuery(results.deposit.orderId);
    }
    
    // 3. 测试UPI查询
    results.upiQuery = await testUpiQuery();
    
    // 4.1 测试UTR查询
    results.utrQuery = await testUtrQuery();
    
    // 4.2 测试UTR补单
    results.utrRepair = await testUtrRepair();
    
    // 5.1 测试代付-出款
    results.withdraw = await testWithdraw();
    
    // 5.2 测试代付-出款查询（如果有订单ID）
    if (results.withdraw.success && results.withdraw.orderId) {
      results.withdrawQuery = await testWithdrawQuery(results.withdraw.orderId);
    }
    
    // 6. 测试余额查询
    results.balance = await testBalanceQuery();
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
  
  // 输出测试总结
  console.log('\n📊 测试总结');
  console.log('=' .repeat(60));
  
  Object.keys(results).forEach(key => {
    const result = results[key];
    const status = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`${key}: ${status}`);
  });
  
  console.log('\n🎉 UNISPAY完整流程测试完成!');
  return results;
}

// 运行测试
runCompleteTest().catch(console.error);
