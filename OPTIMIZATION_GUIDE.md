# 印度支付平台优化指南

## 📋 优化概述

本次优化主要解决了以下关键问题：

1. **MongoDB事务错误** - 修复了 `Transaction numbers are only allowed on a replica set member or mongos` 错误
2. **性能监控** - 添加了完整的性能监控系统
3. **缓存机制** - 实现了内存缓存以提升响应速度
4. **数据库优化** - 添加了必要的索引和TTL清理
5. **内存管理** - 优化了PM2配置和内存使用

## 🚀 快速开始

### 1. 运行优化部署脚本

```bash
chmod +x deploy-optimization.sh
./deploy-optimization.sh
```

这个脚本会自动执行所有优化步骤：
- 检查环境依赖
- 安装依赖包
- 优化数据库索引
- 构建客户端
- 启动优化服务
- 执行健康检查

### 2. 手动优化步骤

如果不想使用自动脚本，可以手动执行以下步骤：

#### 步骤1: 优化数据库
```bash
node server/scripts/optimize-database.js
```

#### 步骤2: 重启服务
```bash
# 使用PM2
pm2 restart indian-payment-platform

# 或直接启动
node server/index.js
```

## 🔧 优化详情

### 1. MongoDB事务优化

**问题**: 单机MongoDB不支持事务操作
**解决方案**: 使用顺序操作替代事务

```javascript
// 优化前 - 使用事务（会报错）
const session = await mongoose.startSession();
session.startTransaction();

// 优化后 - 使用顺序操作
await merchant.updateOne({...});
await order.save();
await transaction.save();
```

**文件**: `server/services/concurrency-service.js`

### 2. 性能监控系统

新增了完整的性能监控系统：

#### 性能监控服务
- **文件**: `server/services/performance-monitor.js`
- **功能**: 
  - 系统资源监控（CPU、内存、磁盘）
  - 数据库性能监控
  - API响应时间统计
  - 健康检查

#### 性能监控API
- **文件**: `server/routes/performance.js`
- **端点**:
  - `GET /api/performance/report` - 完整性能报告
  - `GET /api/performance/health` - 健康检查
  - `GET /api/performance/metrics` - 系统指标
  - `GET /api/performance/api-stats` - API统计

#### 使用示例
```bash
# 获取性能报告
curl http://localhost:3001/api/performance/report

# 健康检查
curl http://localhost:3001/api/performance/health

# 系统指标
curl http://localhost:3001/api/performance/metrics
```

### 3. 缓存系统

新增了内存缓存系统：

#### 缓存服务
- **文件**: `server/services/cache-service.js`
- **功能**:
  - 商户信息缓存
  - 订单信息缓存
  - 交易信息缓存
  - API响应缓存
  - 用户会话缓存

#### 使用示例
```javascript
const cacheService = require('./services/cache-service');

// 缓存商户信息
await cacheService.cacheMerchant(merchantId, merchantData);

// 获取缓存的商户信息
const merchant = await cacheService.getCachedMerchant(merchantId);

// 缓存API响应
await cacheService.cacheApiResponse('/api/orders', params, response);
```

### 4. 数据库优化

#### 索引优化
- 为所有主要查询字段添加了索引
- 创建了复合索引以提升查询性能
- 添加了TTL索引用于自动清理过期数据

#### 索引详情
```javascript
// 订单集合索引
{ merchantId: 1, createdAt: -1 }
{ orderId: 1 } // 唯一索引
{ status: 1, createdAt: -1 }
{ provider: 1, status: 1 }

// 交易集合索引
{ merchantId: 1, createdAt: -1 }
{ transactionId: 1 } // 唯一索引
{ orderId: 1 }
{ type: 1, status: 1, createdAt: -1 }

// TTL索引
{ timestamp: 1 } // 30天后自动删除日志
{ status: 1, updatedAt: 1 } // 90天后自动删除失败订单
```

### 5. PM2配置优化

#### 内存优化
- 增加了堆内存限制到1GB
- 移除了 `--optimize-for-size` 标志
- 添加了性能优化参数

#### 配置文件
- **文件**: `ecosystem.config.js`
- **优化参数**:
  ```javascript
  node_args: [
    '--max-old-space-size=1024',    // 1GB堆内存
    '--initial-heap-size=512',      // 512MB初始堆
    '--max-semi-space-size=64',     // 64MB半空间
    '--gc-interval=100'             // GC间隔
  ]
  ```

## 📊 性能指标

### 监控指标

1. **系统指标**
   - CPU使用率
   - 内存使用率
   - 磁盘使用率
   - 系统负载

2. **数据库指标**
   - 连接数
   - 查询性能
   - 索引使用情况
   - 存储大小

3. **API指标**
   - 响应时间
   - 请求数量
   - 错误率
   - 慢查询数量

### 性能基准

优化后的预期性能：

- **API响应时间**: < 200ms (平均)
- **数据库查询**: < 50ms (平均)
- **内存使用率**: < 80%
- **CPU使用率**: < 70%
- **错误率**: < 1%

## 🔍 故障排除

### 常见问题

#### 1. MongoDB连接问题
```bash
# 检查MongoDB状态
sudo systemctl status mongod

# 检查连接字符串
echo $MONGODB_URI
```

#### 2. 内存不足
```bash
# 检查内存使用
free -h

# 检查Node.js内存
node -e "console.log(process.memoryUsage())"
```

#### 3. 性能问题
```bash
# 检查API性能
curl -w "@curl-format.txt" http://localhost:3001/api/performance/health

# 检查数据库性能
node server/scripts/optimize-database.js
```

### 日志分析

#### 查看PM2日志
```bash
pm2 logs indian-payment-platform
```

#### 查看应用日志
```bash
tail -f server.log
```

#### 查看错误日志
```bash
tail -f logs/error.log
```

## 🛠️ 维护指南

### 定期维护任务

#### 1. 数据库维护
```bash
# 每周运行一次
node server/scripts/optimize-database.js
```

#### 2. 缓存清理
```javascript
// 在应用中定期清理缓存
const cacheService = require('./services/cache-service');
cacheService.clear();
```

#### 3. 日志清理
```bash
# 清理30天前的日志
find logs/ -name "*.log" -mtime +30 -delete
```

#### 4. 性能监控
```bash
# 定期检查性能报告
curl http://localhost:3001/api/performance/report
```

### 监控告警

建议设置以下监控告警：

1. **CPU使用率 > 80%**
2. **内存使用率 > 90%**
3. **API响应时间 > 1秒**
4. **错误率 > 5%**
5. **数据库连接数 > 80**

## 📈 性能调优建议

### 1. 应用层优化

- 使用缓存减少数据库查询
- 实现分页查询
- 优化数据库查询
- 使用连接池

### 2. 数据库优化

- 定期分析慢查询
- 优化索引策略
- 使用读写分离
- 定期清理过期数据

### 3. 系统优化

- 调整Node.js内存参数
- 使用负载均衡
- 配置CDN
- 启用压缩

## 🔄 更新和回滚

### 更新流程

1. 备份当前版本
2. 部署新版本
3. 运行健康检查
4. 监控性能指标
5. 确认无问题后完成更新

### 回滚流程

1. 停止新版本服务
2. 恢复旧版本代码
3. 重启服务
4. 验证功能正常

## 📞 技术支持

如遇到问题，请：

1. 查看日志文件
2. 检查性能监控数据
3. 运行健康检查
4. 联系技术支持

---

**优化完成！您的印度支付平台现在具有更好的性能和稳定性。** 🎉
