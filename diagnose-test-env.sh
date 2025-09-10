#!/bin/bash

echo "=== 测试环境诊断脚本 ==="
echo "日期: $(date)"
echo "========================="

echo "1. 检查PM2进程状态:"
pm2 list | grep test-indian-payment-platform || echo "❌ 测试环境进程未找到"

echo ""
echo "2. 检查进程端口监听:"
netstat -tlnp | grep :3002 || echo "❌ 端口3002未被监听"

echo ""
echo "3. 检查服务健康状态:"
curl -s http://localhost:3002/api/health || echo "❌ 健康检查失败"

echo ""
echo "4. 检查最近的PM2日志:"
pm2 logs test-indian-payment-platform --lines 20 || echo "❌ 无法获取日志"

echo ""
echo "5. 检查系统资源:"
free -h
df -h

echo ""
echo "6. 检查Node.js版本:"
node --version
npm --version

echo ""
echo "7. 检查git状态:"
cd /var/www/test.cashgit.com && git log --oneline -3

echo ""
echo "========================="
echo "诊断完成"