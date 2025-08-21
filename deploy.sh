#!/bin/bash

# 快速部署脚本
# 使用方法: ./deploy.sh [backend|frontend|all]

set -e

# 配置
SERVER_HOST="13.200.72.14"
SSH_KEY="/Users/kaka/AWS-Key/indian-payment-key-3.pem"
REMOTE_PATH="/var/www/cashgit.com"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查参数
if [ $# -eq 0 ]; then
    DEPLOY_TYPE="all"
else
    DEPLOY_TYPE="$1"
fi

echo_info "开始部署: $DEPLOY_TYPE"

# 部署后端
deploy_backend() {
    echo_info "部署后端服务..."
    
    # 同步后端文件
    rsync -avz --delete -e "ssh -i $SSH_KEY" \
        server/ ubuntu@$SERVER_HOST:$REMOTE_PATH/server/
    
    # 重启后端服务
    ssh -i $SSH_KEY ubuntu@$SERVER_HOST "cd $REMOTE_PATH/server && pm2 restart cashgit-backend"
    
    echo_info "后端部署完成"
}

# 部署前端
deploy_frontend() {
    echo_info "部署前端..."
    
    # 在本地构建前端
    echo_info "在本地构建前端..."
    cd client
    npm run build
    cd ..
    
    # 同步构建后的文件
    rsync -avz --delete -e "ssh -i $SSH_KEY" \
        client/build/ ubuntu@$SERVER_HOST:$REMOTE_PATH/client/build/
    
    echo_info "前端部署完成"
}

# 部署全部
deploy_all() {
    deploy_backend
    deploy_frontend
}

# 根据类型执行部署
case $DEPLOY_TYPE in
    "backend")
        deploy_backend
        ;;
    "frontend")
        deploy_frontend
        ;;
    "all")
        deploy_all
        ;;
    *)
        echo_error "无效的部署类型: $DEPLOY_TYPE"
        echo "使用方法: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

echo_info "部署完成!" 