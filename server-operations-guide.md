# 🔧 服务器运维操作指南

## 📅 更新日期: 2025-09-11

## 🌐 服务器基本信息
- **服务器IP**: `13.200.72.14`
- **SSH连接**: `ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14`
- **操作系统**: Ubuntu 22.04.5 LTS
- **用户**: ubuntu

---

## 🔐 1. 连接到服务器

### SSH连接
```bash
# 基本连接命令
ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14

# 如果密钥权限有问题，先修复权限
chmod 600 /Users/kaka/AWS-Key/indian-payment-key-3.pem
```

### 连接状态检查
```bash
# 检查连接状态
who
whoami
uptime

# 查看系统信息
lsb_release -a
uname -a
```

---

## 📁 2. 文件和目录操作

### 基础目录导航
```bash
# 查看当前位置
pwd

# 列出文件和目录
ls                    # 基本列表
ls -la               # 详细列表（包含隐藏文件）
ls -lh               # 人性化显示文件大小
ls -lt               # 按修改时间排序

# 查看目录树结构
tree                 # 如果没有安装：sudo apt install tree
tree -L 2            # 只显示2级目录

# 查看指定目录大小
du -sh /var/www/     # 查看www目录总大小
du -h --max-depth=1 /var/www/  # 查看各子目录大小
```

### 重要目录结构
```bash
# 应用目录
ls -la /var/www/
├── cashgit.com/          # 生产环境
└── test.cashgit.com/     # 测试环境

# 查看应用目录详情
ls -la /var/www/cashgit.com/
ls -la /var/www/test.cashgit.com/

# 日志目录
ls -la /var/www/cashgit.com/logs/
ls -la /var/www/test.cashgit.com/logs/
```

### 文件查看和编辑
```bash
# 查看文件内容
cat filename             # 显示全部内容
head -20 filename        # 显示前20行
tail -20 filename        # 显示后20行
tail -f filename         # 实时跟踪文件变化

# 查看大文件
less filename            # 分页查看（q退出）
more filename            # 逐页查看

# 编辑文件
nano filename            # 简单编辑器
vim filename             # 高级编辑器

# 搜索文件内容
grep "关键词" filename
grep -r "关键词" /path/  # 递归搜索目录

# 查找文件
find /var/www/ -name "*.js"        # 查找JS文件
find /var/www/ -name "*config*"    # 查找配置文件
find /var/www/ -type f -mtime -1   # 查找1天内修改的文件
```

---

## 📊 3. 系统资源监控

### 系统状态查看
```bash
# 系统资源总览
htop                 # 交互式进程查看器（推荐）
top                  # 传统进程查看器

# 内存使用情况
free -h              # 内存使用情况
cat /proc/meminfo    # 详细内存信息

# 磁盘使用情况
df -h                # 磁盘空间使用情况
df -i                # inode使用情况

# CPU信息
lscpu                # CPU信息
cat /proc/cpuinfo    # 详细CPU信息

# 系统负载
uptime               # 系统运行时间和负载
w                    # 当前用户和负载
```

### 进程和端口监控
```bash
# 查看所有进程
ps aux               # 所有进程详细信息
ps aux | grep node   # 查找Node.js进程
ps aux | grep nginx  # 查找Nginx进程

# 查看端口占用
netstat -tlnp        # 查看所有监听端口
netstat -tlnp | grep 3000  # 查看3000端口
netstat -tlnp | grep 3001  # 查看3001端口

# 或使用ss命令（推荐）
ss -tlnp             # 查看所有监听端口
ss -tlnp | grep 3000 # 查看3000端口

# 查看特定进程的端口
lsof -i :3000        # 查看3000端口的进程
lsof -i :3001        # 查看3001端口的进程
```

---

## 🔄 4. PM2 服务管理

### PM2 基础操作
```bash
# 查看所有服务状态
pm2 list             # 列出所有应用
pm2 status           # 同上
pm2 ls               # 简化显示

# 查看详细信息
pm2 show 0           # 查看ID为0的应用详情
pm2 show 1           # 查看ID为1的应用详情
pm2 show indian-payment-platform  # 通过名称查看

# 实时监控
pm2 monit            # 实时监控CPU和内存使用
```

### 服务启动和停止
```bash
# 启动服务
pm2 start 0          # 启动ID为0的应用
pm2 start 1          # 启动ID为1的应用
pm2 start ecosystem.config.js --env production  # 通过配置文件启动

# 停止服务
pm2 stop 0           # 停止测试环境
pm2 stop 1           # 停止生产环境
pm2 stop all         # 停止所有服务

# 重启服务
pm2 restart 0        # 重启测试环境
pm2 restart 1        # 重启生产环境
pm2 restart all      # 重启所有服务

# 重新加载（零停机）
pm2 reload 1         # 优雅重启生产环境
pm2 reload all       # 优雅重启所有服务
```

