# 测试环境部署方案

## 🎯 目标
在线上服务器创建独立的测试环境，与生产环境完全分离。

## 📋 实施方案：子域名分离

### 1. 域名配置
- **生产环境**: `https://cashgit.com`
- **测试环境**: `https://test.cashgit.com`

### 2. 目录结构
```
/var/www/
├── cashgit.com/          # 生产环境
│   ├── client/
│   ├── server/
│   └── ...
└── test.cashgit.com/     # 测试环境
    ├── client/
    ├── server/
    └── ...
```

### 3. 服务配置
- **生产环境**: PM2进程 `indian-payment-platform` (端口3001)
- **测试环境**: PM2进程 `test-indian-payment-platform` (端口3002)

### 4. 数据库配置
- **生产环境**: MongoDB数据库 `cashgit`
- **测试环境**: MongoDB数据库 `cashgit_test`

### 5. Nginx配置
- 创建独立的虚拟主机配置
- 独立的SSL证书 (Let's Encrypt)
- 独立的日志文件

## 🚀 部署步骤

### 步骤1: 创建测试环境目录
```bash
sudo mkdir -p /var/www/test.cashgit.com
sudo chown -R ubuntu:ubuntu /var/www/test.cashgit.com
```

### 步骤2: 克隆代码到测试环境
```bash
cd /var/www/test.cashgit.com
git clone https://github.com/CKcuenca/indian-payment-platform.git .
```

### 步骤3: 配置测试环境
- 修改端口为3002
- 修改数据库连接为 `cashgit_test`
- 修改环境变量

### 步骤4: 创建测试数据库
```bash
mongosh --eval 'db.runCommand({create: "cashgit_test"})'
```

### 步骤5: 配置Nginx
- 创建 `/etc/nginx/sites-available/test.cashgit.com`
- 启用站点配置
- 申请SSL证书

### 步骤6: 启动测试环境
```bash
pm2 start server/index.js --name test-indian-payment-platform -- --port 3002
```

## 🔧 配置文件示例

### 测试环境服务器配置
```javascript
// server/index.js (测试环境)
const PORT = process.env.PORT || 3002;
const DB_NAME = 'cashgit_test';
```

### Nginx配置
```nginx
server {
    server_name test.cashgit.com;
    
    location / {
        root /var/www/test.cashgit.com/client/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3002;
        # ... 其他代理配置
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/test.cashgit.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/test.cashgit.com/privkey.pem;
}
```

## 📊 资源需求评估

### 磁盘空间
- 代码文件: ~100MB
- 数据库: ~50MB (初始)
- 日志文件: ~10MB/月
- **总计**: ~160MB

### 内存使用
- Node.js进程: ~100MB
- 数据库连接: ~20MB
- **总计**: ~120MB

### 网络带宽
- 与生产环境共享
- 测试流量较小，影响可忽略

## ⚠️ 注意事项

1. **数据隔离**: 确保测试环境使用独立数据库
2. **配置分离**: 测试环境使用测试配置，避免影响生产
3. **监控分离**: 独立的日志和监控
4. **备份策略**: 测试环境也需要定期备份
5. **安全考虑**: 测试环境可能暴露更多调试信息

## 🎯 预期效果

- ✅ 完全独立的环境，互不影响
- ✅ 可以安全地进行功能测试
- ✅ 便于调试和问题排查
- ✅ 支持并行开发和测试


