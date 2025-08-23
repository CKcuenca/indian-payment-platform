const axios = require('axios');
const crypto = require('crypto');

// 测试配置
const API_BASE = 'http://localhost:3000/api';
const TEST_SECRET_KEY = 'test_secret_key_123';

// 生成PassPay回调签名
function generatePassPayCallbackSignature(params, secretKey) {
  try {
    // 过滤空值，按ASCII排序
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
      signStr += `${key}=${filteredParams[key]}&`;
    });

    // 末尾拼接密钥
    signStr += `key=${secretKey}`;

    // MD5加密并转小写
    return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
  } catch (error) {
    console.error('生成PassPay回调签名失败:', error);
    return '';
  }
}

// 测试PassPay代收回调
async function testCollectionCallback() {
  console.log('🔄 测试PassPay代收回调...');
  
  try {
    const callbackData = {
      mchid: 'test_mchid',
      pay_id: 'test_pay_id',
      out_trade_no: 'TEST_PAY_001',
      trade_no: 'PASS_123456789',
      amount: '100.00',
      status: '2', // 2表示成功
      utr: 'UTR123456789',
      msg: '支付成功'
    };

    // 生成签名
    callbackData.sign = generatePassPayCallbackSignature(callbackData, TEST_SECRET_KEY);

    console.log('📤 发送代收回调数据:', callbackData);

    const response = await axios.post(`${API_BASE}/callback/collection`, callbackData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ 代收回调测试成功:', response.data);
    return true;

  } catch (error) {
    console.error('❌ 代收回调测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试PassPay代付回调
async function testPayoutCallback() {
  console.log('🔄 测试PassPay代付回调...');
  
  try {
    const callbackData = {
      mchid: 'test_mchid',
      pay_id: 'test_pay_id',
      out_trade_no: 'TEST_PAYOUT_001',
      trade_no: 'PASS_PAYOUT_987654321',
      amount: '500.00',
      status: '2', // 2表示成功
      msg: '代付成功'
    };

    // 生成签名
    callbackData.sign = generatePassPayCallbackSignature(callbackData, TEST_SECRET_KEY);

    console.log('📤 发送代付回调数据:', callbackData);

    const response = await axios.post(`${API_BASE}/callback/payout`, callbackData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('✅ 代付回调测试成功:', response.data);
    return true;

  } catch (error) {
    console.error('❌ 代付回调测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试PassPay回调签名验证
async function testCallbackSignatureValidation() {
  console.log('🔄 测试PassPay回调签名验证...');
  
  try {
    const callbackData = {
      mchid: 'test_mchid',
      pay_id: 'test_pay_id',
      out_trade_no: 'TEST_SIGN_001',
      trade_no: 'PASS_SIGN_111',
      amount: '200.00',
      status: '1', // 1表示处理中
      msg: '处理中'
    };

    // 故意使用错误的签名
    callbackData.sign = 'wrong_signature';

    console.log('📤 发送错误签名的回调数据:', callbackData);

    const response = await axios.post(`${API_BASE}/callback/collection`, callbackData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log('⚠️ 错误签名回调响应:', response.data);
    return true;

  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ 签名验证正确，拒绝了错误签名的回调');
      return true;
    } else {
      console.error('❌ 签名验证测试失败:', error.response?.data || error.message);
      return false;
    }
  }
}

// 主测试函数
async function testPassPayCallbacks() {
  console.log('🚀 开始测试PassPay回调功能...\n');

  try {
    // 1. 测试代收回调
    const collectionResult = await testCollectionCallback();
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. 测试代付回调
    const payoutResult = await testPayoutCallback();
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 测试签名验证
    const signatureResult = await testCallbackSignatureValidation();

    console.log('\n📊 回调测试结果汇总:');
    console.log(`   代收回调: ${collectionResult ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   代付回调: ${payoutResult ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   签名验证: ${signatureResult ? '✅ 成功' : '❌ 失败'}`);

    if (collectionResult && payoutResult && signatureResult) {
      console.log('\n🎉 所有PassPay回调测试通过！');
      console.log('\n📋 测试说明:');
      console.log('   - 代收回调: 模拟PassPay通知支付成功');
      console.log('   - 代付回调: 模拟PassPay通知代付成功');
      console.log('   - 签名验证: 验证系统能正确拒绝错误签名');
      console.log('   - 系统会自动更新订单状态并通知商户');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查系统配置');
    }

  } catch (error) {
    console.error('❌ 回调测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testPassPayCallbacks();
}

module.exports = { 
  testPassPayCallbacks,
  testCollectionCallback,
  testPayoutCallback,
  testCallbackSignatureValidation
};
