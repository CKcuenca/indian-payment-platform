const mongoose = require('mongoose');

// 连接线上数据库
async function connectProductionDB() {
  try {
    // 这里需要线上数据库的连接字符串
    // 由于没有线上数据库连接信息，我们通过API检查
    console.log('🔍 通过API检查线上PassPay配置...');
    
    const https = require('https');
    
    // 检查线上支付配置API
    const checkOnlineConfig = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'cashgit.com',
          port: 443,
          path: '/api/payment-config',
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PaymentPlatform-Checker)'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve(response);
            } catch (error) {
              resolve({ error: 'Invalid JSON response', raw: data });
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      });
    };

    const result = await checkOnlineConfig();
    console.log('📋 线上API响应:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      const passpayConfigs = result.data.filter(config => 
        config.provider && config.provider.name === 'passpay'
      );
      
      console.log(`\n🔍 线上PassPay配置数量: ${passpayConfigs.length}`);
      
      if (passpayConfigs.length > 0) {
        console.log('📋 线上PassPay配置:');
        passpayConfigs.forEach(config => {
          console.log(`   - ${config.accountName} (ID: ${config._id})`);
        });
      } else {
        console.log('✅ 线上没有PassPay配置');
      }
    } else {
      console.log('❌ 线上API返回错误:', result.error || '未知错误');
    }

  } catch (error) {
    console.error('❌ 检查线上配置失败:', error);
  }
}

// 运行检查
connectProductionDB();
