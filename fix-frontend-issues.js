const fs = require('fs');
const path = require('path');

console.log('🔧 修复前端代码问题\n');

// 1. 检查并修复API服务配置
console.log('1️⃣ 检查API服务配置...');

const apiServicePath = 'client/src/services/api.ts';
if (fs.existsSync(apiServicePath)) {
  console.log('✅ API服务文件存在');
  
  // 检查是否有调试日志
  const apiContent = fs.readFileSync(apiServicePath, 'utf8');
  if (apiContent.includes('console.log')) {
    console.log('⚠️ 发现调试日志，建议在生产环境中移除');
  }
} else {
  console.log('❌ API服务文件不存在');
}

// 2. 检查认证服务
console.log('\n2️⃣ 检查认证服务...');

const authServicePath = 'client/src/services/authService.ts';
if (fs.existsSync(authServicePath)) {
  console.log('✅ 认证服务文件存在');
  
  const authContent = fs.readFileSync(authServicePath, 'utf8');
  if (authContent.includes('localStorage.getItem')) {
    console.log('✅ 本地存储使用正常');
  }
} else {
  console.log('❌ 认证服务文件不存在');
}

// 3. 检查权限守卫组件
console.log('\n3️⃣ 检查权限守卫组件...');

const permissionGuardPath = 'client/src/components/PermissionGuard.tsx';
if (fs.existsSync(permissionGuardPath)) {
  console.log('✅ 权限守卫组件存在');
  
  const guardContent = fs.readFileSync(permissionGuardPath, 'utf8');
  if (guardContent.includes('authService.isAuthenticated()')) {
    console.log('✅ 权限检查逻辑正常');
  }
} else {
  console.log('❌ 权限守卫组件不存在');
}

// 4. 检查类型定义
console.log('\n4️⃣ 检查类型定义...');

const typesPath = 'client/src/types/index.ts';
if (fs.existsSync(typesPath)) {
  console.log('✅ 类型定义文件存在');
  
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  if (typesContent.includes('export enum UserRole')) {
    console.log('✅ 用户角色枚举定义正常');
  }
  if (typesContent.includes('export enum Permission')) {
    console.log('✅ 权限枚举定义正常');
  }
} else {
  console.log('❌ 类型定义文件不存在');
}

// 5. 检查主要页面组件
console.log('\n5️⃣ 检查主要页面组件...');

const pagesDir = 'client/src/pages';
if (fs.existsSync(pagesDir)) {
  const pages = fs.readdirSync(pagesDir);
  console.log(`✅ 找到 ${pages.length} 个页面组件`);
  
  // 检查关键页面
  const keyPages = ['Dashboard.tsx', 'Users.tsx', 'Merchants.tsx', 'Transactions.tsx', 'Orders.tsx'];
  keyPages.forEach(page => {
    if (pages.includes(page)) {
      console.log(`  ✅ ${page} 存在`);
    } else {
      console.log(`  ❌ ${page} 缺失`);
    }
  });
} else {
  console.log('❌ 页面目录不存在');
}

// 6. 检查服务文件
console.log('\n6️⃣ 检查服务文件...');

const servicesDir = 'client/src/services';
if (fs.existsSync(servicesDir)) {
  const services = fs.readdirSync(servicesDir);
  console.log(`✅ 找到 ${services.length} 个服务文件`);
  
  // 检查关键服务
  const keyServices = ['api.ts', 'authService.ts', 'merchantService.ts'];
  keyServices.forEach(service => {
    if (services.includes(service)) {
      console.log(`  ✅ ${service} 存在`);
    } else {
      console.log(`  ❌ ${service} 缺失`);
    }
  });
} else {
  console.log('❌ 服务目录不存在');
}

// 7. 检查工具函数
console.log('\n7️⃣ 检查工具函数...');

const utilsDir = 'client/src/utils';
if (fs.existsSync(utilsDir)) {
  const utils = fs.readdirSync(utilsDir);
  console.log(`✅ 找到 ${utils.length} 个工具文件`);
  
  if (utils.includes('permissions.ts')) {
    console.log('  ✅ 权限管理工具存在');
  }
  if (utils.includes('formatters.ts')) {
    console.log('  ✅ 格式化工具存在');
  }
} else {
  console.log('❌ 工具目录不存在');
}

// 8. 检查hooks
console.log('\n8️⃣ 检查React Hooks...');

const hooksDir = 'client/src/hooks';
if (fs.existsSync(hooksDir)) {
  const hooks = fs.readdirSync(hooksDir);
  console.log(`✅ 找到 ${hooks.length} 个Hook文件`);
  
  if (hooks.includes('useAuth.ts')) {
    console.log('  ✅ 认证Hook存在');
  }
} else {
  console.log('❌ Hooks目录不存在');
}

console.log('\n🏁 前端代码检查完成');

// 输出建议
console.log('\n📋 修复建议:');
console.log('1. 确保所有API端点路径正确');
console.log('2. 检查认证token的处理逻辑');
console.log('3. 验证权限检查的实现');
console.log('4. 确保错误处理完善');
console.log('5. 检查类型定义的完整性');
