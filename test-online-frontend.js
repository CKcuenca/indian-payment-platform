const axios = require('axios');

// 线上前端地址
const ONLINE_FRONTEND_URL = 'https://cashgit.com';

async function testOnlineFrontend() {
  console.log('=== 测试线上前端 ===\n');
  
  try {
    // 1. 测试前端页面加载
    console.log('1. 测试前端页面加载...');
    console.log(`请求URL: ${ONLINE_FRONTEND_URL}`);
    
    const response = await axios.get(ONLINE_FRONTEND_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ 响应状态:', response.status);
    console.log('✅ 页面标题:', response.data.match(/<title>(.*?)<\/title>/)?.[1] || '未找到标题');
    
    // 2. 检查JavaScript文件中的API地址
    const jsFiles = response.data.match(/static\/js\/[^"]+\.js/g) || [];
    console.log('\n2. 找到的JavaScript文件:', jsFiles);
    
    if (jsFiles.length > 0) {
      const mainJsFile = jsFiles[0];
      console.log(`\n3. 检查主JavaScript文件: ${mainJsFile}`);
      
      const jsResponse = await axios.get(`${ONLINE_FRONTEND_URL}/${mainJsFile}`, {
        timeout: 10000
      });
      
      const jsContent = jsResponse.data;
      
      // 检查是否包含正确的API地址
      if (jsContent.includes('cashgit.com')) {
        console.log('✅ JavaScript文件包含正确的API地址: cashgit.com');
      } else {
        console.log('❌ JavaScript文件不包含正确的API地址');
      }
      
      if (jsContent.includes('localhost:3001')) {
        console.log('❌ JavaScript文件仍然包含本地地址: localhost:3001');
      } else {
        console.log('✅ JavaScript文件不包含本地地址');
      }
    }
    
  } catch (error) {
    console.error('❌ 请求失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('状态文本:', error.response.statusText);
      console.error('响应头:', error.response.headers);
    } else if (error.request) {
      console.error('请求错误:', error.request);
    } else {
      console.error('错误信息:', error.message);
    }
    console.error('完整错误:', error);
  }
}

// 运行测试
testOnlineFrontend().catch(console.error);
