const axios = require('axios');

console.log('🚀 开始简单测试...');

// 测试健康检查
axios.get('https://cashgit.com/health')
  .then(response => {
    console.log('✅ 健康检查成功:', response.status);
    console.log('📊 响应:', response.data);
  })
  .catch(error => {
    console.log('❌ 健康检查失败:', error.message);
  });

// 测试余额查询（会失败，因为没有测试数据）
setTimeout(() => {
  const params = {
    appid: 'MERCHANT_ME01UHM7',
    timestamp: Date.now().toString()
  };
  
  // 简单的MD5签名
  const crypto = require('crypto');
  const signString = `appid=${params.appid}&timestamp=${params.timestamp}sk_mxf9mdelh5me01uhm7`;
  params.sign = crypto.createHash('md5').update(signString, 'utf8').digest('hex');
  
  axios.post('https://cashgit.com/api/balance/query', params, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'pk_rzz8igydcme01uhm7'
    }
  })
  .then(response => {
    console.log('✅ 余额查询成功:', response.status);
    console.log('📊 响应:', response.data);
  })
  .catch(error => {
    console.log('❌ 余额查询失败:', error.response?.data || error.message);
    console.log('💡 这是预期的，因为还没有测试数据');
  });
}, 2000);

