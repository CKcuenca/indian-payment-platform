#!/bin/bash

# CashGit 快速部署脚本
# 适用于已有 EC2 实例的情况

set -e

echo "🚀 CashGit 快速部署开始..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查参数
if [ $# -eq 0 ]; then
    echo "❌ 错误：请提供服务器IP地址"
    echo "用法: ./quick-deploy.sh <服务器IP> [密钥文件路径]"
    echo "示例: ./quick-deploy.sh 1.2.3.4 ~/cashgit-key.pem"
    exit 1
fi

SERVER_IP=$1
KEY_FILE=${2:-"~/cashgit-key.pem"}

echo "📡 连接到服务器: $SERVER_IP"
echo "🔑 使用密钥文件: $KEY_FILE"

# 检查密钥文件是否存在
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ 错误：密钥文件不存在: $KEY_FILE"
    exit 1
fi

# 设置密钥文件权限
chmod 400 "$KEY_FILE"

echo "📦 上传项目文件到服务器..."
scp -i "$KEY_FILE" -r . ubuntu@"$SERVER_IP":~/indian-payment-platform

echo "🔧 在服务器上运行部署脚本..."
ssh -i "$KEY_FILE" ubuntu@"$SERVER_IP" << 'EOF'
cd ~/indian-payment-platform
chmod +x deploy.sh
./deploy.sh
EOF

echo "✅ 部署完成！"
echo "🌐 访问地址: https://cashgit.com"
echo "📊 检查应用状态: ssh -i $KEY_FILE ubuntu@$SERVER_IP 'pm2 status'" 