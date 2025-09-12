# 🤖 印度支付平台 Telegram 机器人

专为印度支付平台运营人员设计的 Telegram 机器人，提供实时查询订单状态、统计数据、余额信息等功能。

## ✨ 功能特性

### 📋 基础查询命令
- `/h` - 查看机器人帮助信息
- `/y` - 查询平台总余额
- `/t` - 查看近半小时/今日订单统计

### 🔍 订单查询命令  
- `/s 商户单号` - 查询代收订单状态
- `/f 商户单号` - 查询代付订单状态
- `/p 商户单号` - 获取代付凭证

### 🇮🇳 印度特色功能
- `/i UPI号码 商户单号` - UPI查询收款户
- `/u UTR号码 商户单号` - 使用UTR查询相关订单
- `/b UTR号码 商户单号` - 使用UTR补单

## 🚀 快速开始

### 1. 创建 Telegram 机器人

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot` 创建新机器人
3. 按提示设置机器人名称和用户名
4. 获得机器人 Token，格式如：`123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`

### 2. 获取用户ID

1. 在 Telegram 中找到 [@userinfobot](https://t.me/userinfobot)  
2. 发送 `/start` 获取您的用户ID
3. 记录数字ID用于权限配置

### 3. 安装依赖

```bash
cd telegram-bot
npm install
```

### 4. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# MongoDB连接
MONGODB_URI=mongodb://localhost:27017/payment-platform

# 授权用户ID (逗号分隔)
AUTHORIZED_TELEGRAM_USERS=123456789,987654321
```

### 5. 启动机器人

#### 开发模式
```bash
npm run dev
```

#### 生产模式
```bash
npm start
```

#### PM2部署
```bash
npm run pm2:start
```

## 📊 使用示例

### 群组使用
在群组中可以通过@机器人用户名来使用：
```
/t@your_bot_name
/s@your_bot_name ORDER123456
```

### 私聊使用
直接发送命令：
```
/t
/s ORDER123456
/i 9876543210@paytm ORDER123456
```

## 🛠️ PM2 管理命令

```bash
# 启动
npm run pm2:start

# 停止
npm run pm2:stop

# 重启
npm run pm2:restart

# 查看日志
npm run pm2:logs

# 查看状态
pm2 status
```

## 📝 日志文件

日志文件位置：
- 综合日志: `./logs/telegram-bot.log`
- 错误日志: `./logs/telegram-bot-error.log`
- 输出日志: `./logs/telegram-bot-out.log`

## 🔒 安全考虑

1. **权限控制**: 只有配置的用户ID才能使用机器人
2. **敏感信息**: 机器人Token和授权用户列表需要妥善保管
3. **网络安全**: 建议在服务器防火墙中限制访问端口

## 🚨 故障排查

### 常见问题

1. **机器人无响应**
   - 检查Token是否正确
   - 确认网络连接正常
   - 查看PM2日志：`pm2 logs telegram-bot`

2. **数据库连接失败**  
   - 确认MongoDB服务运行中
   - 检查连接字符串格式
   - 验证数据库权限

3. **权限被拒绝**
   - 确认用户ID添加到授权列表
   - 检查环境变量配置

### 调试命令

```bash
# 查看进程状态
pm2 status

# 查看详细信息
pm2 show telegram-bot

# 实时日志
pm2 logs telegram-bot --lines 50
```

## 📈 监控指标

机器人提供以下数据统计：

- **今日入款汇总**: 成功订单数/总订单数
- **今日入款成功率**: 成功率百分比
- **今日入款笔均**: 平均订单金额
- **今日出款汇总**: 代付订单统计
- **30分钟成功率**: 近期成功率趋势

## 🔄 版本更新

### v1.0.0 功能清单
- ✅ 基础命令框架
- ✅ 权限验证机制
- ✅ 余额查询功能
- ✅ 订单统计报告
- ✅ 代收/代付订单查询
- ✅ UTR查询和补单
- ✅ 代付凭证生成
- ✅ PM2部署配置
- ⚠️ UPI查询 (需要对接UPI服务商)

## 📞 技术支持

如遇问题请联系技术团队，或查看：
- 项目主文档: `/CLAUDE.md`
- API文档: `/API_IMPLEMENTATION_SUMMARY.md`
- 部署指南: `/DEPLOYMENT_STEPS.md`