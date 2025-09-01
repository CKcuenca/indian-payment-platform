const performanceMonitor = require('../services/performance-monitor');

/**
 * 性能监控中间件
 */
const performanceMonitorMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // 保存原始的res.end方法
  const originalEnd = res.end;
  
  // 重写res.end方法来捕获响应时间
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // 记录API性能指标
    performanceMonitor.recordApiMetrics(
      req.path,
      req.method,
      duration,
      res.statusCode,
      res.statusCode >= 400 ? new Error(`HTTP ${res.statusCode}`) : null
    );
    
    // 调用原始的end方法
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = performanceMonitorMiddleware;
