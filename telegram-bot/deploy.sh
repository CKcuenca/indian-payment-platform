#!/bin/bash

# Telegram机器人部署脚本
# 使用方法: ./deploy.sh [test|production]

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境参数
ENV=${1:-test}
if [[ "$ENV" != "test" && "$ENV" != "production" ]]; then
    print_error "环境参数错误。使用方法: ./deploy.sh [test|production]"
    exit 1
fi

print_info "开始部署Telegram机器人到 $ENV 环境..."

# 检查是否在正确的目录
if [[ ! -f "bot.js" ]]; then
    print_error "请在telegram-bot目录下运行此脚本"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装，请先安装Node.js"
    exit 1
fi

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 未安装，正在安装..."
    npm install -g pm2
    print_success "PM2 安装完成"
fi

# 检查环境文件
if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        print_warning ".env 文件不存在，从 .env.example 复制..."
        cp .env.example .env
        print_warning "请编辑 .env 文件并配置正确的参数后重新运行"
        exit 1
    else
        print_error ".env 和 .env.example 文件都不存在"
        exit 1
    fi
fi

# 验证关键环境变量
source .env
if [[ -z "$TELEGRAM_BOT_TOKEN" ]]; then
    print_error "TELEGRAM_BOT_TOKEN 未设置，请检查 .env 文件"
    exit 1
fi

if [[ -z "$MONGODB_URI" ]]; then
    print_error "MONGODB_URI 未设置，请检查 .env 文件"
    exit 1
fi

# 安装依赖
print_info "安装Node.js依赖..."
npm install --production
print_success "依赖安装完成"

# 创建日志目录
print_info "创建日志目录..."
mkdir -p logs
print_success "日志目录创建完成"

# 检查MongoDB连接
print_info "测试数据库连接..."
node -e "
const mongoose = require('mongoose');
mongoose.connect('$MONGODB_URI', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ 数据库连接测试成功');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 数据库连接测试失败:', err.message);
    process.exit(1);
  });
" || {
    print_error "数据库连接测试失败，请检查 MONGODB_URI 配置"
    exit 1
}

# 停止已存在的进程
print_info "停止现有的机器人进程..."
pm2 delete telegram-bot 2>/dev/null || print_warning "没有找到运行中的机器人进程"

# 启动机器人
print_info "启动Telegram机器人..."
if [[ "$ENV" == "production" ]]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js
fi

# 保存PM2配置
pm2 save

# 设置PM2开机自启
if [[ "$ENV" == "production" ]]; then
    print_info "设置PM2开机自启..."
    pm2 startup || print_warning "PM2开机自启设置失败，请手动设置"
fi

# 等待启动完成
sleep 3

# 检查进程状态
if pm2 list | grep -q "telegram-bot.*online"; then
    print_success "Telegram机器人部署成功！"
    print_info "进程状态:"
    pm2 list | grep telegram-bot
    
    print_info "实时日志查看命令:"
    echo "  pm2 logs telegram-bot"
    
    print_info "其他管理命令:"
    echo "  pm2 restart telegram-bot  # 重启"
    echo "  pm2 stop telegram-bot     # 停止"
    echo "  pm2 delete telegram-bot   # 删除"
    
else
    print_error "Telegram机器人启动失败，请查看日志："
    pm2 logs telegram-bot --lines 20
    exit 1
fi

print_success "部署完成！机器人现在正在运行中..."