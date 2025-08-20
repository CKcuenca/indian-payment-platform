# CashGit 部署步骤

## 🚀 快速开始

### 1. 创建 AWS EC2 实例

1. **登录 AWS 控制台**
   - 访问：https://console.aws.amazon.com
   - 选择 EC2 服务

2. **启动实例**
   - 点击 "启动实例"
   - 名称：`cashgit-payment-platform`

3. **选择配置**
   - AMI：Ubuntu Server 22.04 LTS
   - 实例类型：t3.small
   - 存储：20 GB gp3 SSD

4. **配置安全组**
   - SSH (22)：0.0.0.0/0
   - HTTP (80)：0.0.0.0/0
   - HTTPS (443)：0.0.0.0/0

5. **创建密钥对**
   - 名称：`cashgit-key`
   - 下载 .pem 文件

6. **启动实例**
   - 记录公网 IP 地址

### 2. 配置域名解析

1. **创建 Route 53 托管区域**
   - 域名：cashgit.com
   - 类型：公共托管区域

2. **添加 DNS 记录**
   ```
   A 记录：@ → 你的EC2公网IP
   CNAME 记录：www → cashgit.com
   ```

### 3. 部署应用

#### 方法一：使用快速部署脚本
```bash
# 在项目根目录执行
./quick-deploy.sh <你的服务器IP> <密钥文件路径>

# 示例
./quick-deploy.sh 1.2.3.4 ~/cashgit-key.pem
```

#### 方法二：手动部署
```bash
# 1. 设置密钥权限
chmod 400 cashgit-key.pem

# 2. 上传项目文件
scp -i cashgit-key.pem -r . ubuntu@你的服务器IP:~/

# 3. 连接到服务器
ssh -i cashgit-key.pem ubuntu@你的服务器IP

# 4. 运行部署脚本
cd ~/indian-payment-platform
chmod +x deploy.sh
./deploy.sh
```

### 4. 配置环境变量

部署完成后，需要更新生产环境配置：

```bash
# 连接到服务器
ssh -i cashgit-key.pem ubuntu@你的服务器IP

# 编辑环境配置
sudo nano /var/www/cashgit/.env
```

**重要配置项：**
```env
# 生成安全的密钥（使用随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
API_KEY_SECRET=your-api-key-secret-change-this-in-production

# AirPay 配置（需要填写真实信息）
AIRPAY_MERCHANT_ID=your-airpay-merchant-id
AIRPAY_API_KEY=your-airpay-api-key
AIRPAY_SECRET_KEY=your-airpay-secret-key

# 服务器配置
SERVER_URL=https://cashgit.com
CORS_ORIGIN=https://cashgit.com
```

### 5. 配置 SSL 证书

```bash
# 连接到服务器
ssh -i cashgit-key.pem ubuntu@你的服务器IP

# 修改邮箱地址
sudo nano /var/www/cashgit/deploy.sh
# 找到 your-email@example.com 并替换为你的邮箱

# 重新运行 SSL 配置
sudo certbot --nginx -d cashgit.com -d www.cashgit.com --non-interactive --agree-tos --email 你的邮箱@example.com
```

## 📊 管理命令

### 应用管理
```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs cashgit-backend

# 重启应用
pm2 restart cashgit-backend

# 停止应用
pm2 stop cashgit-backend
```

### 系统监控
```bash
# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看网络连接
netstat -tlnp
```

### 日志查看
```bash
# PM2 日志
tail -f /var/log/cashgit/combined.log

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MongoDB 日志
tail -f /var/log/mongodb/mongod.log
```

## 🔧 故障排除

### 常见问题

1. **应用无法启动**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :3000
   
   # 检查 PM2 状态
   pm2 status
   
   # 查看错误日志
   pm2 logs cashgit-backend --err
   ```

2. **域名无法访问**
   ```bash
   # 检查 Nginx 状态
   sudo systemctl status nginx
   
   # 检查防火墙
   sudo ufw status
   
   # 测试 DNS 解析
   nslookup cashgit.com
   ```

3. **SSL 证书问题**
   ```bash
   # 检查证书状态
   sudo certbot certificates
   
   # 手动续期
   sudo certbot renew
   ```

## 📈 性能优化

### 系统优化
```bash
# 安装监控工具
sudo apt install -y htop iotop nethogs

# 设置日志轮转
sudo nano /etc/logrotate.d/cashgit
```

### 应用优化
- 前端资源已压缩
- 静态文件缓存配置
- API 响应时间优化
- 数据库查询优化

## 💰 成本控制

### 当前配置成本
- EC2 t3.small：$15/月
- Route 53：$1/月
- 数据传输：$2/月
- **总计：约 $18/月**

### 成本优化建议
1. 使用预留实例（节省 30-60%）
2. 监控使用量，及时调整配置
3. 定期清理日志和临时文件

## 🎉 部署完成

部署完成后，你的 CashGit 支付平台将在以下地址上线：

- **主站**：https://cashgit.com
- **管理后台**：https://cashgit.com
- **API 文档**：https://cashgit.com/api/docs

### 测试账户
- **超级管理员**：admin / Yyw11301107*
- **运营人员**：operator / operator123
- **商户用户**：merchant / merchant123

---

**恭喜！你的 CashGit 支付平台已成功部署！** 🚀 