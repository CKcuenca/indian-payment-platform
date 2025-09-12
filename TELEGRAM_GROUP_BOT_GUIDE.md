# 🏪 Telegram 群组绑定机器人指南

为印度支付平台提供**群组绑定商户**功能的专业机器人，支持您提到的完整业务流程。

## 🎯 业务流程

### 1. 商户注册流程
```
商户提供用户名 → 后台创建商户账号 → 获得 merchantId
```

### 2. 群组建立流程  
```
创建Telegram群组 → 邀请商户 → 添加机器人 → 绑定商户ID
```

### 3. 绑定确认流程
```
管理员执行 /bind 商户ID → 机器人回复"绑定成功" → 发送"群组帮助"
```

### 4. 日常使用流程
```
群组成员 → 使用 /命令@机器人 → 查询商户专属数据
```

## 🚀 快速部署

### 1. 环境配置

```bash
# 进入机器人目录
cd telegram-bot

# 复制环境配置
cp .env.example .env
```

编辑 `.env` 文件：
```bash
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# MongoDB连接
MONGODB_URI=mongodb://localhost:27017/payment-platform

# 管理员用户ID (只有管理员可以绑定群组)
ADMIN_TELEGRAM_USERS=123456789,987654321
```

### 2. 安装启动

```bash
# 安装依赖
npm install

# 测试功能
node test-group-bot.js

# 启动机器人
npm start

# 或使用PM2部署
./deploy.sh production
```

## 🔧 管理员功能

### 绑定群组到商户
```bash
/bind 商户ID
```
**示例:**
```
/bind cgpay
/bind merchant_001
/bind TESTMERCHANT
```

**机器人响应:**
```
🎉 群组绑定成功！

群组信息:
📱 群组名称: CG Pay Support Group
🆔 群组ID: -1001234567890
👥 群组类型: supergroup

绑定商户:
🏪 商户ID: cgpay
🏪 商户名称: CG Pay

操作信息:
👤 操作人员: @admin_user
⏰ 绑定时间: 2025-01-15 10:30:00

✅ 绑定成功后，群组成员可以使用以下命令：
💰 /y@bot_name - 查询商户余额
📊 /t@bot_name - 查看订单统计
🔍 /s@bot_name 订单号 - 查询代收订单
```

### 其他管理员命令

| 命令 | 功能 | 示例 |
|------|------|------|
| `/unbind` | 解绑当前群组 | `/unbind` |
| `/groupinfo` | 查看群组绑定信息 | `/groupinfo` |

## 📋 群组成员功能

绑定成功后，机器人会自动发送**群组帮助**：

```
🤖 群组机器人使用指南

欢迎使用印度支付平台监控机器人！
当前群组已绑定商户: cgpay

📋 可用命令:

📊 数据查询:
💰 /y@bot_name - 查询商户余额
📈 /t@bot_name - 查看今日/30分钟订单统计

🔍 订单查询:
🔍 /s@bot_name 订单号 - 查询代收订单状态
🔍 /f@bot_name 订单号 - 查询代付订单状态
📄 /p@bot_name 订单号 - 获取代付凭证

🇮🇳 印度特色功能:
🏦 /i@bot_name UPI号码 订单号 - UPI查询
🔗 /u@bot_name UTR号码 订单号 - UTR查询
🔧 /b@bot_name UTR号码 订单号 - UTR补单

💡 使用示例:
/y@bot_name - 查看余额
/s@bot_name ORDER123456 - 查询订单
/t@bot_name - 查看统计
```

## 💬 实际使用示例

### 查询余额
```
用户: /y@indian_payment_bot

机器人回复:
💰 商户余额查询

🏪 商户ID: cgpay  
💰 可用余额: ₹1,250.50
🔒 冻结金额: ₹150.00
📊 总余额: ₹1,400.50

⏰ 查询时间: 2025-01-15 15:30:00
```

### 查看统计 (符合您的案例格式)
```
用户: /t@indian_payment_bot

机器人回复:
📊 订单统计报告

🏪 商户ID: cgpay

今日入款汇总: 4511/598
30分钟成功率: 0  
今日入款成功率: 13.26
今日入款笔均: ₹158.86

今日出款汇总: 0/0
今日出款成功率: 0
今日出款笔均: ₹0

统计时间: 2025-01-15 15:30:00
```

### 查询订单
```
用户: /s@indian_payment_bot ORDER123456

机器人回复:
🔍 代收订单查询

订单号: ORDER123456
商户号: cgpay
订单状态: ✅ SUCCESS  
订单金额: ₹100.00
支付提供商: PassPay
创建时间: 2025-01-15 14:20:00

交易ID: PP_1234567890
UTR号码: UTR1234567890
```

