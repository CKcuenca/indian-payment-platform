#!/bin/bash

echo "=== Nginx配置检查 ==="
echo "时间: $(date)"
echo "===================="

# 检查Nginx配置文件
echo "1. 查找测试环境Nginx配置:"
find /etc/nginx -name "*test*" -o -name "*cashgit*" 2>/dev/null

echo ""
echo "2. 检查Nginx语法:"
nginx -t

echo ""
echo "3. 检查Nginx状态:"
systemctl status nginx --no-pager

echo ""
echo "4. 检查Nginx错误日志 (最后20行):"
tail -20 /var/log/nginx/error.log 2>/dev/null || echo "无法访问错误日志"

echo ""
echo "5. 检查测试环境访问日志 (最后10行):"
tail -10 /var/log/nginx/test.cashgit.com.access.log 2>/dev/null || echo "无法访问访问日志"

echo ""
echo "6. 测试代理配置:"
echo "检查后端服务连接:"
nc -zv localhost 3002 2>&1 || echo "端口3002不可达"

echo ""
echo "7. 建议的Nginx配置检查:"
echo "应该包含类似以下的配置:"
cat << 'EOF'
server {
    server_name test.cashgit.com;
    
    location /api {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF

echo ""
echo "===================="
echo "配置检查完成"