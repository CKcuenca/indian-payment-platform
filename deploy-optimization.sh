#!/bin/bash

# 印度支付平台优化部署脚本
# 自动执行所有优化步骤

set -e  # 遇到错误立即退出

echo "🚀 开始印度支付平台优化部署..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Node.js版本
check_node_version() {
    log_info "检查Node.js版本..."
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        log_error "Node.js版本过低，需要16或更高版本"
        exit 1
    fi
    log_success "Node.js版本检查通过: $(node --version)"
}

# 检查MongoDB连接
check_mongodb() {
    log_info "检查MongoDB连接..."
    if ! node -e "
        const mongoose = require('mongoose');
        require('dotenv').config();
        mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform')
            .then(() => {
                console.log('MongoDB连接成功');
                process.exit(0);
            })
            .catch(err => {
                console.error('MongoDB连接失败:', err.message);
                process.exit(1);
            });
    "; then
        log_error "MongoDB连接失败"
        exit 1
    fi
    log_success "MongoDB连接检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装服务器依赖..."
    npm install
    
    log_info "安装客户端依赖..."
    cd client
    npm install
    cd ..
    log_success "依赖安装完成"
}

# 运行数据库优化
optimize_database() {
    log_info "运行数据库优化..."
    if node server/scripts/optimize-database.js; then
        log_success "数据库优化完成"
    else
        log_error "数据库优化失败"
        exit 1
    fi
}

# 构建客户端
build_client() {
    log_info "构建客户端..."
    cd client
    if npm run build; then
        log_success "客户端构建完成"
    else
        log_error "客户端构建失败"
        exit 1
    fi
    cd ..
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    
    # 停止PM2进程
    if command -v pm2 &> /dev/null; then
        pm2 stop indian-payment-platform 2>/dev/null || true
        pm2 delete indian-payment-platform 2>/dev/null || true
    fi
    
    # 停止Node.js进程
    pkill -f "node.*server/index.js" 2>/dev/null || true
    
    log_success "现有服务已停止"
}

# 启动优化服务
start_services() {
    log_info "启动优化服务..."
    
    # 使用PM2启动
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        log_success "PM2服务启动完成"
    else
        log_warning "PM2未安装，使用Node.js直接启动"
        nohup node server/index.js > server.log 2>&1 &
        echo $! > server.pid
        log_success "Node.js服务启动完成"
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if curl -f http://localhost:3001/api/performance/health > /dev/null 2>&1; then
        log_success "服务健康检查通过"
    else
        log_error "服务健康检查失败"
        exit 1
    fi
}

# 性能测试
performance_test() {
    log_info "执行性能测试..."
    
    # 简单的性能测试
    echo "测试API响应时间..."
    for i in {1..10}; do
        response_time=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3001/api/performance/health)
        echo "请求 $i: ${response_time}s"
    done
    
    log_success "性能测试完成"
}

# 显示优化报告
show_optimization_report() {
    log_info "生成优化报告..."
    
    echo ""
    echo "=========================================="
    echo "          优化部署完成报告"
    echo "=========================================="
    echo ""
    
    # 获取系统信息
    echo "系统信息:"
    echo "  - 操作系统: $(uname -s) $(uname -r)"
    echo "  - Node.js版本: $(node --version)"
    # macOS使用vm_stat，Linux使用free
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  - 内存: $(sysctl -n hw.memsize | awk '{print $0/1024/1024/1024 " GB"}')"
    else
        echo "  - 内存: $(free -h | grep Mem | awk '{print $2}')"
    fi
    echo "  - 磁盘: $(df -h / | tail -1 | awk '{print $4}') 可用"
    echo ""
    
    # 获取服务状态
    if command -v pm2 &> /dev/null; then
        echo "PM2服务状态:"
        pm2 status
        echo ""
    fi
    
    # 获取性能指标
    echo "性能指标:"
    if curl -s http://localhost:3001/api/performance/metrics > /dev/null 2>&1; then
        curl -s http://localhost:3001/api/performance/metrics | jq '.data.system' 2>/dev/null || echo "  无法获取详细指标"
    else
        echo "  服务未响应"
    fi
    echo ""
    
    echo "优化完成！服务已启动在 http://localhost:3001"
    echo ""
}

# 主函数
main() {
    echo "=========================================="
    echo "    印度支付平台优化部署脚本"
    echo "=========================================="
    echo ""
    
    # 执行优化步骤
    check_node_version
    check_mongodb
    install_dependencies
    optimize_database
    build_client
    stop_services
    start_services
    health_check
    performance_test
    show_optimization_report
    
    log_success "优化部署完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"
