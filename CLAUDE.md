# 🧠 印度支付平台 - 项目记忆

## 🎯 项目本质
- **印度游戏聚合支付平台** (rummy/teen patti)
- **Node.js + MongoDB + React** 
- **端口**: 3000/3001 | **时区**: Asia/Kolkata

## 💳 支付商状态
- **PassPay** ✅ (主力) - 代收代付、UTR、UPI查询 | 文档路径: `/Users/kaka/Documents/QP/ZF/HX/PassPay`
- **DHPay** ✅ (合规完成、签名已修复) | 文档路径: `/Users/kaka/Documents/QP/ZF/HX/DhPay` 
- **UnisPay** ✅ (部署完成) | 文档路径: `/Users/kaka/Documents/QP/ZF/HX/UnisPay`
- **WakeUp** ✅

## 🔑 核心配置
```bash
# 必需环境变量
MONGODB_URI=mongodb://localhost:27017/payment-platform
JWT_SECRET=your-jwt-secret
PASSPAY_MCHID/PAYID/SECRET=配置值
PORT=3000
NODE_ENV=production
```

## 🌐 关键接口 (2025-09-12 更新)
### 🚀 **统一支付接口** (新)
```
POST /api/pay           # 统一支付接口 (支持原生+唤醒)
  - pay_id缺省/1: 原生PassPay通道
  - pay_id=2: 唤醒支付通道
POST /api/query         # 统一订单查询 (自动识别支付类型)
POST /api/close         # 订单关闭
POST /api/utr/submit    # UTR补单 (支持两种类型)
```

### 🔄 **专用接口** (兼容保留)
```
POST /api/wakeup/create # 唤醒支付专用接口
POST /api/wakeup/query  # 唤醒支付查询
POST /api/payout/create # PassPay代付  
POST /api/balance/query # 余额查询
```

## 🚀 服务器架构 & 部署
### 🌐 AWS服务器信息
- **服务器IP**: `13.200.72.14`
- **SSH密钥**: `/Users/kaka/AWS-Key/indian-payment-key-3.pem`
- **连接命令**: `ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14`
- **操作系统**: Ubuntu 22.04.5 LTS

### 🔄 双环境部署架构
#### 🧪 测试环境
- **域名**: https://test.cashgit.com
- **应用路径**: `/var/www/test.cashgit.com`
- **PM2应用名**: `test-indian-payment-platform` (ID: 0)
- **端口**: 3000
- **用途**: 自动部署测试、新功能验证

#### 🚀 生产环境  
- **域名**: https://cashgit.com
- **应用路径**: `/var/www/cashgit.com`
- **PM2应用名**: `indian-payment-platform` (ID: 1)
- **端口**: 3001
- **用途**: 正式线上服务

### 📋 部署流程 ⚠️ **严格执行**
1. **代码推送**: 本地 → GitHub → **自动部署到测试环境**
2. **测试验证**: 在test.cashgit.com验证功能
3. **生产部署**: **用户手动**执行 `deploy-production.sh` → cashgit.com
4. **服务管理**: PM2管理两个环境同时运行

🚨 **重要规则**: 
- **禁止直接部署到生产环境** - 只能推送到GitHub让测试环境自动部署
- **生产环境部署** - 必须由用户亲自测试后手动执行
- **AI助手职责** - 只能提交代码到Git，不能执行生产部署命令

### 🔧 关键文件
- **PM2配置**: `ecosystem.config.js` (生产), `ecosystem.test.config.js` (测试)
- **环境变量**: `env.production` (生产), 测试环境使用默认配置
- **部署脚本**: `deploy-production.sh`, `deploy-to-cashgit.sh`
- **GitHub Actions**: `.github/workflows/deploy-test.yml`

## ⚠️ 常见问题 (2025-09修复)
1. **支付失败**: 检查签名、配置、网络
2. **状态不同步**: 调用查询接口手动同步  
3. **内存泄漏**: 使用 `/api/memory-optimization`
4. ✅ **DhPay签名错误** - 已修复签名拼接格式
5. ✅ **PassPay回调格式** - 已修复为纯字符串响应
6. ✅ **金额格式不统一** - 已修复各支付商金额处理
7. ✅ **状态码映射错误** - 已修复PassPay状态映射
8. ✅ **数据库金额单位不一致** - 已修复paisa/rupees转换
9. ✅ **回调金额解析错误** - 已修复webhook金额处理
10. ✅ **重复状态映射函数冲突** - 已统一所有状态映射
11. ✅ **admin权限问题** - 已修复前端缺失SYSTEM_MONITORING权限 (2025-09-11)
12. ✅ **前后端状态不一致** - 已统一使用大写状态值ACTIVE/INACTIVE (2025-09-12)
13. ✅ **支付账户关闭验证失败** - 已修复secretKey条件验证 (2025-09-12)
14. ✅ **用户管理状态验证错误** - 已修复API验证器状态枚举 (2025-09-12)

