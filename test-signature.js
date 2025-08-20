const SignatureUtil = require('./server/utils/signature');

// 测试MG支付文档中的示例
console.log('=== MG支付签名测试 ===');

// 测试参数：orderid=ts202306001&appid=123&amount=100&desc=hello world
const testParams = {
  orderid: 'ts202306001',
  appid: '123',
  amount: '100',
  desc: 'hello world'
};

const secretKey = 'test_secret_key_123';

// 生成签名示例
const result = SignatureUtil.generateSignatureExample(testParams, secretKey);

console.log('原始参数:', result.originalParams);
console.log('排序后参数:', result.sortedParams);
console.log('签名源串:', result.sourceString);
console.log('最终字符串:', result.finalString);
console.log('MD5签名:', result.signature);
console.log('带签名的参数:', result.signedParams);

// 验证签名
const isValid = SignatureUtil.verifySignature(testParams, secretKey, result.signature);
console.log('签名验证结果:', isValid);

// 测试文档中的具体示例
console.log('\n=== 文档示例验证 ===');
const docParams = {
  orderid: 'ts202306001',
  appid: '123',
  amount: '100',
  desc: 'hello world'
};

const docResult = SignatureUtil.generateSignatureExample(docParams, secretKey);
console.log('文档示例签名源串:', docResult.sourceString);
console.log('文档示例最终字符串:', docResult.sourceString + secretKey);
console.log('文档示例MD5签名:', docResult.signature);
