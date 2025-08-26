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

// 测试余额查询
async function testBalanceQuery() {
  console.log('🔍 开始测试UNISPAY余额查询（基于官方文档）...\n');

  try {
    // 余额查询参数（基于官方文档）
    const baseParams = {
      mchNo: UNISPAY_CONFIG.mchNo,
      timestamp: Date.now().toString()
    };

    // 生成签名
    const sign = generateCorrectSignature(baseParams);
    
    // 添加签名到请求参数
    const requestParams = {
      ...baseParams,
      sign: sign
    };

    console.log('📋 请求参数:', JSON.stringify(requestParams, null, 2));
    console.log('🔗 请求URL:', `${UNISPAY_CONFIG.baseUrl}/api/mch/balance`);

    // 发送请求
    const response = await axios.post(
      `${UNISPAY_CONFIG.baseUrl}/api/mch/balance`,
      requestParams,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('\n✅ 余额查询成功!');
    console.log('📊 响应状态:', response.status);
    console.log('📋 响应数据:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('\n❌ 余额查询失败!');
    
    if (error.response) {
      console.log('📊 响应状态:', error.response.status);
      console.log('📋 响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('🚫 请求错误:', error.message);
    } else {
      console.log('🚫 其他错误:', error.message);
    }
  }
}

// 运行测试
testBalanceQuery().catch(console.error);
