#!/bin/bash

# 检查CashGit服务器配置的脚本
# 使用方法: ./check-server-config.sh

echo "🔍 检查CashGit服务器配置..."
echo "🌐 域名: https://cashgit.com"
echo "🔑 SSH密钥: /Users/kaka/AWS-Key/indian-payment-key-3.pem"

# 服务器信息
PRODUCTION_HOST="13.200.72.14"
PRODUCTION_USER="ubuntu"
SSH_KEY="/Users/kaka/AWS-Key/indian-payment-key-3.pem"

# 检查SSH密钥文件
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH密钥文件不存在: $SSH_KEY"
    exit 1
fi

# 设置SSH密钥权限
chmod 600 "$SSH_KEY"

echo "🔑 连接到服务器: $PRODUCTION_USER@$PRODUCTION_HOST"

# 检查服务器配置
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
    echo "=== 系统信息 ==="
    echo "操作系统: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
    echo "内核版本: $(uname -r)"
    echo "内存使用: $(free -h | grep Mem | awk '{print $3"/"$2}')"
    echo "磁盘使用: $(df -h / | tail -1 | awk '{print $5}')"
    
    echo ""
    echo "=== Node.js环境 ==="
    echo "Node版本: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "NPM版本: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "PM2版本: $(pm2 --version 2>/dev/null || echo 'Not installed')"
    
    echo ""
    echo "=== 服务状态 ==="
    echo "PM2进程:"
    pm2 status 2>/dev/null || echo "PM2未运行"
    
    echo ""
    echo "=== 端口监听 ==="
    echo "端口3001: $(netstat -tlnp 2>/dev/null | grep :3001 || echo '未监听')"
    echo "端口80: $(netstat -tlnp 2>/dev/null | grep :80 || echo '未监听')"
    echo "端口443: $(netstat -tlnp 2>/dev/null | grep :443 || echo '未监听')"
    
    echo ""
    echo "=== Nginx状态 ==="
    if command -v nginx &> /dev/null; then
        echo "Nginx已安装"
        echo "Nginx状态:"
        sudo systemctl status nginx --no-pager -l 2>/dev/null | head -10
        echo ""
        echo "Nginx配置测试:"
        sudo nginx -t 2>&1
    else
        echo "Nginx未安装"
    fi
    
    echo ""
    echo "=== 防火墙状态 ==="
    if command -v ufw &> /dev/null; then
        echo "UFW状态:"
        sudo ufw status
    elif command -v iptables &> /dev/null; then
        echo "iptables规则:"
        sudo iptables -L -n | head -20
    else
        echo "防火墙未配置"
    fi
    
    echo ""
    echo "=== SSL证书 ==="
    if [ -d "/etc/letsencrypt/live/cashgit.com" ]; then
        echo "Let's Encrypt证书存在"
        echo "证书过期时间:"
        openssl x509 -in /etc/letsencrypt/live/cashgit.com/cert.pem -noout -dates 2>/dev/null || echo "无法读取证书"
    else
        echo "SSL证书不存在: /etc/letsencrypt/live/cashgit.com"
    fi
    
    echo ""
    echo "=== 域名解析 ==="
    echo "本地解析cashgit.com:"
    nslookup cashgit.com 2>/dev/null || echo "nslookup不可用"
    
    echo ""
    echo "=== 网络连接测试 ==="
    echo "测试本地3001端口:"
    curl -I http://localhost:3001/health 2>/dev/null || echo "本地API不可访问"
    
    echo ""
    echo "=== 项目目录 ==="
    if [ -d "/home/ubuntu/indian-payment-platform" ]; then
        cd /home/ubuntu/indian-payment-platform
        echo "项目目录: $(pwd)"
        echo "Git状态:"
        git status --porcelain 2>/dev/null || echo "Git状态检查失败"
        echo "最近提交:"
        git log --oneline -5 2>/dev/null || echo "Git日志检查失败"
    else
        echo "项目目录不存在: /home/ubuntu/indian-payment-platform"
    fi
EOF

echo ""
echo "✅ 服务器配置检查完成！"
echo ""
echo "📋 下一步操作建议："
echo "1. 如果Nginx未安装，请先安装Nginx"
echo "2. 如果SSL证书不存在，请配置Let's Encrypt"
echo "3. 如果防火墙阻止，请开放必要端口"
echo "4. 运行部署脚本: ./deploy-to-cashgit.sh"
