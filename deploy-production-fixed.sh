#!/bin/bash

# 生产环境部署脚本 (服务器端运行版本)
# 使用方法: ./deploy-production-fixed.sh

set -e

# 配置
PROD_PATH="/var/www/cashgit.com"
TEST_PATH="/var/www/test.cashgit.com"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查测试环境状态 (本地检查)
check_test_environment() {
    echo_step "检查测试环境状态..."
    
    if [ -d "$TEST_PATH" ]; then
        local test_health=$(curl -s http://localhost:3000/api/health | grep -o '"status":"[^"]*"' 2>/dev/null || echo 'failed')
        
        if [[ $test_health == *"OK"* ]]; then
            echo_info "测试环境运行正常"
            return 0
        else
            echo_warn "测试环境健康检查异常，但继续部署"
            return 0
        fi
    else
        echo_warn "测试环境目录不存在，跳过检查"
        return 0
    fi
}

# 确认部署
confirm_deployment() {
    echo_warn "即将部署到生产环境！"
    echo "请确认："
    echo "1. 代码已推送到Git"
    echo "2. 所有测试已通过"
    echo "3. 代码已审查"
    echo ""
    read -p "确认部署到生产环境？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo_info "部署已取消"
        exit 0
    fi
}

# 备份生产环境
backup_production() {
    echo_step "备份生产环境..."
    
    cd $PROD_PATH
    if [ -d 'backup' ]; then
        rm -rf backup
    fi
    mkdir -p backup
    cp -r client/build backup/client_build_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    cp -r server backup/server_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    echo_info "生产环境备份完成"
}

# 同步代码到生产环境
sync_to_production() {
    echo_step "同步代码到生产环境..."
    
    cd $PROD_PATH
    
    # 停止生产环境服务
    pm2 stop indian-payment-platform || true
    sleep 3
    
    # 同步Git仓库
    git fetch origin
    git reset --hard origin/main
    git clean -fd
    
    echo_info "代码同步完成"
}

# 部署后端
deploy_backend() {
    echo_step "部署后端到生产环境..."
    
    cd $PROD_PATH/server
    
    # 安装依赖
    npm ci --only=production
    
    # 确保scripts目录存在
    mkdir -p scripts
    
    echo_info "后端依赖安装完成"
}

# 部署前端
deploy_frontend() {
    echo_step "部署前端到生产环境..."
    
    cd $PROD_PATH/client
    
    # 安装依赖并构建
    npm ci
    npm run build
    
    echo_info "前端构建完成"
}

# 重启服务
restart_services() {
    echo_step "重启生产环境服务..."
    
    # 重启生产环境服务
    pm2 restart indian-payment-platform
    
    echo_info "服务重启完成"
}

# 验证部署
verify_deployment() {
    echo_step "验证生产环境部署..."
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    local prod_status=$(pm2 list | grep indian-payment-platform | grep -o 'online\|errored\|stopped' || echo 'not_found')
    
    if [[ $prod_status == "online" ]]; then
        echo_info "生产环境服务运行正常"
    else
        echo_error "生产环境服务状态异常: $prod_status"
        echo_error "查看PM2日志: pm2 logs indian-payment-platform"
        return 1
    fi
    
    # 健康检查
    local prod_health=$(curl -s http://localhost:3001/api/health | grep -o '"status":"[^"]*"' 2>/dev/null || echo 'failed')
    
    if [[ $prod_health == *"OK"* ]]; then
        echo_info "生产环境健康检查通过"
    else
        echo_warn "生产环境健康检查可能失败，但服务已启动"
    fi
    
    echo_info "生产环境部署验证完成"
}

# 显示部署结果
show_deployment_result() {
    echo_step "部署结果"
    
    echo '=== 生产环境状态 ==='
    echo "Git提交: $(cd $PROD_PATH && git log --oneline -1)"
    echo "PM2进程: $(pm2 list | grep indian-payment-platform)"
    echo "健康检查: $(curl -s http://localhost:3001/api/health 2>/dev/null | grep -o '"environment":"[^"]*"' || echo 'Health check pending')"
    echo '===================='
    
    echo_info "生产环境部署完成！"
    echo "访问地址: https://cashgit.com"
    echo "如需执行数据迁移，请运行: node scripts/migrate-merchant-ids.js"
}

# 主函数
main() {
    echo_info "开始生产环境部署流程..."
    
    # 检查当前目录
    if [[ $(pwd) != "$PROD_PATH" ]]; then
        echo_error "请在生产环境目录运行此脚本: $PROD_PATH"
        exit 1
    fi
    
    # 检查测试环境
    check_test_environment
    
    # 确认部署
    confirm_deployment
    
    # 备份生产环境
    backup_production
    
    # 同步代码
    sync_to_production
    
    # 部署后端
    deploy_backend
    
    # 部署前端
    deploy_frontend
    
    # 重启服务
    restart_services
    
    # 验证部署
    if ! verify_deployment; then
        echo_error "部署验证失败，请检查日志: pm2 logs indian-payment-platform"
        exit 1
    fi
    
    # 显示结果
    show_deployment_result
}

# 执行主函数
main "$@"