#!/bin/bash

echo "🔍 远程诊断测试环境问题..."

# SSH到测试服务器
ssh -i "/Users/kaka/AWS-Key/indian-payment-key-3.pem" -o StrictHostKeyChecking=no ubuntu@13.200.72.14 << 'EOF'
    echo "=== 系统状态检查 ==="
    echo "当前时间: $(date)"
    echo "系统负载: $(uptime)"
    echo ""
    
    echo "=== Git状态检查 ==="
    cd /var/www/test.cashgit.com || echo "测试目录不存在"
    if [ -d ".git" ]; then
        echo "最新提交: $(git log --oneline -1)"
        echo "当前分支: $(git branch --show-current)"
        echo "Git状态: $(git status --porcelain)"
    else
        echo "❌ Git仓库不存在"
    fi
    echo ""
    
    echo "=== 环境配置检查 ==="
    if [ -f "env.test" ]; then
        echo "✅ env.test 存在"
        echo "env.test内容:"
        cat env.test
    else
        echo "❌ env.test 不存在"
    fi
    echo ""
    
    echo "=== PM2进程状态 ==="
    pm2 list
    echo ""
    echo "测试进程详情:"
    pm2 show test-indian-payment-platform 2>/dev/null || echo "测试进程不存在"
    echo ""
    
    echo "=== 端口检查 ==="
    echo "监听的端口:"
    netstat -tlnp | grep -E ':(3001|3002|80|443)'
    echo ""
    
    echo "=== 最近日志 ==="
    if [ -f "logs/err.log" ]; then
        echo "错误日志 (最后20行):"
        tail -20 logs/err.log
    else
        echo "错误日志不存在"
    fi
    echo ""
    
    if [ -f "logs/out.log" ]; then
        echo "输出日志 (最后10行):"
        tail -10 logs/out.log
    else
        echo "输出日志不存在"
    fi
    echo ""
    
    echo "=== 服务测试 ==="
    echo "本地端口3002测试:"
    curl -v --connect-timeout 5 http://localhost:3002/api/health 2>&1 || echo "端口3002无响应"
    echo ""
    
    echo "本地端口3001测试:"
    curl -v --connect-timeout 5 http://localhost:3001/api/health 2>&1 || echo "端口3001无响应"
    echo ""
    
    echo "=== MongoDB连接测试 ==="
    if command -v mongo &> /dev/null; then
        echo "MongoDB服务状态:"
        sudo systemctl status mongod --no-pager -l | head -5
    elif command -v mongosh &> /dev/null; then
        echo "MongoDB (mongosh) 可用"
        mongosh --eval "db.runCommand({ping: 1})" mongodb://localhost:27017/payment-platform-test --quiet || echo "MongoDB连接失败"
    else
        echo "MongoDB客户端不可用"
    fi
    echo ""
    
    echo "=== Nginx配置检查 ==="
    if command -v nginx &> /dev/null; then
        echo "Nginx配置测试:"
        sudo nginx -t
        echo ""
        echo "test.cashgit.com配置:"
        if [ -f "/etc/nginx/sites-enabled/test.cashgit.com" ]; then
            grep -A5 -B5 "3002\|proxy_pass" /etc/nginx/sites-enabled/test.cashgit.com
        else
            echo "test.cashgit.com配置文件不存在"
        fi
    else
        echo "Nginx未安装"
    fi
    
EOF

echo "🔍 诊断完成！"