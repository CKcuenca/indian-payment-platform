#!/bin/bash

echo "🚀 快速修复服务器上的API配置问题"

# 连接到服务器并修复构建文件
ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14 << 'EOF'

echo "📍 进入项目目录"
cd /var/www/indian-payment-platform

echo "🔍 检查当前构建文件"
ls -la client/build/static/js/

echo "🔧 修复API配置 - 移除硬编码的域名"
# 备份原文件
cp client/build/static/js/main.*.js client/build/static/js/main.*.js.backup

# 替换硬编码的域名
find client/build/static/js/ -name "main.*.js" -exec sed -i 's|https://cashgit.com||g' {} \;

echo "✅ 修复完成！"
echo "🔄 重启前端服务"
sudo systemctl restart nginx

echo "🏁 修复完成！"
EOF

echo "✅ 服务器修复脚本执行完成"
