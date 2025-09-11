#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

/**
 * PassPay配置调试脚本
 * 用于测试不同的mchid和pay_id组合
 */

// 测试配置 - 使用PassPay运营提供的真实信息
const TEST_CONFIGS = [
  {
    name: "测试配置1 - 使用测试专用pay_id",
    mchid: "14252318",  // PassPay提供的真实商户号
    pay_id: "11",       // 测试专用pay_id
    secretKey: "g0WvcUVPAkdzzYF7YHHuDL8VBTqIKYEf"  // PassPay提供的真实密钥
  },
  {
    name: "测试配置2 - 使用正式唤醒通道",
    mchid: "14252318",  // PassPay提供的真实商户号
    pay_id: "10",       // 唤醒通道编码
    secretKey: "g0WvcUVPAkdzzYF7YHHuDL8VBTqIKYEf"  // PassPay提供的真实密钥
  }
];

/**
 * 生成PassPay签名
 */
function generatePassPaySignature(params, secretKey) {
  // 过滤空值和null，按ASCII排序
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      filteredParams[key] = params[key];
    }
  });

  // 按ASCII排序并拼接
  const sortedKeys = Object.keys(filteredParams).sort();
  let signStr = '';
  
  sortedKeys.forEach(key => {
    if (key !== 'sign') {
      signStr += `${key}=${filteredParams[key]}&`;
    }
  });

  // 末尾拼接密钥
  signStr += `key=${secretKey}`;

  console.log('🔐 PassPay签名字符串:', signStr);

  // MD5加密并转小写
  return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
}

/**
 * 测试PassPay配置
 */
async function testPassPayConfig(config) {
  console.log(`\n🧪 === ${config.name} ===`);
  console.log(`mchid: ${config.mchid}`);
  console.log(`pay_id: ${config.pay_id}`);
  console.log(`secretKey: ${config.secretKey}`);
  
  const params = {
    mchid: config.mchid,
    pay_id: config.pay_id,
    out_trade_no: `TEST_${Date.now()}`,
    amount: "100.00",
    notify_url: "https://example.com/notify"
  };

  // 生成签名
  params.sign = generatePassPaySignature(params, config.secretKey);
  
  console.log('📤 请求参数:', JSON.stringify(params, null, 2));

  try {
    const response = await axios.post('https://api.merchant.passpay.cc/api/developer/order/create', params, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ 响应状态码:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.rCode === 200 && response.data.data && response.data.data.status === 1) {
      console.log('🎉 成功！订单创建成功！');
      return true;
    } else {
      console.log('⚠️  业务失败:', response.data.rMsg || '未知错误');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 请求失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误信息:', error.message);
    }
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🎯 === PassPay配置调试工具 ===');
  console.log('🌐 测试环境: https://api.merchant.passpay.cc');
  console.log('⏰ 测试时间:', new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'}));
  
  console.log('\n📋 测试说明:');
  console.log('1. 这个脚本会测试不同的PassPay配置');
  console.log('2. 请根据PassPay提供的真实参数更新"测试配置2"');
  console.log('3. mchid和pay_id都需要PassPay方面提供');
  console.log('4. secretKey用于签名验证');
  
  // 测试所有配置
  for (const config of TEST_CONFIGS) {
    const success = await testPassPayConfig(config);
    if (success) {
      console.log(`\n🎯 找到有效配置: ${config.name}`);
      break;
    }
    
    // 等待1秒再测试下一个配置
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📝 调试建议:');
  console.log('1. 如果所有配置都失败，请联系PassPay确认以下信息:');
  console.log('   - 正确的 mchid (商户号)');
  console.log('   - 正确的 pay_id (支付通道ID)');  
  console.log('   - 正确的 secretKey (签名密钥)');
  console.log('2. 确认账户状态是否正常激活');
  console.log('3. 确认支付通道是否已开通');
  
  console.log('\n🔧 下一步操作:');
  console.log('1. 获得正确配置后，更新数据库中的支付配置');
  console.log('2. 重启PM2服务加载新配置');
  console.log('3. 重新测试游戏公司订单接口');
}

// 运行调试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testPassPayConfig,
  generatePassPaySignature
};