## 🔒 权限管理

### 三级权限系统

1. **管理员权限**
   - 绑定/解绑群组
   - 查看群组信息
   - 使用所有查询功能

2. **群组成员权限**
   - 只能查询绑定商户的数据
   - 支持配置允许所有成员或指定成员

3. **安全隔离**
   - 每个群组只能查询绑定商户的数据
   - 不同商户数据完全隔离
   - UTR补单操作有完整审计日志

### 权限配置
```javascript
// 群组设置示例
{
  allowAllMembers: true,        // 是否允许所有群成员
  authorizedUsers: [],          // 授权用户列表
  allowedCommands: [            // 允许的命令
    'balance', 'statistics', 
    'deposit_query', 'withdrawal_query',
    'upi_query', 'utr_query', 'utr_fix'
  ]
}
```

## 📊 数据统计

机器人会记录详细的使用统计：

```javascript
{
  totalCommands: 156,
  lastUsed: "2025-01-15T15:30:00Z",
  commandStats: {
    balance: 45,
    statistics: 38,
    deposit_query: 52,
    withdrawal_query: 21
  }
}
```

## 🗃️ 数据模型

### TelegramGroup 模型
```javascript
{
  chatId: "-1001234567890",
  chatTitle: "CG Pay Support Group", 
  merchantId: "cgpay",
  status: "ACTIVE",
  bindInfo: {
    operatorId: "123456789",
    operatorUsername: "admin_user",
    bindTime: "2025-01-15T10:30:00Z"
  },
  settings: {
    allowAllMembers: true,
    allowedCommands: ["balance", "statistics", ...]
  },
  usage: {
    totalCommands: 156,
    commandStats: { balance: 45, ... }
  }
}
```

## 🚨 故障排查

### 常见问题

1. **绑定失败**
   ```
   ❌ 商户 MERCHANT_ID 不存在，请先在后台创建商户账号
   ```
   **解决**: 在后台系统中先创建对应的商户账号

2. **权限被拒绝**
   ```
   ❌ 只有管理员可以绑定群组到商户
   ```
   **解决**: 检查 `ADMIN_TELEGRAM_USERS` 配置

3. **群组未绑定**
   ```
   ❌ 群组未绑定商户，无法查询余额
   ```
   **解决**: 使用 `/bind 商户ID` 命令绑定群组

### 调试命令

```bash
# 查看机器人状态
pm2 status

# 查看实时日志
pm2 logs telegram-bot

# 测试数据库连接
node test-group-bot.js

# 重启机器人
pm2 restart telegram-bot
```

## 🆚 版本对比

| 功能 | 简单版本 (bot.js) | 群组版本 (group-bot.js) |
|------|-------------------|-------------------------|
| 权限控制 | 固定用户列表 | 管理员+群组成员 |
| 数据范围 | 平台全部数据 | 绑定商户数据 |
| 使用场景 | 内部运营 | 商户服务 |
| 群组支持 | 基础@mention | 群组绑定商户 |
| 业务流程 | 简单查询 | 完整商户服务 |

## 💡 最佳实践

### 1. 群组命名规范
```
✅ 推荐格式:
- "CG Pay Support Group"  
- "Merchant ABC - Support"
- "商户名称 - 客服群"

❌ 避免格式:
- "Test Group"
- "Random Chat"  
```

### 2. 权限分配建议
```
管理员: 平台运营人员 (2-3人)
群组成员: 商户客服团队
```

### 3. 使用频率监控
```bash
# 定期检查使用统计
/groupinfo

# 观察指标:
- totalCommands (总使用次数)
- lastUsed (最后使用时间)  
- 各命令使用分布
```

### 4. 安全建议
- 定期轮换机器人Token
- 监控异常查询行为
- 保持管理员列表最新
- 及时删除离职人员权限

## 🎊 部署完成检查单

- [ ] 创建Telegram机器人并获取Token
- [ ] 配置 `.env` 文件中的环境变量
- [ ] 设置管理员用户ID列表
- [ ] 运行测试脚本验证功能
- [ ] 启动机器人服务
- [ ] 创建测试群组并添加机器人
- [ ] 执行 `/bind` 命令测试绑定
- [ ] 验证各查询命令功能正常
- [ ] 检查权限控制是否生效
- [ ] 确认数据隔离正确

---

**🎉 恭喜！现在您拥有了一个完全符合业务需求的群组绑定机器人，可以为每个商户提供专属的Telegram客服群支持！**