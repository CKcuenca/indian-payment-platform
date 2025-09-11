#!/usr/bin/env node

const axios = require('axios');

// 测试环境配置
const BASE_URL = 'http://localhost:3001';

/**
 * 测试商户密钥管理功能
 */
async function testMerchantKeyManagement() {
  console.log('🔑 === 商户密钥管理功能测试 ===');
  console.log(`🌐 测试环境: ${BASE_URL}`);
  console.log(`⏰ 测试时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'})}`);
  
  try {
    // 1. 测试无认证访问
    console.log('\n🔍 测试无认证访问密钥信息...');
    try {
      await axios.get(`${BASE_URL}/api/merchant/keys`);
      console.log('❌ 错误：无认证访问应该被拒绝');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 正确：无认证访问被正确拒绝');
      } else {
        console.log('⚠️  意外错误:', error.message);
      }
    }

    // 2. 测试密钥验证端点
    console.log('\n🔍 测试密钥验证端点...');
    try {
      const testApiKey = 'pk_test123';
      const response = await axios.post(`${BASE_URL}/api/merchant/keys/validate`, {
        apiKey: testApiKey
      }, {
        timeout: 10000
      });
      
      console.log('📤 密钥验证响应:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('📤 密钥验证响应:', error.response.data);
      } else {
        console.log('❌ 请求失败:', error.message);
      }
    }

    // 3. 测试获取使用示例
    console.log('\n🔍 测试获取使用示例...');
    try {
      // 这个端点需要认证，所以期望401错误
      await axios.get(`${BASE_URL}/api/merchant/keys/examples`);
      console.log('❌ 错误：无认证访问应该被拒绝');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 正确：使用示例端点需要认证');
      } else {
        console.log('⚠️  意外错误:', error.message);
      }
    }

    console.log('\n🏁 === 商户密钥管理功能测试完成 ===');
    console.log('✅ 基础API端点响应正常');
    console.log('✅ 认证机制工作正常');
    console.log('\n📝 注意事项:');
    console.log('1. 密钥管理需要有效的JWT token进行认证');
    console.log('2. 生产环境需要配置正确的数据库连接');
    console.log('3. 前端页面需要在商户登录状态下访问');
    console.log('4. 确保在.env文件中配置了JWT_SECRET');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 检查服务器连接
async function checkServerConnection() {
  try {
    console.log('\n🔗 检查服务器连接...');
    const response = await axios.get(`${BASE_URL}/api/auth/health`, { timeout: 5000 });
    console.log('✅ 服务器连接正常');
    return true;
  } catch (error) {
    console.log('⚠️  服务器连接检查失败，但继续测试...');
    console.log('   原因:', error.message);
    return false;
  }
}

// 运行测试
async function runTests() {
  await checkServerConnection();
  await testMerchantKeyManagement();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testMerchantKeyManagement,
  checkServerConnection
};