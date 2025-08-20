# 部署指南

## 本地开发环境

### 1. 安装Node.js

访问 [Node.js官网](https://nodejs.org/) 下载并安装Node.js 16+版本。

### 2. 安装MongoDB

#### macOS (使用Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Windows
下载MongoDB安装包并安装，或使用Docker。

### 3. 安装项目依赖

```bash
cd indian-payment-platform
npm install
```

### 4. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的参数：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/payment-platform

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here

# AirPay配置
AIRPAY_MERCHANT_ID=your-airpay-merchant-id
AIRPAY_API_KEY=your-airpay-api-key
AIRPAY_SECRET_KEY=your-airpay-secret-key
AIRPAY_SANDBOX=true
```

### 5. 启动服务

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务将在 http://localhost:3000 启动。

### 6. 测试API

```bash
node test-api.js
```

## 云服务器部署

### AWS EC2部署

#### 1. 准备EC2实例

- 实例类型：t3.medium (2核4G) 或更高
- 操作系统：Ubuntu 20.04 LTS
- 安全组：开放80、443、3000端口

#### 2. 连接服务器

```bash
ssh -i your-key.pem ubuntu@your-server-ip
```

#### 3. 安装必要软件

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt install nginx -y
```

#### 4. 部署代码

```bash
# 创建应用目录
sudo mkdir -p /var/www/payment-platform
sudo chown ubuntu:ubuntu /var/www/payment-platform

# 上传代码到服务器
# 可以使用git clone或scp等方式

cd /var/www/payment-platform

# 安装依赖
npm install --production

# 配置环境变量
cp .env.example .env
# 编辑.env文件，配置生产环境参数
```

#### 5. 配置Nginx

创建Nginx配置文件：

```bash
sudo nano /etc/nginx/sites-available/payment-platform
```

配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/payment-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. 配置SSL证书

使用Let's Encrypt免费SSL证书：

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

#### 7. 启动应用

```bash
# 使用PM2启动应用
pm2 start server/index.js --name payment-platform

# 设置PM2开机自启
pm2 startup
pm2 save
```

#### 8. 配置防火墙

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Docker部署

#### 1. 创建Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server/index.js"]
```

#### 2. 创建docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/payment-platform
      - JWT_SECRET=your-jwt-secret
      - AIRPAY_MERCHANT_ID=your-merchant-id
      - AIRPAY_API_KEY=your-api-key
      - AIRPAY_SECRET_KEY=your-secret-key
      - AIRPAY_SANDBOX=false
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

#### 3. 启动服务

```bash
docker-compose up -d
```

## 监控和日志

### 1. 日志配置

创建日志目录：

```bash
mkdir -p logs
```

配置日志轮转：

```bash
sudo nano /etc/logrotate.d/payment-platform
```

配置内容：

```
/var/www/payment-platform/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
```

### 2. 监控配置

使用PM2监控：

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs payment-platform

# 监控资源使用
pm2 monit
```

### 3. 备份策略

#### MongoDB备份

```bash
# 创建备份脚本
nano /var/www/payment-platform/backup.sh
```

脚本内容：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db payment-platform --out $BACKUP_DIR/backup_$DATE
find $BACKUP_DIR -name "backup_*" -mtime +7 -delete
```

设置定时任务：

```bash
chmod +x /var/www/payment-platform/backup.sh
crontab -e
# 添加：0 2 * * * /var/www/payment-platform/backup.sh
```

## 安全配置

### 1. 防火墙设置

```bash
# 只开放必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. 数据库安全

```bash
# 配置MongoDB认证
sudo nano /etc/mongod.conf
```

添加认证配置：

```yaml
security:
  authorization: enabled
```

创建管理员用户：

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "your-admin-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
})
```

### 3. 应用安全

- 使用强密码和API密钥
- 定期更新依赖包
- 启用HTTPS
- 配置IP白名单
- 监控异常访问

## 性能优化

### 1. 数据库优化

```javascript
// 创建索引
db.orders.createIndex({ "merchantId": 1, "createdAt": -1 })
db.transactions.createIndex({ "merchantId": 1, "createdAt": -1 })
db.merchants.createIndex({ "merchantId": 1 })
```

### 2. 应用优化

- 启用压缩
- 配置缓存
- 使用CDN
- 负载均衡

### 3. 监控指标

- CPU使用率
- 内存使用率
- 磁盘I/O
- 网络流量
- 响应时间
- 错误率

## 故障排除

### 1. 常见问题

#### 服务无法启动
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查日志
pm2 logs payment-platform
```

#### 数据库连接失败
```bash
# 检查MongoDB状态
sudo systemctl status mongod

# 检查连接字符串
echo $MONGODB_URI
```

#### API调用失败
```bash
# 检查网络连接
curl -I http://localhost:3000/health

# 检查防火墙
sudo ufw status
```

### 2. 日志分析

```bash
# 查看错误日志
tail -f logs/error.log

# 查看访问日志
tail -f logs/access.log
```

## 更新部署

### 1. 代码更新

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 重启服务
pm2 restart payment-platform
```

### 2. 数据库迁移

```bash
# 备份数据
mongodump --db payment-platform

# 执行迁移脚本
node scripts/migrate.js

# 验证数据
node scripts/verify.js
```

## 联系支持

如遇到部署问题，请联系技术支持：

- 邮箱: support@yourplatform.com
- 文档: https://docs.yourplatform.com
- 社区: https://community.yourplatform.com
