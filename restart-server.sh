#!/bin/bash

echo "🔄 重启后端服务器..."

# 停止现有的服务器进程
echo "1️⃣ 停止现有进程..."
pkill -f "node.*server" || echo "没有找到需要停止的进程"

# 等待进程完全停止
sleep 2

# 启动服务器
echo "2️⃣ 启动服务器..."
cd /Users/kaka/indian-payment-platform
npm run dev &

# 等待服务器启动
echo "3️⃣ 等待服务器启动..."
sleep 5

# 检查服务器状态
echo "4️⃣ 检查服务器状态..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ 服务器启动成功！"
    echo "🌐 服务器地址: http://localhost:3001"
else
    echo "❌ 服务器启动失败，请检查日志"
fi
