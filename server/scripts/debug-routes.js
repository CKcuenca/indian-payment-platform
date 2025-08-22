const express = require('express');
const mongoose = require('mongoose');

// 创建测试应用
const app = express();

// 连接数据库
const connectAndTest = async () => {
  try {
    console.log('🚀 开始路由调试...\n');
    
    // 连接数据库
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB连接成功');
    
    // 加载模型
    require('../models/order');
    require('../models/transaction');
    require('../models/merchant');
    require('../models/user');
    require('../models/PaymentConfig');
    require('../models/PaymentStats');
    console.log('✅ 模型加载成功');
    
    // 注册路由
    console.log('\n🔧 注册路由...');
    
    try {
      const errorMonitoringRoute = require('../routes/error-monitoring');
      app.use('/api/error-monitoring', errorMonitoringRoute);
      console.log('✅ error-monitoring 路由注册成功');
    } catch (error) {
      console.log('❌ error-monitoring 路由注册失败:', error.message);
    }
    
    try {
      const securityRoute = require('../routes/security');
      app.use('/api/security', securityRoute);
      console.log('✅ security 路由注册成功');
    } catch (error) {
      console.log('❌ security 路由注册失败:', error.message);
    }
    
    try {
      const limitManagementRoute = require('../routes/limit-management');
      app.use('/api/limit-management', limitManagementRoute);
      console.log('✅ limit-management 路由注册成功');
    } catch (error) {
      console.log('❌ limit-management 路由注册失败:', error.message);
    }
    
    try {
      const monitoringRoute = require('../routes/monitoring');
      app.use('/api/monitoring', monitoringRoute);
      console.log('✅ monitoring 路由注册成功');
    } catch (error) {
      console.log('❌ monitoring 路由注册失败:', error.message);
    }
    
    try {
      const paymentStateRoute = require('../routes/payment-state');
      app.use('/api/payment-state', paymentStateRoute);
      console.log('✅ payment-state 路由注册成功');
    } catch (error) {
      console.log('❌ payment-state 路由注册失败:', error.message);
    }
    
    try {
      
    } catch (error) {
      console.log('❌ database-optimization 路由注册失败:', error.message);
    }
    
    try {
      const testSimpleRoute = require('../routes/test-simple');
      app.use('/api/test', testSimpleRoute);
      console.log('✅ test-simple 路由注册成功');
    } catch (error) {
      console.log('❌ test-simple 路由注册失败:', error.message);
    }
    
    // 检查路由堆栈
    console.log('\n📋 路由堆栈信息:');
    app._router.stack.forEach((middleware, index) => {
      if (middleware.route) {
        console.log(`  ${index}: ${Object.keys(middleware.route.methods).join(',')} ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        console.log(`  ${index}: Router ${middleware.regexp}`);
      }
    });
    
    console.log('\n🎉 路由调试完成');
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行调试
if (require.main === module) {
  connectAndTest();
}

module.exports = { connectAndTest };