### 服务删除和清理
```bash
# 删除服务
pm2 delete 0         # 删除ID为0的应用
pm2 delete 1         # 删除ID为1的应用
pm2 delete all       # 删除所有应用

# 清理日志
pm2 flush            # 清空所有日志
pm2 flush 1          # 清空ID为1的应用日志

# 保存和恢复配置
pm2 save             # 保存当前PM2配置
pm2 resurrect        # 恢复保存的配置
pm2 startup          # 设置开机自启动
```

---

## 📋 5. 日志查看和管理

### PM2 日志
```bash
# 查看实时日志
pm2 logs             # 查看所有应用日志
pm2 logs 0           # 查看测试环境日志
pm2 logs 1           # 查看生产环境日志
pm2 logs --lines 100 # 查看最近100行日志

# 查看错误日志
pm2 logs --err       # 只看错误日志

# 查看特定时间的日志
pm2 logs --timestamp # 显示时间戳
```

### 应用日志文件
```bash
# 生产环境日志
tail -f /var/www/cashgit.com/logs/out.log      # 输出日志
tail -f /var/www/cashgit.com/logs/err.log      # 错误日志
tail -f /var/www/cashgit.com/logs/combined.log # 综合日志

# 测试环境日志
tail -f /var/www/test.cashgit.com/logs/out-0.log    # 输出日志
tail -f /var/www/test.cashgit.com/logs/err-0.log    # 错误日志

# 查看历史日志
less /var/www/cashgit.com/logs/out.log
head -100 /var/www/cashgit.com/logs/err.log
```

### 系统日志
```bash
# 查看系统日志
sudo journalctl -f   # 实时系统日志
sudo journalctl -u nginx    # Nginx服务日志
sudo journalctl -u mongod   # MongoDB服务日志

# 查看指定时间段的日志
sudo journalctl --since "2024-01-01" --until "2024-01-02"
sudo journalctl --since "1 hour ago"
```

---

## 🗄️ 6. 数据库操作

### MongoDB 服务管理
```bash
# 检查MongoDB服务状态
sudo systemctl status mongod

# 启动/停止/重启MongoDB
sudo systemctl start mongod
sudo systemctl stop mongod
sudo systemctl restart mongod

# 设置开机自启
sudo systemctl enable mongod
```

### MongoDB 数据操作
```bash
# 连接数据库
mongosh              # 连接本地MongoDB

# 在MongoDB shell中的操作
show dbs             # 显示所有数据库
use payment-platform # 切换到指定数据库
show collections     # 显示所有集合

# 查询数据
db.users.find({})    # 查看所有用户
db.users.countDocuments()  # 统计用户数量
db.orders.find().limit(10) # 查看最近10个订单

# 数据备份
mongodump --db payment-platform --out /backup/  # 备份数据库
```

---

## 🌐 7. Nginx 服务管理

### Nginx 基本操作
```bash
# 检查Nginx状态
sudo systemctl status nginx

# 启动/停止/重启Nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx    # 重新加载配置（推荐）

# 测试配置文件
sudo nginx -t        # 测试配置语法
sudo nginx -T        # 显示完整配置
```

### Nginx 配置查看
```bash
# 查看主配置文件
sudo cat /etc/nginx/nginx.conf

# 查看站点配置
sudo cat /etc/nginx/sites-enabled/default
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 🚨 8. 故障排查

### 常见问题诊断
```bash
# 1. 网站无法访问 (502错误)
pm2 list              # 检查应用是否运行
pm2 logs 1 --lines 50 # 查看生产环境错误日志
sudo systemctl status nginx  # 检查Nginx状态

# 2. 数据库连接问题
sudo systemctl status mongod  # 检查MongoDB状态
mongosh               # 尝试连接数据库
netstat -tlnp | grep 27017   # 检查MongoDB端口

# 3. 端口冲突
netstat -tlnp | grep 3001    # 检查端口占用
ps aux | grep node    # 查找Node.js进程
sudo lsof -i :3001    # 查看端口详情

