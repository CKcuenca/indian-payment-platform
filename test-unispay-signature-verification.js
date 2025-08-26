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

// 测试验签功能
async function testSignatureVerification() {
  console.log('🔍 开始测试UNISPAY验签功能...\n');

  try {
    // 测试数据：申请存款接口
    const testData = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: `VERIFY_${Date.now()}`,
      timestamp: Date.now().toString(),
      payType: 9111, // 印度一类（唤醒）
      amount: '200.00', // 符合金额限制
      notifyUrl: 'https://cashgit.com/api/webhook/unispay/deposit',
      returnUrl: 'https://cashgit.com/return'
    };

    // 生成签名
    const signature = generateCorrectSignature(testData);
    console.log('🔍 生成的签名:', signature);

    // 构建验签请求数据
    const verificationData = {
      interfaceType: 0, // 0申请存款
      key: UNISPAY_CONFIG.secretKey,
      mchNo: UNISPAY_CONFIG.mchNo,
      sign: signature,
      // 添加原始参数用于验签
      ...testData
    };

    console.log('📋 验签请求数据:', JSON.stringify(verificationData, null, 2));

    // 发送验签请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/checkSign`,
      verificationData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ 验签请求成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));

    // 分析验签结果
    if (response.data && response.data.strString) {
      console.log('\n🔍 验签结果分析:');
      console.log('📝 返回的签名字符串:', response.data.strString);
      console.log('🔐 我们生成的签名:', signature);
      console.log('✅ 签名是否一致:', response.data.strString === signature);
    }

  } catch (error) {
    console.error('❌ 验签请求失败:', error.message);

    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 测试不同接口类型的验签
async function testAllInterfaceTypes() {
  console.log('\n🔍 开始测试所有接口类型的验签...\n');

  const interfaceTypes = [
    { type: 0, name: '申请存款' },
    { type: 1, name: '存款查询' },
    { type: 2, name: 'UPI查询' },
    { type: 3, name: 'UTR查询' },
    { type: 4, name: 'UTR补单' },
    { type: 5, name: '申请出款' },
    { type: 6, name: '出款查询' },
    { type: 7, name: '余额查询' }
  ];

  for (const interface of interfaceTypes) {
    console.log(`\n🔍 测试接口类型: ${interface.name} (${interface.type})`);
    
    try {
      // 构建基础测试数据
      const testData = {
        mchNo: UNISPAY_CONFIG.mchNo,
        timestamp: Date.now().toString()
      };

      // 根据接口类型添加特定参数
      switch (interface.type) {
        case 0: // 申请存款
          testData.mchOrderId = `DEPOSIT_${Date.now()}`;
          testData.payType = 9111;
          testData.amount = '200.00';
          testData.notifyUrl = 'https://cashgit.com/api/webhook/unispay/deposit';
          testData.returnUrl = 'https://cashgit.com/return';
          break;
        case 1: // 存款查询
          testData.mchOrderId = `QUERY_${Date.now()}`;
          break;
        case 2: // UPI查询
          testData.mchOrderId = `UPI_${Date.now()}`;
          testData.upiId = 'test@upi';
          break;
        case 3: // UTR查询
          testData.mchOrderId = `UTR_${Date.now()}`;
          testData.utr = '123456789012345';
          break;
        case 4: // UTR补单
          testData.mchOrderId = `REPAIR_${Date.now()}`;
          testData.utr = '123456789012345';
          break;
        case 5: // 申请出款
          testData.mchOrderId = `WITHDRAW_${Date.now()}`;
          testData.payType = 9111;
          testData.amount = '100.00';
          testData.paymentMethod = 'IMPS';
          testData.accNumber = '1234567890';
          testData.accName = 'Test User';
          testData.notifyUrl = 'https://cashgit.com/api/webhook/unispay/withdraw';
          testData.channelExtra = JSON.stringify({ ifsc: 'AIRP0000001' });
          break;
        case 6: // 出款查询
          testData.mchOrderId = `WITHDRAW_QUERY_${Date.now()}`;
          break;
        case 7: // 余额查询
          // 余额查询只需要mchNo和timestamp
          break;
      }

      // 生成签名
      const signature = generateCorrectSignature(testData);

      // 构建验签请求
      const verificationData = {
        interfaceType: interface.type,
        key: UNISPAY_CONFIG.secretKey,
        mchNo: UNISPAY_CONFIG.mchNo,
        sign: signature,
        ...testData
      };

      // 发送验签请求
      const response = await axios.post(
        `${UNISPAY_CONFIG.baseUrl}/api/checkSign`,
        verificationData,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log(`✅ ${interface.name} 验签成功!`);
      console.log(`📊 响应状态: ${response.status}`);
      
      if (response.data && response.data.strString) {
        const isValid = response.data.strString === signature;
        console.log(`🔐 签名验证: ${isValid ? '✅ 通过' : '❌ 失败'}`);
      }

    } catch (error) {
      console.error(`❌ ${interface.name} 验签失败:`, error.message);
      
      if (error.response) {
        console.error(`📊 错误状态: ${error.response.status}`);
        console.error(`📄 错误数据: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 运行测试
async function runAllTests() {
  console.log('🚀 UNISPAY验签功能完整测试开始\n');
  
  // 测试基础验签功能
  await testSignatureVerification();
  
  // 测试所有接口类型
  await testAllInterfaceTypes();
  
  console.log('\n🎉 所有验签测试完成!');
}

runAllTests().catch(console.error);
