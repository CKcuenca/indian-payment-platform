#!/bin/bash

echo "=== 测试环境快速修复脚本 ==="
echo "开始时间: $(date)"
echo "==============================="

cd /var/www/test.cashgit.com

echo "1. 停止现有服务..."
pm2 stop test-indian-payment-platform || true
pm2 delete test-indian-payment-platform || true

echo "2. 清理进程和端口..."
pkill -f "node.*server" || true
sleep 2

echo "3. 更新代码到最新版本..."
git fetch origin
git reset --hard origin/main
git clean -fd

echo "4. 安装依赖..."
cd server
npm ci --only=production

echo "5. 检查配置文件..."
ls -la ecosystem.test.config.js || echo "❌ 缺少测试环境配置文件"

echo "6. 启动服务..."
pm2 start ecosystem.test.config.js || pm2 start server/index.js --name test-indian-payment-platform

echo "7. 等待服务启动..."
sleep 5

echo "8. 检查服务状态..."
pm2 status
pm2 logs test-indian-payment-platform --lines 10

echo "9. 健康检查..."
curl -s http://localhost:3002/api/health | jq . || curl -s http://localhost:3002/api/health

echo "10. 检查Nginx配置..."
nginx -t

echo "==============================="
echo "修复完成: $(date)"