# 4. 磁盘空间不足
df -h                 # 检查磁盘使用率
du -sh /var/log/*     # 检查日志文件大小
sudo find /var/log -name "*.log" -size +100M  # 查找大日志文件
```

### 紧急恢复操作
```bash
# 1. 快速重启所有服务
sudo systemctl restart nginx
sudo systemctl restart mongod
pm2 restart all

# 2. 清理日志释放空间
pm2 flush              # 清空PM2日志
sudo journalctl --vacuum-time=7d  # 清理7天前的系统日志
sudo find /var/log -name "*.log" -mtime +7 -delete  # 删除7天前的日志

# 3. 恢复默认配置
cd /var/www/cashgit.com
git status             # 检查文件状态
git checkout -- .      # 恢复所有文件到最新提交状态
pm2 restart 1          # 重启生产环境
```

---

## 🔧 9. 系统维护

### 定期维护任务
```bash
# 系统更新（谨慎操作）
sudo apt update        # 更新包列表
sudo apt list --upgradable  # 查看可更新的包
sudo apt upgrade       # 升级包（注意！可能影响服务）

# 清理系统
sudo apt autoremove   # 清理不需要的包
sudo apt autoclean    # 清理包缓存

# 检查系统健康状态
df -h                 # 磁盘空间
free -h               # 内存使用
uptime                # 系统负载
sudo systemctl --failed  # 检查失败的服务
```

### 性能优化
```bash
# 查看系统资源使用最多的进程
ps aux --sort=-%cpu | head -10   # CPU使用最多的进程
ps aux --sort=-%mem | head -10   # 内存使用最多的进程

# 查看网络连接
ss -tulpn             # 所有网络连接
ss -tulpn | grep :80  # HTTP连接
ss -tulpn | grep :443 # HTTPS连接

# 查看系统启动时间
systemd-analyze       # 系统启动时间分析
systemd-analyze blame # 各服务启动耗时
```

---

## 📚 10. 常用命令速查表

### 文件操作
| 命令 | 说明 | 示例 |
|------|------|------|
| `ls -la` | 详细列出文件 | `ls -la /var/www/` |
| `cd` | 切换目录 | `cd /var/www/cashgit.com` |
| `pwd` | 显示当前目录 | `pwd` |
| `find` | 查找文件 | `find /var/www/ -name "*.js"` |
| `grep` | 搜索文件内容 | `grep "error" /var/log/nginx/error.log` |
| `tail -f` | 实时查看文件 | `tail -f /var/www/cashgit.com/logs/out.log` |

### 服务管理
| 命令 | 说明 | 示例 |
|------|------|------|
| `pm2 list` | 查看PM2应用 | `pm2 list` |
| `pm2 restart` | 重启应用 | `pm2 restart 1` |
| `pm2 logs` | 查看日志 | `pm2 logs 1 --lines 50` |
| `systemctl status` | 查看服务状态 | `sudo systemctl status nginx` |
| `systemctl restart` | 重启服务 | `sudo systemctl restart nginx` |

### 系统监控
| 命令 | 说明 | 示例 |
|------|------|------|
| `htop` | 进程监控 | `htop` |
| `df -h` | 磁盘使用 | `df -h` |
| `free -h` | 内存使用 | `free -h` |
| `netstat -tlnp` | 端口监听 | `netstat -tlnp \| grep 3001` |
| `ps aux` | 进程列表 | `ps aux \| grep node` |

---

## ⚠️ 安全注意事项

1. **备份重要性**: 操作前先备份重要数据
2. **权限控制**: 只在必要时使用sudo
3. **服务重启**: 生产环境重启服务前先在测试环境验证
4. **日志监控**: 定期清理日志避免磁盘满
5. **系统更新**: 更新系统包前先测试兼容性

---

## 🆘 紧急联系和恢复

### 快速恢复命令
```bash
# 一键恢复脚本
#!/bin/bash
echo "🚨 紧急恢复脚本执行中..."
sudo systemctl restart nginx
sudo systemctl restart mongod
pm2 restart all
pm2 logs --lines 20
echo "✅ 恢复完成，请检查服务状态"
```

### 监控脚本
```bash
# 创建监控脚本
cat > /home/ubuntu/monitor.sh << 'EOF'
#!/bin/bash
echo "=== 系统状态检查 ==="
echo "时间: $(date)"
echo "负载: $(uptime | cut -d',' -f3-)"
echo "内存: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "磁盘: $(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')%"
echo "PM2状态:"
pm2 list --no-colors
echo "============================"
EOF

chmod +x /home/ubuntu/monitor.sh
```

---

**💡 提示**: 将常用命令保存为别名，在 `~/.bashrc` 中添加：
```bash
alias ll='ls -la'
alias pm2l='pm2 list'
alias pm2r='pm2 restart'
alias logs1='pm2 logs 1 --lines 50'
alias nginxr='sudo systemctl restart nginx'
```

重新加载配置：`source ~/.bashrc`