const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

// 信任代理设置 - 只信任本地和私有网络
app.set('trust proxy', ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 先注册数据库相关路由，再连接数据库
console.log('🔧 预注册数据库相关路由...');

try {
  app.use('/api/error-monitoring', require('./routes/error-monitoring'));
  app.use('/api/security', require('./routes/security'));
  app.use('/api/limit-management', require('./routes/limit-management'));

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
  
  // 启动PassPay状态同步服务
  const PassPaySyncService = require('./services/passpay-sync-service');
  const passpaySyncService = new PassPaySyncService();
  
  // 延迟5秒启动，确保其他服务已初始化
  setTimeout(() => {
    statusSyncService.start();
    console.log('✅ 支付状态同步服务已启动');
    
    passpaySyncService.start();
    console.log('✅ PassPay状态同步服务已启动');
  }, 5000);
  
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
});

// 基础路由（不依赖数据库）
// 演示端点 - 放在最前面，确保不被任何认证中间件拦截
app.get('/api/demo/merchant-info', (req, res) => {
  console.log('Demo merchant info endpoint accessed - no auth required');
  res.json({
    success: true,
    data: {
      merchantId: 'DEMO001',
      name: '演示商户',
      email: 'demo@example.com',
      status: 'ACTIVE',
      balance: 0,
      paymentConfig: {
        providers: ['mock', 'passpay', 'unispay'],
        defaultProvider: 'mock'
      }
    }
  });
});

app.get('/api/demo/transactions', (req, res) => {
  console.log('Demo transactions endpoint accessed - no auth required');
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    res.json({
      success: true,
      data: {
        transactions: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    console.error('Demo transactions error:', error);
    res.status(500).json({
      success: false,
      error: '获取演示交易历史失败'
    });
  }
});

app.get('/api/demo/orders', (req, res) => {
  console.log('Demo orders endpoint accessed - no auth required');
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    res.json({
      success: true,
      data: {
        orders: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    console.error('Demo orders error:', error);
    res.status(500).json({
      success: false,
      error: '获取演示订单历史失败'
    });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/merchant', require('./routes/merchant')); // 无限流
app.use('/api/providers', require('./routes/providers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payment-config', require('./routes/payment-config'));
app.use('/api/payment-providers', require('./routes/payment-providers'));
app.use('/api', require('./routes/cashgitPayment'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/payment-status', require('./routes/payment-status'));
app.use('/api/status-sync', require('./routes/status-sync'));
app.use('/api/passpay', require('./routes/passpay'));
app.use('/api/heap-optimization', require('./routes/heap-optimization'));
app.use('/api/callback', require('./routes/passpay-callback'));
app.use('/api/passpay-sync', require('./routes/passpay-sync'));
app.use('/api/memory-optimization', require('./routes/memory-optimization'));

// 统一对外接口 - 游戏公司使用
app.use('/api/order', require('./routes/order'));
app.use('/api/payout', require('./routes/payout'));
app.use('/api/balance', require('./routes/balance'));
app.use('/api/upi-query', require('./routes/upi-query'));

// 内部支付商接口 - 保留用于内部调用
app.use('/api/wakeup', require('./routes/wakeup-payment'));
app.use('/api/unispay', require('./routes/unispay-payment'));
app.use('/api/withdraw', require('./routes/withdraw'));
app.use('/api/webhook', require('./routes/withdraw-callback'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    timezone: process.env.TZ || 'Asia/Kolkata'
  });
});

// API健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Indian Payment Platform API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
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
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  // 启动定时任务服务
  const SchedulerService = require('./services/scheduler-service');
  const scheduler = new SchedulerService();
  scheduler.start();
  
  // 将scheduler实例添加到app中，以便其他地方可以访问
  app.set('scheduler', scheduler);
});

// 服务器错误处理
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
