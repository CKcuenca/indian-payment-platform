#!/bin/bash

# 部署到线上服务器的脚本
# 使用方法: ./deploy-to-production.sh

echo "🚀 开始部署到线上服务器..."

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

echo "✅ 部署完成！"
echo ""
echo "📋 下一步操作："
echo "1. 运行测试脚本验证API: node test-production-apis.js"
echo "2. 检查服务器日志: pm2 logs"
echo "3. 监控服务状态: pm2 monit"
echo ""
echo "🔗 线上API地址: http://$PRODUCTION_HOST:3001"
