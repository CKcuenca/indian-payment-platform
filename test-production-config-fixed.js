// 测试生产环境配置 - 修复版本
console.log('🔍 测试生产环境配置\n');

// 模拟生产环境变量
process.env.NODE_ENV = 'production';
process.env.REACT_APP_API_URL = undefined;

// 模拟前端的API配置逻辑
const getApiBaseUrl = () => {
  // 1. 优先使用环境变量（最灵活）
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 2. 如果没有环境变量，根据环境选择
  if (process.env.NODE_ENV === 'production') {
    // 生产环境：前端和后端在同一服务器
    // 使用相对路径，请求会自动发送到当前域名
    return '';
  } else {
    // 开发环境：前端在3000端口，后端在3001端口
    return 'http://localhost:3001';
  }
};

const API_BASE_URL = getApiBaseUrl();

console.log('🧪 生产环境配置测试:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('  - 计算出的API_BASE_URL:', API_BASE_URL);
console.log('  - 环境类型:', process.env.NODE_ENV === 'production' ? '生产环境' : '开发环境');

// 测试API请求URL构建
const testApiCall = (endpoint) => {
  const fullUrl = API_BASE_URL + endpoint;
  console.log(`\n🔗 API请求测试:`);
  console.log(`  - 端点: ${endpoint}`);
  console.log(`  - 完整URL: ${fullUrl}`);
  console.log(`  - 是否正确: ${fullUrl === endpoint ? '✅ 相对路径' : '❌ 绝对路径'}`);
  
  return fullUrl;
};

// 测试各种API端点
testApiCall('/api/users');
testApiCall('/api/auth/login');
testApiCall('/api/health');

console.log('\n📋 生产环境配置总结:');
if (API_BASE_URL === '') {
  console.log('✅ 生产环境配置正确：使用相对路径');
  console.log('✅ 前端请求 /api/users 会自动发送到当前域名');
  console.log('✅ 适合同服务器部署架构');
} else {
  console.log('❌ 生产环境配置有问题');
  console.log('❌ 请检查配置逻辑');
}

console.log('\n🏁 生产环境配置测试完成');
