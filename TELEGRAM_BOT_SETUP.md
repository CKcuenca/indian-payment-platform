# 🤖 Telegram 机器人快速设置指南

为印度支付平台运营人员提供实时查询功能的Telegram机器人。

## 🚀 快速开始

### 1. 创建Telegram机器人

1. **联系 @BotFather**
   - 在Telegram中搜索 `@BotFather`
   - 发送 `/start` 开始对话
   - 发送 `/newbot` 创建新机器人

2. **设置机器人信息**
   ```
   BotFather: Alright, a new bot. How are we going to call it?
   你: Indian Payment Monitor Bot
   
   BotFather: Good. Now let's choose a username for your bot.
   你: indian_payment_monitor_bot (必须以_bot结尾)
   ```

3. **获取Token**
   - BotFather会返回类似这样的Token：
   - `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ-123456789`
   - **重要**: 保管好这个Token，不要泄露！

### 2. 获取授权用户ID

1. **获取自己的用户ID**
   - 在Telegram中搜索 `@userinfobot`
   - 发送 `/start`
   - 机器人会返回您的用户ID，例如：`123456789`

2. **获取其他用户ID** (可选)
   - 让其他需要使用机器人的同事也向 `@userinfobot` 发送 `/start`
   - 收集所有需要授权的用户ID

### 3. 安装和配置

```bash
# 进入项目目录
cd /Users/kaka/indian-payment-platform

# 进入机器人目录
cd telegram-bot

# 安装依赖
npm install

# 复制环境配置文件
cp .env.example .env
```

### 4. 配置环境变量

编辑 `.env` 文件：

```bash
# Telegram Bot Token (从BotFather获取)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ-123456789

# MongoDB数据库连接 (使用现有的数据库)
MONGODB_URI=mongodb://localhost:27017/payment-platform

# 授权用户ID列表 (逗号分隔，无空格)
AUTHORIZED_TELEGRAM_USERS=123456789,987654321,567891234

# 环境
NODE_ENV=production
```

### 5. 测试连接

```bash
# 运行测试脚本
node test-bot.js
```

如果看到类似输出说明配置正确：
```
✅ 数据库连接成功
📊 数据库统计:
  - 订单总数: 150
  - 商户总数: 5
✅ 测试数据创建成功
🎉 所有测试完成！
```

### 6. 启动机器人

#### 方法一: 使用部署脚本 (推荐)
```bash
./deploy.sh production
```

#### 方法二: 直接启动
```bash
# 开发模式
npm run dev

# 生产模式  
npm start

# 使用PM2 (推荐生产环境)
npm run pm2:start
```

### 7. 验证机器人

1. **在Telegram中找到您的机器人**
   - 搜索您刚才创建的机器人用户名
   - 例如: `@indian_payment_monitor_bot`

2. **发送测试命令**
   ```
   /h      # 查看帮助
   /y      # 查询余额
   /t      # 查看统计
   ```

3. **测试订单查询** (使用测试数据)
   ```
   /s TEST_DEPOSIT_001     # 查询代收订单
   /f TEST_WITHDRAWAL_001  # 查询代付订单
   /p TEST_WITHDRAWAL_001  # 查询代付凭证
   ```

## 📋 机器人命令一览

| 命令 | 格式 | 功能 |
|------|------|------|
| `/h` | `/h` | 查看帮助信息 |
| `/y` | `/y` | 查询平台总余额 |
| `/t` | `/t` | 查看今日/30分钟订单统计 |
| `/s` | `/s 商户单号` | 查询代收订单状态 |
| `/f` | `/f 商户单号` | 查询代付订单状态 |
| `/p` | `/p 商户单号` | 获取代付凭证 |
| `/i` | `/i UPI号码 商户单号` | UPI查询收款户 |
| `/u` | `/u UTR号码 商户单号` | UTR查询相关订单 |
| `/b` | `/b UTR号码 商户单号` | UTR补单 |

## 🔧 管理命令

