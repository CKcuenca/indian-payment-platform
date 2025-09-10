#!/bin/bash

# 紧急部署脚本 - 手动修复测试环境
# 使用方法: 在AWS EC2上运行此脚本

echo "=== 紧急修复测试环境开始 ==="
echo "时间: $(date)"
echo "================================"

# 切换到测试环境目录
cd /var/www/test.cashgit.com || {
    echo "❌ 错误: 无法进入测试环境目录"
    exit 1
}

echo "1. 停止所有相关服务..."
pm2 stop test-indian-payment-platform 2>/dev/null || true
pm2 delete test-indian-payment-platform 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
sleep 3

echo "2. 更新代码..."
git fetch origin
git reset --hard origin/main
git clean -fd
git pull origin main

echo "3. 显示最新提交信息..."
echo "最新提交: $(git log --oneline -1)"

echo "4. 检查必要文件..."
if [ ! -f "ecosystem.test.config.js" ]; then
    echo "❌ 警告: 缺少 ecosystem.test.config.js"
fi

if [ ! -f "server/index.js" ]; then
    echo "❌ 错误: 缺少服务端文件"
    exit 1
fi

echo "5. 安装依赖..."
cd server
npm ci --only=production || {
    echo "❌ 错误: 依赖安装失败"
    exit 1
}

echo "6. 创建日志目录..."
cd /var/www/test.cashgit.com
mkdir -p logs

echo "7. 启动服务..."
if [ -f "ecosystem.test.config.js" ]; then
    echo "使用测试环境配置启动..."
    pm2 start ecosystem.test.config.js
else
    echo "使用默认配置启动..."
    pm2 start server/index.js --name "test-indian-payment-platform" --time \
        --env NODE_ENV=test \
        --env PORT=3002 \
        --log logs/combined.log \
        --error logs/err.log \
        --out logs/out.log
fi

echo "8. 等待服务启动..."
sleep 10

echo "9. 检查PM2状态..."
pm2 status

echo "10. 检查端口监听..."
netstat -tlnp | grep :3002 || echo "⚠️ 警告: 端口3002未监听"

echo "11. 健康检查..."
for i in {1..5}; do
    echo "尝试健康检查 $i/5..."
    if curl -s --connect-timeout 5 http://localhost:3002/api/health; then
        echo "✅ 健康检查通过"
        break
    else
        echo "❌ 健康检查失败，等待5秒..."
        sleep 5
    fi
done

echo "12. 查看最新日志..."
pm2 logs test-indian-payment-platform --lines 20 || tail -20 logs/combined.log

echo "13. Nginx配置测试..."
nginx -t && echo "✅ Nginx配置正确" || echo "❌ Nginx配置有误"

echo "================================"
echo "紧急修复完成: $(date)"
echo "================================"

# 最终状态报告
echo ""
echo "=== 最终状态报告 ==="
echo "PM2进程: $(pm2 list | grep test-indian-payment-platform | wc -l) 个"
echo "端口监听: $(netstat -tlnp | grep :3002 | wc -l) 个"
echo "最新Git提交: $(git log --oneline -1)"
echo "服务器时间: $(date)"