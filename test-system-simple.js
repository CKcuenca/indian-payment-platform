const axios = require('axios');

// 配置
const BASE_URL = 'https://cashgit.com';

// 测试系统健康检查
async function testHealthCheck() {
  try {
    console.log('🏥 测试系统健康检查...');
    
    const startTime = Date.now();
    const response = await axios.get(`${BASE_URL}/api/health`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.data.status === 'OK') {
      console.log('✅ 系统健康检查通过');
      console.log(`📋 系统状态:`);
      console.log(`  状态: ${response.data.status}`);
      console.log(`  服务: ${response.data.service}`);
      console.log(`  时间: ${response.data.timestamp}`);
      console.log(`  版本: ${response.data.version}`);
      console.log(`  运行时间: ${Math.round(response.data.uptime)}秒`);
      console.log(`  环境: ${response.data.environment}`);
      console.log(`  响应时间: ${responseTime}ms`);
      
      // 评估响应时间
      if (responseTime < 1000) {
        console.log('✅ 响应时间正常 (< 1秒)');
      } else if (responseTime < 3000) {
        console.log('⚠️ 响应时间较慢 (1-3秒)');
      } else {
        console.log('❌ 响应时间过慢 (> 3秒)');
      }
      
      return response.data;
    } else {
      throw new Error('健康检查失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 系统健康检查失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试演示接口
async function testDemoEndpoints() {
  try {
    console.log('\n🎮 测试演示接口...');
    
    // 测试商户信息演示接口
    const merchantResponse = await axios.get(`${BASE_URL}/api/demo/merchant-info`);
    if (merchantResponse.data.success) {
      console.log('✅ 商户信息演示接口正常');
      console.log(`📋 商户信息:`);
      console.log(`  商户ID: ${merchantResponse.data.data.merchantId}`);
      console.log(`  商户名称: ${merchantResponse.data.data.name}`);
      console.log(`  状态: ${merchantResponse.data.data.status}`);
    } else {
      throw new Error('商户信息演示接口失败');
    }
    
    // 测试交易历史演示接口
    const transactionsResponse = await axios.get(`${BASE_URL}/api/demo/transactions`);
    if (transactionsResponse.data.success) {
      console.log('✅ 交易历史演示接口正常');
      console.log(`📋 交易历史:`);
      console.log(`  总交易数: ${transactionsResponse.data.data.pagination.total}`);
      console.log(`  当前页: ${transactionsResponse.data.data.pagination.page}`);
    } else {
      throw new Error('交易历史演示接口失败');
    }
    
    // 测试订单历史演示接口
    const ordersResponse = await axios.get(`${BASE_URL}/api/demo/orders`);
    if (ordersResponse.data.success) {
      console.log('✅ 订单历史演示接口正常');
      console.log(`📋 订单历史:`);
      console.log(`  总订单数: ${ordersResponse.data.data.pagination.total}`);
      console.log(`  当前页: ${ordersResponse.data.data.pagination.page}`);
    } else {
      throw new Error('订单历史演示接口失败');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 演示接口测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试API可用性
async function testAPIAvailability() {
  try {
    console.log('\n🔍 测试API可用性...');
    
    const endpoints = [
      '/api/health',
      '/api/demo/merchant-info',
      '/api/demo/transactions',
      '/api/demo/orders'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.push({
          endpoint,
          status: 'success',
          responseTime,
          statusCode: response.status
        });
        
        console.log(`✅ ${endpoint} - ${responseTime}ms`);
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: error.response?.status || 'Network Error'
        });
        
        console.log(`❌ ${endpoint} - ${error.response?.status || 'Network Error'}`);
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    console.log(`\n📊 API可用性统计:`);
    console.log(`  成功: ${successCount}/${totalCount}`);
    console.log(`  成功率: ${Math.round((successCount / totalCount) * 100)}%`);
    
    return results;
  } catch (error) {
    console.error('❌ API可用性测试失败:', error.message);
    throw error;
  }
}

// 测试系统性能
async function testSystemPerformance() {
  try {
    console.log('\n⚡ 测试系统性能...');
    
    const testCount = 5;
    const responseTimes = [];
    
    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();
      await axios.get(`${BASE_URL}/api/health`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
      
      console.log(`  测试 ${i + 1}: ${responseTime}ms`);
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    console.log(`\n📊 性能统计:`);
    console.log(`  平均响应时间: ${Math.round(avgResponseTime)}ms`);
    console.log(`  最快响应时间: ${minResponseTime}ms`);
    console.log(`  最慢响应时间: ${maxResponseTime}ms`);
    
    // 性能评估
    if (avgResponseTime < 500) {
      console.log('✅ 系统性能优秀 (< 500ms)');
    } else if (avgResponseTime < 1000) {
      console.log('✅ 系统性能良好 (500ms-1s)');
    } else if (avgResponseTime < 2000) {
      console.log('⚠️ 系统性能一般 (1s-2s)');
    } else {
      console.log('❌ 系统性能较差 (> 2s)');
    }
    
    return {
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      responseTimes
    };
  } catch (error) {
    console.error('❌ 系统性能测试失败:', error.message);
    throw error;
  }
}

// 主测试函数
async function testSystemSimple() {
  console.log('🚀 开始测试系统整体状态...\n');
  
  try {
    // 1. 测试系统健康检查
    await testHealthCheck();
    
    // 2. 测试演示接口
    await testDemoEndpoints();
    
    // 3. 测试API可用性
    await testAPIAvailability();
    
    // 4. 测试系统性能
    await testSystemPerformance();
    
    console.log('\n🎉 系统状态测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 系统状态测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testSystemSimple().catch(console.error);
