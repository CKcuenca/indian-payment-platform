#!/bin/bash

# 远程诊断脚本 - 快速检查测试环境状态
echo "=== 远程诊断测试环境 ==="
echo "时间: $(date)"
echo "========================="

# 基础连通性测试
echo "1. 测试服务连通性..."
echo "健康检查:"
curl -I --connect-timeout 10 https://test.cashgit.com/api/health 2>&1 | head -5

echo ""
echo "登录接口测试:"
curl -I --connect-timeout 10 https://test.cashgit.com/api/auth/login 2>&1 | head -5

echo ""
echo "2. DNS解析测试..."
nslookup test.cashgit.com

echo ""
echo "3. SSL证书测试..."
echo | openssl s_client -connect test.cashgit.com:443 2>/dev/null | grep -E "(subject|issuer|verify)"

echo ""
echo "4. 服务器响应时间测试..."
time curl -s --connect-timeout 10 https://test.cashgit.com 2>&1 | head -1

echo "========================="
echo "远程诊断完成"