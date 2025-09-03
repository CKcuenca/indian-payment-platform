#!/bin/bash

# 清理线上服务器无用测试脚本
echo "🧹 开始清理线上服务器无用测试脚本..."

# 连接到线上服务器
ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14 << 'EOF'
cd /var/www/cashgit.com

echo "📊 清理前文件统计:"
echo "总文件数: $(ls -1 | wc -l)"
echo "测试脚本数: $(ls -1 | grep -E '^(test-|check-|create-|debug-|fix-|reset-|unlock-|update-|delete-|recreate-|simple-|cleanup-)' | wc -l)"

echo ""
echo "🗑️ 开始删除测试脚本..."

# 删除测试脚本
ls -1 | grep -E '^(test-|check-|create-|debug-|fix-|reset-|unlock-|update-|delete-|recreate-|simple-|cleanup-)' | while read file; do
    echo "删除: $file"
    rm -f "$file"
done

echo ""
echo "📊 清理后文件统计:"
echo "总文件数: $(ls -1 | wc -l)"
echo "剩余测试脚本数: $(ls -1 | grep -E '^(test-|check-|create-|debug-|fix-|reset-|unlock-|update-|delete-|recreate-|simple-|cleanup-)' | wc -l)"

echo ""
echo "🎉 线上服务器测试脚本清理完成！"
EOF

echo "✅ 清理脚本执行完成"
