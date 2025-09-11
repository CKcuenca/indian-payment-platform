#!/bin/bash

echo "🚨 紧急修复测试环境..."

# SSH到服务器进行修复
ssh -i "/Users/kaka/AWS-Key/indian-payment-key-3.pem" -o StrictHostKeyChecking=no ubuntu@13.200.72.14 << 'EOF'
    echo "=== 紧急修复开始 ==="
    cd /var/www/test.cashgit.com
    
    echo "1. 停止错误的进程..."
    pm2 stop test-indian-payment-platform || true
    pm2 delete test-indian-payment-platform || true
    
    echo "2. 查看进程启动错误..."
    if [ -f "/home/ubuntu/.pm2/logs/test-indian-payment-platform-error.log" ]; then
        echo "PM2错误日志:"
        tail -20 /home/ubuntu/.pm2/logs/test-indian-payment-platform-error.log
    fi
    
    if [ -f "logs/err-4.log" ]; then
        echo "应用错误日志:"
        tail -20 logs/err-4.log
    fi
    
    echo "3. 检查必要文件..."
    ls -la env.test server/index.js
    
    echo "4. 手动测试Node.js启动..."
    cd server
    export NODE_ENV=test
    export PORT=3002
    echo "测试启动命令: NODE_ENV=test PORT=3002 node index.js"
    timeout 10s node index.js 2>&1 || echo "启动失败"
    
    echo "5. 检查依赖..."
    npm list --depth=0 2>/dev/null | head -10
    
    echo "6. 使用简化配置重新启动..."
    cd /var/www/test.cashgit.com
    
    # 确保环境变量正确设置
    export NODE_ENV=test
    export PORT=3002
    export MONGODB_URI=mongodb://localhost:27017/payment-platform-test
    
    # 直接启动，不使用生态系统配置
    pm2 start server/index.js \
        --name "test-indian-payment-platform" \
        --time \
        --env NODE_ENV=test \
        --env PORT=3002 \
        --env MONGODB_URI=mongodb://localhost:27017/payment-platform-test \
        --log logs/combined.log \
        --error logs/err.log \
        --out logs/out.log \
        --restart-delay=3000 \
        --max-restarts=3
    
    echo "7. 等待服务启动..."
    sleep 5
    
    echo "8. 验证启动结果..."
    pm2 list | grep test-indian-payment-platform
    netstat -tlnp | grep :3002 || echo "端口3002仍未监听"
    
    # 尝试访问健康检查
    curl -s http://localhost:3002/api/health || echo "健康检查失败"
    
    echo "=== 紧急修复完成 ==="
EOF

echo "🚨 紧急修复完成！"