const axios = require('axios');

// 配置
const BASE_URL = 'https://cashgit.com';

// 测试系统健康检查
async function testHealthCheck() {
  try {
    console.log('🏥 测试系统健康检查...');
    
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    if (response.data.status === 'OK') {
      console.log('✅ 系统健康检查通过');
      console.log(`📋 系统状态:`);
      console.log(`  状态: ${response.data.status}`);
      console.log(`  服务: ${response.data.service}`);
      console.log(`  时间: ${response.data.timestamp}`);
      console.log(`  版本: ${response.data.version}`);
      console.log(`  运行时间: ${response.data.uptime}秒`);
      console.log(`  环境: ${response.data.environment}`);
      return response.data;
    } else {
      throw new Error('健康检查失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 系统健康检查失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试系统状态
async function testSystemStatus() {
  try {
    console.log('\n📊 测试系统状态...');
    
    const response = await axios.get(`${BASE_URL}/api/status`);
    
    if (response.data.success) {
      console.log('✅ 系统状态正常');
      console.log(`📋 系统信息:`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  数据库: ${response.data.data.database}`);
      console.log(`  内存使用: ${response.data.data.memory}`);
      console.log(`  CPU使用: ${response.data.data.cpu}`);
      console.log(`  磁盘使用: ${response.data.data.disk}`);
      return response.data.data;
    } else {
      throw new Error('系统状态检查失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 系统状态检查失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试API响应时间
async function testAPIResponseTime() {
  try {
    console.log('\n⏱️ 测试API响应时间...');
    
    const startTime = Date.now();
    const response = await axios.get(`${BASE_URL}/api/health`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.data.success) {
      console.log('✅ API响应时间测试完成');
      console.log(`📋 响应时间: ${responseTime}ms`);
      
      if (responseTime < 1000) {
        console.log('✅ 响应时间正常 (< 1秒)');
      } else if (responseTime < 3000) {
        console.log('⚠️ 响应时间较慢 (1-3秒)');
      } else {
        console.log('❌ 响应时间过慢 (> 3秒)');
      }
      
      return responseTime;
    } else {
      throw new Error('API响应时间测试失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ API响应时间测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试数据库连接
async function testDatabaseConnection() {
  try {
    console.log('\n🗄️ 测试数据库连接...');
    
    const response = await axios.get(`${BASE_URL}/api/db/status`);
    
    if (response.data.success) {
      console.log('✅ 数据库连接正常');
      console.log(`📋 数据库状态:`);
      console.log(`  连接状态: ${response.data.data.connected}`);
      console.log(`  数据库名: ${response.data.data.database}`);
      console.log(`  连接数: ${response.data.data.connections}`);
      console.log(`  响应时间: ${response.data.data.responseTime}ms`);
      return response.data.data;
    } else {
      throw new Error('数据库连接测试失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试内存使用情况
async function testMemoryUsage() {
  try {
    console.log('\n💾 测试内存使用情况...');
    
    const response = await axios.get(`${BASE_URL}/api/memory/status`);
    
    if (response.data.success) {
      console.log('✅ 内存使用情况正常');
      console.log(`📋 内存信息:`);
      console.log(`  总内存: ${response.data.data.total}MB`);
      console.log(`  已使用: ${response.data.data.used}MB`);
      console.log(`  可用内存: ${response.data.data.free}MB`);
      console.log(`  使用率: ${response.data.data.usage}%`);
      
      if (response.data.data.usage < 80) {
        console.log('✅ 内存使用率正常 (< 80%)');
      } else if (response.data.data.usage < 90) {
        console.log('⚠️ 内存使用率较高 (80-90%)');
      } else {
        console.log('❌ 内存使用率过高 (> 90%)');
      }
      
      return response.data.data;
    } else {
      throw new Error('内存使用情况测试失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 内存使用情况测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试支付提供商状态
async function testPaymentProviderStatus() {
  try {
    console.log('\n🏦 测试支付提供商状态...');
    
    const response = await axios.get(`${BASE_URL}/api/providers/status`);
    
    if (response.data.success) {
      console.log('✅ 支付提供商状态正常');
      console.log(`📋 提供商状态:`);
      
      const providers = response.data.data.providers;
      Object.entries(providers).forEach(([provider, status]) => {
        console.log(`  ${provider}: ${status.status} (${status.responseTime}ms)`);
      });
      
      return providers;
    } else {
      throw new Error('支付提供商状态测试失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 支付提供商状态测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试系统负载
async function testSystemLoad() {
  try {
    console.log('\n⚖️ 测试系统负载...');
    
    const response = await axios.get(`${BASE_URL}/api/load/status`);
    
    if (response.data.success) {
      console.log('✅ 系统负载正常');
      console.log(`📋 负载信息:`);
      console.log(`  CPU负载: ${response.data.data.cpuLoad}`);
      console.log(`  内存负载: ${response.data.data.memoryLoad}`);
      console.log(`  磁盘负载: ${response.data.data.diskLoad}`);
      console.log(`  网络负载: ${response.data.data.networkLoad}`);
      
      return response.data.data;
    } else {
      throw new Error('系统负载测试失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 系统负载测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试错误监控
async function testErrorMonitoring() {
  try {
    console.log('\n🚨 测试错误监控...');
    
    const response = await axios.get(`${BASE_URL}/api/errors/status`);
    
    if (response.data.success) {
      console.log('✅ 错误监控正常');
      console.log(`📋 错误统计:`);
      console.log(`  今日错误数: ${response.data.data.todayErrors}`);
      console.log(`  本周错误数: ${response.data.data.weekErrors}`);
      console.log(`  本月错误数: ${response.data.data.monthErrors}`);
      console.log(`  错误率: ${response.data.data.errorRate}%`);
      
      if (response.data.data.errorRate < 1) {
        console.log('✅ 错误率正常 (< 1%)');
      } else if (response.data.data.errorRate < 5) {
        console.log('⚠️ 错误率较高 (1-5%)');
      } else {
        console.log('❌ 错误率过高 (> 5%)');
      }
      
      return response.data.data;
    } else {
      throw new Error('错误监控测试失败: ' + response.data.message);
    }
  } catch (error) {
    console.error('❌ 错误监控测试失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主测试函数
async function testSystemStatusMain() {
  console.log('🚀 开始测试系统整体状态...\n');
  
  try {
    // 1. 测试系统健康检查
    await testHealthCheck();
    
    // 2. 测试系统状态
    await testSystemStatus();
    
    // 3. 测试API响应时间
    await testAPIResponseTime();
    
    // 4. 测试数据库连接
    await testDatabaseConnection();
    
    // 5. 测试内存使用情况
    await testMemoryUsage();
    
    // 6. 测试支付提供商状态
    await testPaymentProviderStatus();
    
    // 7. 测试系统负载
    await testSystemLoad();
    
    // 8. 测试错误监控
    await testErrorMonitoring();
    
    console.log('\n🎉 系统状态测试完成！');
    console.log('✅ 所有测试通过');
    
  } catch (error) {
    console.error('\n❌ 系统状态测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testSystemStatusMain().catch(console.error);
