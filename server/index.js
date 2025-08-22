const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { globalErrorHandler } = require('./middleware/error-handler');
require('dotenv').config();

// 设置全局时区为印度标准时间 (IST)
process.env.TZ = 'Asia/Kolkata';

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());
app.use(cors());

// 信任代理设置 - 解决X-Forwarded-For头问题
app.set('trust proxy', true);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// 先注册数据库相关路由，再连接数据库
console.log('🔧 预注册数据库相关路由...');

try {
  app.use('/api/error-monitoring', require('./routes/error-monitoring'));
  app.use('/api/security', require('./routes/security'));
  app.use('/api/limit-management', require('./routes/limit-management'));
  app.use('/api/monitoring', require('./routes/monitoring'));
  app.use('/api/payment-state', require('./routes/payment-state'));
  
  app.use('/api/memory-management', require('./routes/memory-management'));
  app.use('/api/test', require('./routes/test-simple'));
  app.use('/api/debug', require('./routes/debug'));
  
  console.log('✅ Database-dependent routes pre-registered successfully');
} catch (error) {
  console.error('❌ Failed to pre-register database-dependent routes:', error);
}

// 数据库连接
console.log('🔌 开始连接MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // 确保模型被加载
  console.log('📚 加载数据库模型...');
  require('./models/order');
  require('./models/transaction');
  require('./models/merchant');
  require('./models/user');
  require('./models/PaymentConfig');
  require('./models/PaymentStats');
  
  console.log('✅ Models loaded successfully');
  console.log('✅ Database setup completed');
  
  // 启动支付状态同步服务
  const PaymentStatusSyncService = require('./services/payment-status-sync');
  const statusSyncService = new PaymentStatusSyncService();
  
  // 延迟5秒启动，确保其他服务已初始化
  setTimeout(() => {
    statusSyncService.start();
    console.log('✅ 支付状态同步服务已启动');
  }, 5000);
  
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
});

// 基础路由（不依赖数据库）
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/merchant', require('./routes/merchant'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payment-config', require('./routes/payment-config'));
app.use('/api', require('./routes/cashgitPayment'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/payment-status', require('./routes/payment-status'));
app.use('/api/status-sync', require('./routes/status-sync'));
app.use('/api/heap-optimization', require('./routes/heap-optimization'));
app.use('/api/memory-optimization', require('./routes/memory-optimization'));

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

// 全局异常处理中间件 - 必须放在所有路由之后
app.use(globalErrorHandler);

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
