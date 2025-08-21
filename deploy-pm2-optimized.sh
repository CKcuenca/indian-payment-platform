#!/bin/bash

echo "=== 部署优化的PM2配置 ==="

# 检查当前PM2状态
echo "1. 检查当前PM2状态..."
pm2 status

# 停止当前应用
echo "2. 停止当前应用..."
pm2 stop indian-payment-platform

# 删除当前应用
echo "3. 删除当前应用..."
pm2 delete indian-payment-platform

# 使用新配置启动应用
echo "4. 使用新配置启动应用..."
pm2 start ecosystem.config.js

# 保存PM2配置
echo "5. 保存PM2配置..."
pm2 save

# 设置PM2开机自启
echo "6. 设置PM2开机自启..."
pm2 startup

# 检查新应用状态
echo "7. 检查新应用状态..."
pm2 status

# 显示应用日志
echo "8. 显示应用启动日志..."
pm2 logs indian-payment-platform --lines 20

echo "=== 部署完成 ==="
echo "新的V8参数："
echo "- --max-old-space-size=1024 (1GB堆内存)"
echo "- --initial-heap-size=512 (512MB初始堆)"
echo "- 移除了 --optimize-for-size 标志"
echo "- 添加了性能优化标志"
