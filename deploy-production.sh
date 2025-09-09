#!/bin/bash

# 生产环境部署脚本
# 使用方法: ./deploy-production.sh

set -e

# 配置
SERVER_HOST="13.200.72.14"
SSH_KEY="/Users/kaka/AWS-Key/indian-payment-key-3.pem"
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

# 检查测试环境状态
check_test_environment() {
    echo_step "检查测试环境状态..."
    
    local test_health=$(ssh -i $SSH_KEY ubuntu@$SERVER_HOST "curl -s http://localhost:3002/api/health | grep -o '\"status\":\"[^\"]*\"' || echo 'failed'")
    
    if [[ $test_health == *"OK"* ]]; then
        echo_info "测试环境运行正常"
        return 0
    else
        echo_error "测试环境状态异常: $test_health"
        return 1
    fi
}

# 确认部署
confirm_deployment() {
    echo_warn "即将部署到生产环境！"
    echo "请确认："
    echo "1. 测试环境功能正常"
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
    
    ssh -i $SSH_KEY ubuntu@$SERVER_HOST "
        cd $PROD_PATH
        if [ -d 'backup' ]; then
            rm -rf backup
        fi
        mkdir -p backup
        cp -r client/build backup/client_build_\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        cp -r server backup/server_\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        echo 'Production backup completed'
    "
    
    echo_info "生产环境备份完成"
}

# 同步代码到生产环境
sync_to_production() {
    echo_step "同步代码到生产环境..."
    
    ssh -i $SSH_KEY ubuntu@$SERVER_HOST "
        cd $PROD_PATH
        
        # 停止生产环境服务
        pm2 stop indian-payment-platform || true
        sleep 3
        
        # 同步Git仓库
        git fetch origin
        git reset --hard origin/main
        git clean -fd
        
        echo 'Production Git sync completed'
    "
    
    echo_info "代码同步完成"
}

# 部署前端
deploy_frontend() {
    echo_step "部署前端到生产环境..."
    
    # 在本地构建前端
    echo_info "在本地构建前端..."
    cd client
    npm run build
    cd ..
    
    # 同步构建后的文件
    rsync -avz --delete -e "ssh -i $SSH_KEY" \
        client/build/ ubuntu@$SERVER_HOST:$PROD_PATH/client/build/
    
    echo_info "前端部署完成"
}

# 部署后端
deploy_backend() {
    echo_step "部署后端到生产环境..."
    
    # 同步后端文件
    rsync -avz --delete -e "ssh -i $SSH_KEY" \
        server/ ubuntu@$SERVER_HOST:$PROD_PATH/server/
    
    # 重启后端服务
    ssh -i $SSH_KEY ubuntu@$SERVER_HOST "
        cd $PROD_PATH/server
        npm ci --only=production
        pm2 restart indian-payment-platform
    "
    
    echo_info "后端部署完成"
}

# 验证部署
verify_deployment() {
    echo_step "验证生产环境部署..."
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    local prod_status=$(ssh -i $SSH_KEY ubuntu@$SERVER_HOST "pm2 list | grep indian-payment-platform | grep -o 'online\\|errored\\|stopped' || echo 'not_found'")
    
    if [[ $prod_status == "online" ]]; then
        echo_info "生产环境服务运行正常"
    else
        echo_error "生产环境服务状态异常: $prod_status"
        return 1
    fi
    
    # 健康检查
    local prod_health=$(ssh -i $SSH_KEY ubuntu@$SERVER_HOST "curl -s http://localhost:3001/api/health | grep -o '\"status\":\"[^\"]*\"' || echo 'failed'")
    
    if [[ $prod_health == *"OK"* ]]; then
        echo_info "生产环境健康检查通过"
    else
        echo_error "生产环境健康检查失败: $prod_health"
        return 1
    fi
    
    echo_info "生产环境部署验证完成"
}

# 显示部署结果
show_deployment_result() {
    echo_step "部署结果"
    
    ssh -i $SSH_KEY ubuntu@$SERVER_HOST "
        echo '=== 生产环境状态 ==='
        echo 'Git提交: \$(cd $PROD_PATH && git log --oneline -1)'
        echo 'PM2进程: \$(pm2 list | grep indian-payment-platform)'
        echo '健康检查: \$(curl -s http://localhost:3001/api/health | grep -o '\"environment\":\"[^\"]*\"' || echo 'Health check failed')'
        echo '===================='
    "
    
    echo_info "生产环境部署完成！"
    echo "访问地址: https://cashgit.com"
}

# 主函数
main() {
    echo_info "开始生产环境部署流程..."
    
    # 检查测试环境
    if ! check_test_environment; then
        echo_error "测试环境检查失败，请先修复测试环境"
        exit 1
    fi
    
    # 确认部署
    confirm_deployment
    
    # 备份生产环境
    backup_production
    
    # 同步代码
    sync_to_production
    
    # 部署前端
    deploy_frontend
    
    # 部署后端
    deploy_backend
    
    # 验证部署
    if ! verify_deployment; then
        echo_error "部署验证失败，请检查日志"
        exit 1
    fi
    
    # 显示结果
    show_deployment_result
}

# 执行主函数
main "$@"


