# PM2 内存优化部署指南

## 概述
本指南用于部署优化的PM2配置，移除 `--optimize-for-size` 标志，增加堆内存限制到1GB，提升应用性能。

## 文件说明

### 1. ecosystem.config.js
PM2配置文件，包含优化的V8启动参数：
- `--max-old-space-size=1024` (1GB堆内存)
- `--initial-heap-size=512` (512MB初始堆)
- 移除了 `--optimize-for-size` 标志
- 添加了性能优化标志

### 2. deploy-pm2-optimized.sh
部署脚本，自动执行以下步骤：
- 停止当前应用
- 删除旧配置
- 使用新配置启动
- 保存和设置开机自启

### 3. env.production
环境变量配置文件，包含V8优化参数

## 部署步骤

### 在服务器上执行：

1. **上传配置文件**
```bash
scp ecosystem.config.js user@server:/path/to/app/
scp deploy-pm2-optimized.sh user@server:/path/to/app/
```

2. **执行部署脚本**
```bash
cd /path/to/app/
chmod +x deploy-pm2-optimized.sh
./deploy-pm2-optimized.sh
```

3. **验证部署**
```bash
pm2 status
pm2 logs indian-payment-platform
```

## 预期效果

### 部署前：
- 堆内存总大小：39.06MB
- 堆内存使用率：86.55%
- 限制：`--optimize-for-size` 标志

### 部署后：
- 堆内存总大小：1GB (1024MB)
- 堆内存使用率：预期降低到60-80%
- 性能：显著提升
- 稳定性：大幅改善

## 注意事项

1. **重启影响**：部署过程中应用会短暂停止
2. **内存使用**：应用启动时会占用更多内存
3. **监控**：建议部署后监控内存使用情况
4. **回滚**：如需回滚，可以使用 `pm2 start ecosystem.config.js` 的旧版本

## 故障排除

### 如果应用启动失败：
1. 检查PM2日志：`pm2 logs indian-payment-platform`
2. 检查系统内存：`free -h`
3. 检查Node.js版本：`node --version`

### 如果内存没有增加：
1. 确认配置文件已正确上传
2. 确认应用已重启
3. 检查PM2状态：`pm2 status`
4. 验证V8参数：通过API检查内存状态
