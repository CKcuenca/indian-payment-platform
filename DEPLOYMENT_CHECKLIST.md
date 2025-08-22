# 🚀 PM2内存优化部署检查清单

## 📋 部署前检查

- [ ] 确认代码已推送到GitHub ✅
- [ ] 选择低峰期部署时间
- [ ] 通知相关团队
- [ ] 准备回滚方案
- [ ] 检查服务器状态

## 🔧 部署步骤

### 1. 连接到服务器
```bash
ssh user@your-server-ip
```

### 2. 进入应用目录
```bash
cd /path/to/indian-payment-platform
```

### 3. 拉取最新代码
```bash
git pull origin main
```

### 4. 检查配置文件
```bash
ls -la ecosystem.config.js deploy-pm2-optimized.sh
```

### 5. 执行部署脚本
```bash
chmod +x deploy-pm2-optimized.sh
./deploy-pm2-optimized.sh
```

## ✅ 部署后验证

### 1. 检查PM2状态
```bash
pm2 status
```

### 2. 检查应用日志
```bash
pm2 logs indian-payment-platform --lines 20
```

### 3. 验证内存分配
```bash
curl -H 'X-API-Key: test-api-key-12345' https://cashgit.com/api/memory-management/status
```

### 4. 测试关键功能
- [ ] 支付API响应正常
- [ ] 数据库连接正常
- [ ] 监控系统正常

## 🎯 预期结果

- **堆内存总大小**: 从39MB增加到1GB (1024MB)
- **堆内存使用率**: 从86.55%降低到60-80%
- **应用性能**: 显著提升
- **系统稳定性**: 大幅改善

## 🚨 故障排除

### 如果应用启动失败
```bash
pm2 logs indian-payment-platform
pm2 status
```

### 如果内存没有增加
```bash
# 检查PM2配置
pm2 show indian-payment-platform

# 检查V8参数
curl -H 'X-API-Key: test-api-key-12345' https://cashgit.com/api/memory-optimization/comprehensive-report
```

### 回滚方案
```bash
# 恢复到旧配置
pm2 start ecosystem.config.js.backup
```

## 📞 紧急联系

如果遇到问题，请检查：
1. PM2日志
2. 应用状态
3. 系统资源
4. 网络连接 