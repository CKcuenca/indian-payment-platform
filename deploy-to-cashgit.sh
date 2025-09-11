#!/bin/bash

# 部署到CashGit服务器的脚本
# 使用方法: ./deploy-to-cashgit.sh

echo "🚀 开始部署到CashGit服务器..."
echo "🌐 域名: https://cashgit.com"
echo "🔑 SSH密钥: /Users/kaka/AWS-Key/indian-payment-key-3.pem"

# 线上服务器信息
PRODUCTION_HOST="13.200.72.14"
PRODUCTION_USER="ubuntu"
PRODUCTION_PATH="/home/ubuntu/indian-payment-platform"
SSH_KEY="/Users/kaka/AWS-Key/indian-payment-key-3.pem"

# 检查SSH密钥文件
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH密钥文件不存在: $SSH_KEY"
    echo "请检查密钥文件路径是否正确"
    exit 1
fi

# 设置SSH密钥权限
chmod 600 "$SSH_KEY"

echo "🔑 使用SSH密钥: $SSH_KEY"
echo "📍 目标服务器: $PRODUCTION_USER@$PRODUCTION_HOST"
echo "📁 部署路径: $PRODUCTION_PATH"

# 1. 连接到服务器并拉取最新代码
echo "📥 拉取最新代码..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
    cd /home/ubuntu/indian-payment-platform
    echo "当前目录: $(pwd)"
    echo "拉取最新代码..."
    git pull origin main
    echo "代码更新完成"
EOF

if [ $? -ne 0 ]; then
    echo "❌ 代码拉取失败"
    exit 1
fi

# 2. 安装依赖
echo "📦 安装依赖..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
    cd /home/ubuntu/indian-payment-platform
    echo "安装服务器依赖..."
    npm install --production
    echo "依赖安装完成"
EOF

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 3. 重启服务
echo "🔄 重启服务..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
    cd /home/ubuntu/indian-payment-platform
    echo "停止现有服务..."
    pm2 stop all || true
    pm2 delete all || true
    
    echo "启动新服务..."
    pm2 start ecosystem.config.js
    
    echo "保存PM2配置..."
    pm2 save
    
    echo "查看服务状态..."
    pm2 status
EOF

if [ $? -ne 0 ]; then
    echo "❌ 服务重启失败"
    exit 1
fi

# 4. 检查服务状态
echo "🔍 检查服务状态..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
    echo "=== PM2 服务状态 ==="
    pm2 status
    
    echo "=== 端口监听状态 ==="
    netstat -tlnp | grep :3001 || echo "端口3001未监听"
    
    echo "=== 服务日志 ==="
    pm2 logs --lines 10
EOF

# 5. 检查Nginx配置
echo "🌐 检查Nginx配置..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
    echo "=== Nginx状态 ==="
    sudo systemctl status nginx --no-pager -l
    
    echo "=== Nginx配置测试 ==="
    sudo nginx -t
    
    echo "=== 域名解析测试 ==="
    curl -I https://cashgit.com/api/health 2>/dev/null || echo "HTTPS API不可访问"
EOF

echo "✅ 部署完成！"
echo ""
echo "📋 下一步操作："
echo "1. 运行Postman测试验证API: 导入更新后的集合文件"
echo "2. 检查服务器日志: pm2 logs"
echo "3. 监控服务状态: pm2 monit"
echo "4. 测试域名访问: https://cashgit.com"
echo ""
echo "🔗 线上API地址: https://cashgit.com"
echo "🔗 本地测试地址: http://localhost:3001"
echo ""
echo "📱 Postman测试:"
echo "- 导入: Indian-Payment-Platform-API.postman_collection.json"
echo "- 环境: Indian-Payment-Platform-Environment.postman_environment.json"
echo "- 选择环境: Indian Payment Platform - 环境配置"
