const https = require('https');
const http = require('http');

console.log('🔍 开始综合服务器状态检查...\n');

// 检查线上服务器状态
async function checkOnlineServer() {
  console.log('🌐 检查线上服务器状态...');
  
  try {
    // 检查HTTPS连接
    const httpsResult = await checkHTTPSConnection();
    console.log('✅ HTTPS连接状态:', httpsResult);
    
    // 检查API健康状态
    const healthResult = await checkHealthAPI();
    console.log('🏥 API健康状态:', healthResult);
    
    // 检查支付配置API
    const configResult = await checkPaymentConfigAPI();
    console.log('⚙️ 支付配置API状态:', configResult);
    
  } catch (error) {
    console.log('❌ 线上服务器检查失败:', error.message);
  }
}

// 检查HTTPS连接
function checkHTTPSConnection() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'cashgit.com',
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'PaymentPlatform-Checker/1.0'
      }
    };

    const req = https.request(options, (res) => {
      resolve({
        status: res.statusCode,
        headers: res.headers,
        secure: true
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
        secure: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Connection timeout',
        secure: false
      });
    });

    req.end();
  });
}

// 检查健康API
function checkHealthAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'cashgit.com',
      port: 443,
      path: '/api/health',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'PaymentPlatform-Checker/1.0'
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
          resolve({
            status: res.statusCode,
            data: response,
            success: true
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            success: false,
            error: 'Invalid JSON'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Connection timeout',
        success: false
      });
    });

    req.end();
  });
}

// 检查支付配置API
function checkPaymentConfigAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'cashgit.com',
      port: 443,
      path: '/api/payment-config',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'PaymentPlatform-Checker/1.0'
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
          resolve({
            status: res.statusCode,
            data: response,
            success: true
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            success: false,
            error: 'Invalid JSON'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Connection timeout',
        success: false
      });
    });

    req.end();
  });
}

// 检查本地服务器状态
async function checkLocalServer() {
  console.log('\n🏠 检查本地服务器状态...');
  
  try {
    // 检查本地端口3001
    const localResult = await checkLocalPort(3001);
    console.log('🔌 本地端口3001状态:', localResult);
    
    // 检查本地API
    const localAPIResult = await checkLocalAPI();
    console.log('🏥 本地API状态:', localAPIResult);
    
  } catch (error) {
    console.log('❌ 本地服务器检查失败:', error.message);
  }
}

// 检查本地端口
function checkLocalPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve({
        port: port,
        status: 'open',
        success: true
      });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        port: port,
        status: 'timeout',
        success: false
      });
    });
    
    socket.on('error', (error) => {
      resolve({
        port: port,
        status: 'error',
        error: error.message,
        success: false
      });
    });
    
    socket.connect(port, 'localhost');
  });
}

// 检查本地API
function checkLocalAPI() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: response,
            success: true
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            success: false,
            error: 'Invalid JSON'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Connection timeout',
        success: false
      });
    });

    req.end();
  });
}

// 检查环境配置
function checkEnvironmentConfig() {
  console.log('\n⚙️ 检查环境配置...');
  
  const fs = require('fs');
  const path = require('path');
  
  // 检查生产环境配置
  if (fs.existsSync('env.production')) {
    console.log('✅ 生产环境配置文件存在');
    const envContent = fs.readFileSync('env.production', 'utf8');
    const portMatch = envContent.match(/PORT=(\d+)/);
    if (portMatch) {
      console.log(`   - 端口配置: ${portMatch[1]}`);
    }
  } else {
    console.log('❌ 生产环境配置文件不存在');
  }
  
  // 检查PM2配置
  if (fs.existsSync('ecosystem.config.js')) {
    console.log('✅ PM2配置文件存在');
    try {
      const pm2Config = require('./ecosystem.config.js');
      console.log(`   - 应用名称: ${pm2Config.apps[0].name}`);
      console.log(`   - 脚本路径: ${pm2Config.apps[0].script}`);
      console.log(`   - 工作目录: ${pm2Config.apps[0].cwd}`);
    } catch (error) {
      console.log('   - PM2配置解析失败:', error.message);
    }
  } else {
    console.log('❌ PM2配置文件不存在');
  }
  
  // 检查部署脚本
  const deployScripts = [
    'deploy-to-cashgit.sh',
    'deploy-to-production.sh',
    'deploy.sh'
  ];
  
  deployScripts.forEach(script => {
    if (fs.existsSync(script)) {
      console.log(`✅ 部署脚本存在: ${script}`);
    } else {
      console.log(`❌ 部署脚本不存在: ${script}`);
    }
  });
}

// 检查Git状态
function checkGitStatus() {
  console.log('\n📦 检查Git状态...');
  
  const { execSync } = require('child_process');
  
  try {
    // 检查当前分支
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    console.log(`✅ 当前分支: ${currentBranch}`);
    
    // 检查是否有未提交的更改
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim() === '') {
      console.log('✅ 工作目录干净，没有未提交的更改');
    } else {
      console.log('⚠️ 有未提交的更改:');
      console.log(status);
    }
    
    // 检查远程分支
    const remoteBranches = execSync('git branch -r', { encoding: 'utf8' });
    console.log('📡 远程分支:');
    remoteBranches.split('\n').filter(branch => branch.trim()).forEach(branch => {
      console.log(`   - ${branch.trim()}`);
    });
    
  } catch (error) {
    console.log('❌ Git状态检查失败:', error.message);
  }
}

// 主函数
async function main() {
  try {
    await checkOnlineServer();
    await checkLocalServer();
    checkEnvironmentConfig();
    checkGitStatus();
    
    console.log('\n🎯 服务器状态检查完成！');
    console.log('\n📋 建议操作：');
    console.log('1. 如果线上服务器不可访问，检查网络和防火墙设置');
    console.log('2. 如果本地服务器未运行，启动开发服务器');
    console.log('3. 如果有配置问题，检查环境配置文件');
    console.log('4. 如果有未提交的更改，提交并推送到远程仓库');
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 运行检查
main();