## 🚀 **新功能** (2025-09-12)
### 💳 **统一支付接口**
- **双通道支持**: 一个接口支持原生PassPay + 唤醒支付
- **智能路由**: 通过pay_id参数自动选择支付类型
  - `pay_id` 缺省或 = 1 → 原生PassPay通道 (直连)
  - `pay_id = 2` → 唤醒支付通道 (DhPay上游)
- **向后兼容**: 现有商户无需修改代码
- **统一管理**: 查询、关闭、UTR补单自动识别订单类型

## 📋 重要文档
- `PASSPAY_INTEGRATION_README.md` - PassPay完整指南
- `deployment-workflow.md` - 部署流程
- `Indian-Payment-Platform-API.postman_collection.json` - API测试

## 🔧 开发速查
```bash
npm run dev      # 开发模式
npm start        # 生产模式
pm2 restart all  # 重启服务
```

## 📡 **API使用示例** (2025-09-12 新增)
### 🚀 **统一支付接口**
```javascript
// 原生支付 (默认)
POST /api/pay
{
  "appid": "merchant_appid",
  "orderid": "ORDER_001", 
  "amount": "100.00",
  "desc": "游戏充值",
  "notify_url": "https://merchant.com/notify",
  "sign": "calculated_md5_signature"
}

// 唤醒支付
POST /api/pay  
{
  "appid": "merchant_appid",
  "orderid": "ORDER_002",
  "amount": "200.00", 
  "desc": "游戏充值",
  "pay_id": "2",                    // 关键: 指定唤醒支付
  "customer_phone": "1234567890",   // 唤醒支付必需
  "notify_url": "https://merchant.com/notify",
  "sign": "calculated_md5_signature"
}

// 统一查询 (自动识别订单类型)
POST /api/query
{
  "appid": "merchant_appid",
  "orderid": "ORDER_001",
  "sign": "calculated_md5_signature"
}
```

## 🔒 签名算法要点
- **PassPay**: MD5加密转小写，`&key={secretKey}`
- **DHPay**: MD5加密转大写，`&secretKey={secretKey}` ⚠️
- **UnisPay**: SHA256加密转小写，`&key={secretKey}`

## 💰 金额格式要求
- **数据库存储**: 统一使用paisa为单位 (整数)
- **API传输**: 根据支付商要求格式化
  - **PassPay**: 字符串格式，保留2位小数 `"100.00"`
  - **DHPay**: 整数格式，单位为分 `10000`
  - **UnisPay**: 字符串格式，直接使用卢比
- **内部转换**: 
  - 存储时: `Math.round(rupees * 100)` → paisa
  - 显示时: `(paisa / 100).toFixed(2)` → rupees

## 🎮 数据库用户管理
### 👥 生产环境用户 (payment-platform数据库)
- **管理员**: `admin` (系统管理员) - 完整权限
- **商户**: `cgpay` - 商户权限 (merchantId: cgpay)
- **查询方式**: 
  ```bash
  # SSH连接服务器
  ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14
  
  # 进入MongoDB
  mongosh
  use payment-platform
  db.users.find({})
  ```

## 🔧 服务器运维
### PM2服务管理
```bash
# 查看所有服务
pm2 list

# 重启生产环境
pm2 restart indian-payment-platform

# 重启测试环境  
pm2 restart test-indian-payment-platform

# 查看日志
pm2 logs indian-payment-platform --lines 20
pm2 logs test-indian-payment-platform --lines 20

# 停止/启动服务
pm2 stop 1    # 停止生产环境
pm2 start 1   # 启动生产环境
```

### 🔍 故障排查
1. **502错误**: 检查PM2服务是否运行
2. **服务停止**: 使用 `pm2 start ecosystem.config.js --env production`
3. **数据库连接**: 确认MongoDB服务运行 `sudo systemctl status mongod`
4. **端口冲突**: 检查端口占用 `netstat -tlnp | grep 3001`

---
**⚡ 记住** (2025-09-12 更新): 
- 统一支付接口已上线：一个/api/pay接口支持两种支付类型
- pay_id参数控制路由：1=标准支付，2=唤醒支付
- 向下游商户推荐使用统一接口，简化集成复杂度
- **CashGit统一支付文档**：已更新完整的对接文档
- 两个环境同时运行，互不影响
- **严格部署流程**：测试环境自动部署，生产环境用户手动部署
- **AI不可直接操作生产环境** - 只能推送到Git
- 所有API都需要签名验证，生产环境必须HTTPS
- 服务器重启后需要手动启动PM2服务
- 系统已准备承接30万卢比/小时的订单量 🚀