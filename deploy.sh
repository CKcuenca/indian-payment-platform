#!/bin/bash

# CashGit Payment Platform - AWS Deployment Script
# 适用于 Ubuntu 22.04 LTS

set -e

echo "🚀 开始部署 CashGit 支付平台..."

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18.x
echo "📦 安装 Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证 Node.js 安装
echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装 PM2 进程管理器
echo "📦 安装 PM2..."
sudo npm install -g pm2

# 安装 MongoDB
echo "📦 安装 MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# 启动 MongoDB 服务
echo "🔧 启动 MongoDB 服务..."
sudo systemctl start mongod
sudo systemctl enable mongod

# 安装 Nginx
echo "📦 安装 Nginx..."
sudo apt install -y nginx

# 配置 Nginx
echo "🔧 配置 Nginx..."
sudo tee /etc/nginx/sites-available/cashgit <<EOF
server {
    listen 80;
    server_name cashgit.com www.cashgit.com;
    
    # 前端静态文件
    location / {
        root /var/www/cashgit/client/build;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 启用站点
sudo ln -sf /etc/nginx/sites-available/cashgit /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# 创建应用目录
echo "📁 创建应用目录..."
sudo mkdir -p /var/www/cashgit
sudo chown -R $USER:$USER /var/www/cashgit

# 复制项目文件
echo "📋 复制项目文件..."
cp -r . /var/www/cashgit/
cd /var/www/cashgit

# 安装后端依赖
echo "📦 安装后端依赖..."
npm install

# 安装前端依赖
echo "📦 安装前端依赖..."
cd client
npm install

# 构建前端
echo "🔨 构建前端..."
npm run build

# 返回根目录
cd ..

# 创建环境配置文件
echo "🔧 创建环境配置..."
sudo tee /var/www/cashgit/.env <<EOF
# CashGit Payment Platform Environment Configuration
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cashgit
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
API_KEY_SECRET=your-api-key-secret-change-this-in-production

# AirPay Configuration (需要填写真实的配置)
AIRPAY_MERCHANT_ID=your-airpay-merchant-id
AIRPAY_API_KEY=your-airpay-api-key
AIRPAY_SECRET_KEY=your-airpay-secret-key
AIRPAY_WEBHOOK_URL=https://cashgit.com/api/webhooks/airpay
AIRPAY_ENVIRONMENT=production

# Server Configuration
SERVER_URL=https://cashgit.com
CORS_ORIGIN=https://cashgit.com
EOF

# 创建 PM2 配置文件
echo "🔧 创建 PM2 配置..."
tee ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'cashgit-backend',
    script: 'server/index.js',
    cwd: '/var/www/cashgit',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/cashgit/err.log',
    out_file: '/var/log/cashgit/out.log',
    log_file: '/var/log/cashgit/combined.log',
    time: true
  }]
};
EOF

# 创建日志目录
sudo mkdir -p /var/log/cashgit
sudo chown -R $USER:$USER /var/log/cashgit

# 启动应用
echo "🚀 启动应用..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# 安装 SSL 证书 (Let's Encrypt)
echo "🔒 安装 SSL 证书..."
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cashgit.com -d www.cashgit.com --non-interactive --agree-tos --email your-email@example.com

# 设置自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

echo "✅ 部署完成！"
echo "🌐 访问地址: https://cashgit.com"
echo "📊 PM2 状态: pm2 status"
echo "📋 查看日志: pm2 logs cashgit-backend"
echo "🔄 重启应用: pm2 restart cashgit-backend" 