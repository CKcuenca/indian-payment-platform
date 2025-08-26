#!/usr/bin/env node

/**
 * 生产环境配置检查脚本
 * 用于验证生产环境配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始检查生产环境配置...\n');

// 检查环境变量
console.log('📋 环境变量检查:');
const envFile = '.env';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET'
  ];
  
  requiredVars.forEach(varName => {
    const found = envLines.find(line => line.startsWith(varName));
    if (found) {
      const value = found.split('=')[1];
      if (varName === 'JWT_SECRET' && value === 'your-jwt-secret-key-here') {
        console.log(`  ❌ ${varName}: 使用默认值，需要修改`);
      } else if (varName === 'NODE_ENV' && value === 'development') {
        console.log(`  ⚠️  ${varName}: ${value} (建议改为production)`);
      } else {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`  ❌ ${varName}: 未设置`);
    }
  });
} else {
  console.log('  ❌ .env文件不存在');
}

console.log('\n📁 文件结构检查:');
const criticalFiles = [
  'server/index.js',
  'server/models/merchant.js',
  'server/models/order.js',
  'server/models/transaction.js',
  'package.json',
  'ecosystem.config.js'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} 不存在`);
  }
});

console.log('\n🔒 安全检查:');
const serverFile = 'server/index.js';
if (fs.existsSync(serverFile)) {
  const content = fs.readFileSync(serverFile, 'utf8');
  
  // 检查trust proxy配置
  if (content.includes('trust proxy')) {
    if (content.includes('trust proxy", true')) {
      console.log('  ❌ trust proxy设置为true，存在安全风险');
    } else {
      console.log('  ✅ trust proxy配置安全');
    }
  }
  
  // 检查限流配置
  if (content.includes('rateLimit')) {
    console.log('  ✅ 限流中间件已配置');
  } else {
    console.log('  ❌ 限流中间件未配置');
  }
  
  // 检查helmet安全头
  if (content.includes('helmet()')) {
    console.log('  ✅ Helmet安全头已配置');
  } else {
    console.log('  ❌ Helmet安全头未配置');
  }
}

console.log('\n📊 数据库模型检查:');
const modelsDir = 'server/models';
if (fs.existsSync(modelsDir)) {
  const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.js'));
  console.log(`  ✅ 发现 ${modelFiles.length} 个模型文件`);
  
  // 检查是否有errors字段
  modelFiles.forEach(file => {
    const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
    if (content.includes('errors:')) {
      console.log(`  ⚠️  ${file}: 包含errors字段，可能引起MongoDB警告`);
    }
  });
}

console.log('\n🎯 建议:');
console.log('  1. 确保NODE_ENV设置为production');
console.log('  2. 修改JWT_SECRET为强密钥');
console.log('  3. 运行cleanup-test-data.js清理测试数据');
console.log('  4. 检查数据库连接字符串安全性');
console.log('  5. 确保所有API端点都有适当的认证和授权');

console.log('\n✅ 配置检查完成！');
