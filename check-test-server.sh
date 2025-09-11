#!/bin/bash

echo "=== 测试环境服务器配置检查脚本 ==="

# 检查环境变量
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"

# 检查MongoDB连接
echo "MongoDB URI: $MONGODB_URI"

# 检查端口占用
echo "检查端口3002占用情况:"
netstat -tlnp | grep :3002 || echo "端口3002未被占用"

# 检查PM2进程
echo "PM2进程状态:"
pm2 list | grep test-indian-payment-platform || echo "未找到测试进程"

# 检查服务响应
echo "健康检查:"
curl -s --connect-timeout 5 http://localhost:3002/api/health || echo "健康检查失败"

# 查看最近的日志
echo "最近的错误日志:"
if [ -f "/var/www/test.cashgit.com/logs/err.log" ]; then
    tail -10 /var/www/test.cashgit.com/logs/err.log
else
    echo "错误日志文件不存在"
fi