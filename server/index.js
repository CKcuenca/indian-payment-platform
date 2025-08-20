const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

// 设置全局时区为印度标准时间 (IST)
process.env.TZ = 'Asia/Kolkata';

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
});

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/merchant', require('./routes/merchant'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payment-config', require('./routes/payment-config'));
app.use('/api', require('./routes/cashgitPayment'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    timezone: process.env.TZ || 'Asia/Kolkata'
  });
});

// 系统状态监控
app.get('/system/status', async (req, res) => {
  try {
    const scheduler = app.get('scheduler');
    const status = await scheduler.getSystemStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

// 手动清理过期订单
app.post('/system/cleanup', async (req, res) => {
  try {
    const scheduler = app.get('scheduler');
    await scheduler.manualCleanup();
    
    res.json({
      success: true,
      message: 'Manual cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform manual cleanup'
    });
  }
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 启动定时任务服务
  const SchedulerService = require('./services/scheduler-service');
  const scheduler = new SchedulerService();
  scheduler.start();
  
  // 将scheduler实例添加到app中，以便其他地方可以访问
  app.set('scheduler', scheduler);
});

module.exports = app;
