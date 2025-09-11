# 🏗️ 印度支付平台 - 服务器架构备忘录

## 📅 更新日期: 2025-09-11

## 🌐 AWS服务器基本信息
- **服务器IP**: `13.200.72.14`
- **SSH连接**: `ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14`
- **操作系统**: Ubuntu 22.04.5 LTS
- **内存**: 约23%使用率
- **磁盘**: 约39.5%使用率

## 🔄 双环境部署架构详情

### 🧪 测试环境 (test.cashgit.com)
```
目录: /var/www/test.cashgit.com
PM2 ID: 0
应用名: test-indian-payment-platform
端口: 3000
域名: https://test.cashgit.com
用途: 自动部署、功能测试、开发验证
```

### 🚀 生产环境 (cashgit.com)
```
目录: /var/www/cashgit.com
PM2 ID: 1
应用名: indian-payment-platform
端口: 3001
域名: https://cashgit.com
用途: 正式线上服务、客户使用
```

## 📊 数据库架构
### MongoDB数据库列表
```
admin                          40.00 KiB
cashgit                       220.00 KiB
config                        108.00 KiB
indian-payment-platform        28.00 KiB
indian-payment-platform-test   16.00 KiB
indian_payment_platform       116.00 KiB
local                          72.00 KiB
payment-platform                1.84 MiB  ← 主生产数据库
payment-platform-test         260.00 KiB
test                            8.00 KiB
```

### 生产数据库用户 (payment-platform)
```javascript
// 管理员用户
{
  username: 'admin',
  fullName: '系统管理员',
  role: 'admin',
  status: 'active',
  permissions: [完整管理员权限]
}

// 商户用户
{
  username: 'cgpay',
  fullName: 'cgpay',
  role: 'merchant',
  merchantId: 'cgpay',
  status: 'active',
  permissions: [商户权限]
}
```

## ⚙️ PM2服务管理

### 当前运行状态
```bash
# 标准状态（两个环境同时运行）
┌────┬──────────────────────────────┬─────┬─────────┬────────┬─────────┬────────┬──────┬───────────┐
│ id │ name                         │ ... │ mode    │ pid    │ uptime  │ status │ cpu  │ mem       │
├────┼──────────────────────────────┼─────┼─────────┼────────┼─────────┼────────┼──────┼───────────┤
│ 0  │ test-indian-payment-platform │ ... │ fork    │ xxxxx  │ Xm      │ online │ 0%   │ ~100mb    │
│ 1  │ indian-payment-platform      │ ... │ fork    │ xxxxx  │ Xm      │ online │ 0%   │ ~116mb    │
└────┴──────────────────────────────┴─────┴─────────┴────────┴─────────┴────────┴──────┴───────────┘
```

### 常用管理命令
```bash
# 查看服务状态
pm2 list

# 重启特定服务
pm2 restart 0  # 测试环境
pm2 restart 1  # 生产环境

# 查看实时日志
pm2 logs 0 --lines 20  # 测试环境
pm2 logs 1 --lines 20  # 生产环境

# 监控资源使用
pm2 monit

# 启动服务（如果停止）
pm2 start /var/www/test.cashgit.com/ecosystem.test.config.js      # 测试
pm2 start /var/www/cashgit.com/ecosystem.config.js --env production  # 生产
```

## 🔧 环境配置差异

### 生产环境配置 (/var/www/cashgit.com/env.production)
```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/payment-platform
JWT_SECRET=cashgit-jwt-secret-2024-secure
NODE_OPTIONS="--max-old-space-size=1024 --initial-heap-size=512..."
```

### 测试环境配置
- 使用默认配置或独立的测试配置
- 端口3000
- 可能使用不同的数据库或配置

## 🚨 故障排查步骤

### 1. 服务502错误
```bash
# 检查PM2服务状态
pm2 list

# 如果服务停止，重启对应服务
pm2 restart 1  # 生产环境

# 查看错误日志
pm2 logs 1 --lines 50
```

### 2. 数据库连接问题
```bash
# 检查MongoDB服务
sudo systemctl status mongod

# 重启MongoDB（如需要）
sudo systemctl restart mongod

# 测试数据库连接
mongosh
```

### 3. 端口冲突检查
```bash
# 检查端口占用
netstat -tlnp | grep 3000  # 测试环境
netstat -tlnp | grep 3001  # 生产环境

# 检查Nginx配置
sudo nginx -t
sudo systemctl status nginx
```

## 📋 部署工作流

### 自动部署（测试环境）
```
本地代码 → GitHub推送 → GitHub Actions → 自动部署到test.cashgit.com
```

### 手动部署（生产环境）
```bash
# 在服务器上执行
cd /var/www/cashgit.com
./deploy-production.sh

# 或者手动步骤
git pull origin main
npm install
pm2 restart indian-payment-platform
```

## 🔐 访问凭据

### SSH访问
- 密钥文件: `/Users/kaka/AWS-Key/indian-payment-key-3.pem`
- 连接命令: `ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14`

### 管理员登录
- 网址: https://cashgit.com
- 用户名: `admin`
- 密码: [管理员密码]

### 数据库访问
```bash
# 在服务器上
mongosh
use payment-platform
db.users.find({})
```

## ⚠️ 重要注意事项

1. **双环境隔离**: 测试和生产环境完全独立，数据不共享
2. **自动vs手动**: 测试环境自动部署，生产环境需手动部署确保稳定性
3. **端口分离**: 测试3000，生产3001，避免冲突
4. **数据备份**: 定期备份payment-platform数据库
5. **服务监控**: 定期检查PM2服务状态和资源使用情况
6. **安全更新**: 定期更新系统和依赖包

---
**📝 备注**: 此文档记录了服务器的完整架构信息，在进行任何重大变更前请先更新此文档。