```bash
# 查看运行状态
pm2 status

# 查看实时日志
pm2 logs telegram-bot

# 重启机器人
pm2 restart telegram-bot

# 停止机器人
pm2 stop telegram-bot

# 删除机器人进程
pm2 delete telegram-bot
```

## 📱 群组使用

1. **将机器人加入群组**
   - 创建或打开目标群组
   - 点击群组名称 → "添加成员"
   - 搜索并添加您的机器人

2. **设置群组权限**
   - 给机器人管理员权限 (可选，用于删除消息等)
   - 或者保持普通成员权限

3. **在群组中使用**
   ```
   /t@your_bot_name              # 查看统计
   /s@your_bot_name ORDER123     # 查询订单
   /y@your_bot_name              # 查询余额
   ```

## 🔒 安全配置

### 1. 用户权限控制

只有在 `AUTHORIZED_TELEGRAM_USERS` 中列出的用户ID才能使用机器人：

```bash
# 单个用户
AUTHORIZED_TELEGRAM_USERS=123456789

# 多个用户 (逗号分隔，无空格)
AUTHORIZED_TELEGRAM_USERS=123456789,987654321,567891234
```

### 2. 服务器安全

- 机器人Token必须保密，不要提交到Git
- 定期更换Token (通过BotFather)
- 监控机器人使用日志
- 限制服务器网络访问

### 3. 数据安全

- 机器人只读取数据，不修改业务数据
- UTR补单功能有操作记录
- 敏感信息在消息中不完整显示

## 🚨 故障排查

### 常见问题

1. **机器人不响应**
   ```bash
   # 检查进程状态
   pm2 status
   
   # 查看错误日志
   pm2 logs telegram-bot --lines 50
   
   # 重启机器人
   pm2 restart telegram-bot
   ```

2. **权限被拒绝**
   - 检查用户ID是否在授权列表中
   - 确认 `.env` 文件配置正确
   - 重启机器人使配置生效

3. **数据库连接失败**
   ```bash
   # 检查MongoDB服务
   sudo systemctl status mongod
   
   # 测试连接
   node test-bot.js
   ```

4. **Token无效**
   - 检查Token格式是否正确
   - 通过BotFather重新获取Token
   - 确认没有多余的空格或换行

### 调试步骤

1. **查看详细日志**
   ```bash
   # PM2日志
   pm2 logs telegram-bot --lines 100
   
   # 系统日志
   tail -f ./logs/telegram-bot.log
   ```

2. **手动测试**
   ```bash
   # 停止PM2进程
   pm2 stop telegram-bot
   
   # 手动启动查看错误
   node bot.js
   ```

3. **重新部署**
   ```bash
   # 完全重新部署
   pm2 delete telegram-bot
   ./deploy.sh production
   ```

## 📈 监控和维护

### 1. 性能监控

```bash
# 内存使用情况
pm2 monit

# 详细信息
pm2 show telegram-bot

# 日志大小管理
pm2 flush  # 清空日志
```

### 2. 定期维护

- **每周**: 检查日志文件大小
- **每月**: 更新Node.js依赖
- **必要时**: 重启机器人清理内存

### 3. 备份配置

```bash
# 备份配置
cp .env .env.backup
cp ecosystem.config.js ecosystem.config.js.backup

# PM2配置导出
pm2 save
```

## 🆕 功能扩展

机器人采用模块化设计，可以轻松添加新功能：

1. **添加新命令**: 在 `bot.js` 中添加新的命令处理器
2. **增加统计**: 扩展 `getOrderStats` 函数
3. **集成API**: 对接第三方支付商查询API
4. **通知功能**: 添加主动推送异常订单通知

## 📞 技术支持

- 📁 项目文档: `./README.md`
- 📋 API文档: `../API_IMPLEMENTATION_SUMMARY.md`
- 🔧 部署指南: `../DEPLOYMENT_STEPS.md`
- 🧠 项目记忆: `../CLAUDE.md`

---

**🎉 恭喜！您的Telegram机器人现在可以为运营团队提供实时的支付平台数据查询服务了！**