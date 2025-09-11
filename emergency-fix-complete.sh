#!/bin/bash

# 完整的紧急修复脚本 - 解决502问题
echo "🚨 完整紧急修复开始: $(date)"
echo "=================================="

# 环境检查
if [ "$USER" != "root" ] && [ "$USER" != "ubuntu" ]; then
    echo "⚠️  警告: 请使用root或ubuntu用户执行此脚本"
fi

# 步骤1: 完全清理现有进程
echo "1. 🧹 完全清理现有进程..."
pm2 kill 2>/dev/null || true
pkill -f "node" 2>/dev/null || true
pkill -f "npm" 2>/dev/null || true
sleep 5

# 检查进程清理结果
echo "检查清理结果:"
ps aux | grep -E "(node|npm)" | grep -v grep | wc -l

# 步骤2: 检查端口占用
echo ""
echo "2. 🔍 检查端口占用情况..."
netstat -tlnp | grep -E ":300[1-5]" || echo "没有发现端口占用"

# 步骤3: 进入项目目录并更新代码
echo ""
echo "3. 📁 进入项目目录并更新代码..."
cd /var/www/test.cashgit.com || {
    echo "❌ 无法进入项目目录"
    echo "尝试创建目录..."
    mkdir -p /var/www/test.cashgit.com
    cd /var/www/test.cashgit.com || exit 1
}

# 如果目录是空的，克隆仓库
if [ ! -d ".git" ]; then
    echo "克隆仓库..."
    git clone https://github.com/CKcuenca/indian-payment-platform.git .
fi

# 更新代码
git fetch origin
git reset --hard origin/main
git clean -fd

echo "当前Git状态:"
git log --oneline -1

# 步骤4: 检查Node.js环境
echo ""
echo "4. 🔧 检查Node.js环境..."
node --version
npm --version

# 步骤5: 安装依赖
echo ""
echo "5. 📦 安装服务端依赖..."
cd /var/www/test.cashgit.com/server || exit 1

# 清理旧依赖
rm -rf node_modules package-lock.json
npm cache clean --force

# 重新安装
npm install --only=production

# 步骤6: 检查环境变量
echo ""
echo "6. 🌍 设置环境变量..."
export NODE_ENV=test
export PORT=3002
export MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/payment-platform-test"}

# 步骤7: 创建必要目录
echo ""
echo "7. 📂 创建必要目录..."
mkdir -p /var/www/test.cashgit.com/logs
mkdir -p /var/www/test.cashgit.com/server/logs

# 步骤8: 测试服务启动
echo ""
echo "8. 🧪 测试服务基本启动..."
cd /var/www/test.cashgit.com

# 直接测试node启动
timeout 10s node server/index.js 2>&1 | head -10 &
BASIC_TEST_PID=$!
sleep 5
kill $BASIC_TEST_PID 2>/dev/null || true

# 步骤9: 使用PM2启动
echo ""
echo "9. 🚀 使用PM2启动服务..."

if [ -f "ecosystem.test.config.js" ]; then
    echo "使用测试环境配置启动..."
    pm2 start ecosystem.test.config.js
else
    echo "使用手动配置启动..."
    pm2 start server/index.js \
        --name "test-indian-payment-platform" \
        --time \
        --env NODE_ENV=test \
        --env PORT=3002 \
        --log logs/combined.log \
        --error logs/err.log \
        --out logs/out.log \
        --max-memory-restart 1G \
        --restart-delay 1000
fi

# 步骤10: 验证启动
echo ""
echo "10. ✅ 验证服务启动..."
sleep 10

echo "PM2状态:"
pm2 status

echo ""
echo "端口监听:"
netstat -tlnp | grep :3002

echo ""
echo "进程检查:"
ps aux | grep -E "PM2|node.*server" | grep -v grep

# 步骤11: 健康检查
echo ""
echo "11. 🏥 健康检查..."
for i in {1..10}; do
    echo "健康检查尝试 $i/10..."
    if curl -s --connect-timeout 5 http://localhost:3002/api/health | grep -q "OK"; then
        echo "✅ 健康检查成功!"
        break
    else
        echo "❌ 健康检查失败，等待5秒..."
        sleep 5
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ 健康检查最终失败"
        echo "查看错误日志:"
        pm2 logs test-indian-payment-platform --lines 20
    fi
done

# 步骤12: Nginx重启
echo ""
echo "12. 🔄 重启Nginx..."
nginx -t && systemctl reload nginx

# 最终报告
echo ""
echo "=================================="
echo "🎯 修复完成: $(date)"
echo "=================================="
echo "服务状态: $(pm2 list | grep test-indian-payment-platform | wc -l) 个进程运行"
echo "端口监听: $(netstat -tlnp | grep :3002 | wc -l) 个端口监听"
echo "最新提交: $(git log --oneline -1)"

# 外部访问测试
echo ""
echo "🌐 外部访问测试:"
curl -I --connect-timeout 10 https://test.cashgit.com/api/health 2>&1 | head -3