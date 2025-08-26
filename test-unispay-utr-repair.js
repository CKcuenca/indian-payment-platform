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

// 测试UTR补单
async function testUtrRepair() {
  console.log('🔍 开始测试UNISPAY UTR补单...\n');

  try {
    // 基础参数
    const baseParams = {
      mchNo: UNISPAY_CONFIG.mchNo,
      mchOrderId: `REPAIR_${Date.now()}`,
      timestamp: Date.now().toString(),
      utr: '425795236657' // 示例UTR号码
    };

    // 生成签名
    const signature = generateCorrectSignature(baseParams);
    console.log('🔍 生成的签名:', signature);

    // 构建完整请求
    const requestData = {
      ...baseParams,
      sign: signature
    };

    console.log('📋 请求数据:', JSON.stringify(requestData, null, 2));

    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/order/repairUtr`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ 请求成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ 请求失败:', error.message);

    if (error.response) {
      console.error('📊 错误状态:', error.response.status);
      console.error('📄 错误数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testUtrRepair().catch(console.error);
