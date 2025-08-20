# CashGit 支付平台 - AWS 部署指南

## 📋 部署前准备

### 1. AWS 账户准备
- 注册 AWS 账户
- 设置支付方式
- 创建 IAM 用户（可选，建议使用）

### 2. 域名配置
- 域名：cashgit.com
- 确保域名已购买并可以管理 DNS

## 🖥️ 创建 EC2 实例

### 步骤 1：启动 EC2 实例

1. **登录 AWS 控制台**
   - 访问 https://console.aws.amazon.com
   - 选择 EC2 服务

2. **启动实例**
   - 点击 "启动实例"
   - 实例名称：`cashgit-payment-platform`

3. **选择 AMI**
   - 选择 "Ubuntu Server 22.04 LTS"
   - 架构：x86

4. **选择实例类型**
   - 推荐：`t3.small`
   - CPU：2 vCPU
   - 内存：2 GB RAM
   - 成本：约 $15/月

5. **配置实例**
   - 网络：默认 VPC
   - 子网：选择可用区
   - 自动分配公网 IP：启用

6. **配置存储**
   - 根卷：20 GB gp3 SSD
   - 删除终止时删除：是

7. **配置安全组**
   - 安全组名称：`cashgit-sg`
   - 描述：CashGit Payment Platform Security Group

   **入站规则：**
   ```
   SSH (22) - 来源：0.0.0.0/0
   HTTP (80) - 来源：0.0.0.0/0
   HTTPS (443) - 来源：0.0.0.0/0
   ```

8. **创建密钥对**
   - 密钥对名称：`cashgit-key`
   - 下载 .pem 文件并保存到安全位置

9. **启动实例**
   - 检查配置
   - 点击 "启动实例"

## 🌐 配置域名解析

### 步骤 2：设置 Route 53

1. **创建托管区域**
   - 域名：cashgit.com
   - 类型：公共托管区域

2. **添加 A 记录**
   ```
   名称：@ (根域名)
   类型：A
   值：你的 EC2 实例公网 IP
   TTL：300
   ```

3. **添加 CNAME 记录**
   ```
   名称：www
   类型：CNAME
   值：cashgit.com
   TTL：300
   ```

## 🔑 连接到服务器

### 步骤 3：SSH 连接

1. **设置密钥权限**
   ```bash
   chmod 400 cashgit-key.pem
   ```

2. **连接到服务器**
   ```bash
   ssh -i cashgit-key.pem ubuntu@你的服务器IP
   ```

## 📦 部署应用

### 步骤 4：运行部署脚本

1. **上传项目文件**
   ```bash
   # 在本地执行
   scp -i cashgit-key.pem -r /Users/kaka/indian-payment-platform ubuntu@你的服务器IP:~/
   ```

2. **在服务器上运行部署脚本**
   ```bash
   # 在服务器上执行
   cd ~/indian-payment-platform
   chmod +x deploy.sh
   ./deploy.sh
   ```

## ⚙️ 配置环境变量

### 步骤 5：更新 .env 文件

部署完成后，需要更新生产环境配置：

```bash
sudo nano /var/www/cashgit/.env
```

**重要配置项：**
```env
# 生成安全的 JWT 密钥
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 生成安全的 API 密钥
API_KEY_SECRET=your-api-key-secret-change-this-in-production

# AirPay 配置（需要填写真实信息）
AIRPAY_MERCHANT_ID=your-airpay-merchant-id
AIRPAY_API_KEY=your-airpay-api-key
AIRPAY_SECRET_KEY=your-airpay-secret-key

# 更新邮箱地址
# 在 deploy.sh 中修改 your-email@example.com
```

## 🔒 SSL 证书配置

### 步骤 6：配置 HTTPS

1. **修改邮箱地址**
   ```bash
   sudo nano /var/www/cashgit/deploy.sh
   # 找到 your-email@example.com 并替换为你的邮箱
   ```

2. **重新运行 SSL 配置**
   ```bash
   sudo certbot --nginx -d cashgit.com -d www.cashgit.com --non-interactive --agree-tos --email 你的邮箱@example.com
   ```

## 📊 监控和管理

### 常用命令

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs cashgit-backend

# 重启应用
pm2 restart cashgit-backend

# 停止应用
pm2 stop cashgit-backend

# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 日志文件位置

```bash
# PM2 日志
/var/log/cashgit/

# Nginx 日志
/var/log/nginx/

# MongoDB 日志
/var/log/mongodb/
```

## 🔧 故障排除

### 常见问题

1. **应用无法启动**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :3000
   
   # 检查 Node.js 版本
   node --version
   
   # 检查 PM2 状态
   pm2 status
   ```

2. **域名无法访问**
   ```bash
   # 检查 Nginx 状态
   sudo systemctl status nginx
   
   # 检查防火墙
   sudo ufw status
   
   # 检查 DNS 解析
   nslookup cashgit.com
   ```

3. **SSL 证书问题**
   ```bash
   # 检查证书状态
   sudo certbot certificates
   
   # 手动续期
   sudo certbot renew
   ```

4. **数据库连接问题**
   ```bash
   # 检查 MongoDB 状态
   sudo systemctl status mongod
   
   # 连接测试
   mongo --eval "db.runCommand('ping')"
   ```

## 📈 性能优化

### 监控设置

1. **安装监控工具**
   ```bash
   sudo apt install -y htop iotop nethogs
   ```

2. **设置日志轮转**
   ```bash
   sudo nano /etc/logrotate.d/cashgit
   ```

3. **配置自动备份**
   ```bash
   # 创建备份脚本
   sudo nano /var/www/cashgit/backup.sh
   ```

## 🔄 更新部署

### 应用更新流程

1. **上传新代码**
   ```bash
   scp -i cashgit-key.pem -r /Users/kaka/indian-payment-platform ubuntu@你的服务器IP:~/
   ```

2. **重新部署**
   ```bash
   cd ~/indian-payment-platform
   ./deploy.sh
   ```

3. **重启应用**
   ```bash
   pm2 restart cashgit-backend
   ```

## 💰 成本优化

### 成本控制建议

1. **使用预留实例**
   - 1年期：节省 30%
   - 3年期：节省 60%

2. **监控使用量**
   - 设置 CloudWatch 告警
   - 监控成本趋势

3. **优化存储**
   - 定期清理日志
   - 使用 S3 存储静态文件

## 🆘 紧急联系

### 重要信息

- **服务器 IP**：记录你的 EC2 公网 IP
- **域名**：cashgit.com
- **SSH 密钥**：cashgit-key.pem
- **管理员邮箱**：用于 SSL 证书续期

### 备份策略

- **代码备份**：Git 仓库
- **数据库备份**：MongoDB 自动备份
- **配置文件备份**：版本控制

---

**部署完成后，你的 CashGit 支付平台将在 https://cashgit.com 上线！** 🎉 