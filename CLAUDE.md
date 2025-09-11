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

## 🌐 关键接口
```
POST /api/pay           # PassPay代收
POST /api/payout/create # PassPay代付  
POST /api/query         # 订单查询
POST /api/balance/query # 余额查询
POST /api/utr/submit    # UTR补单
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

### 📋 部署流程
1. **代码推送**: 本地 → GitHub → 自动部署到测试环境
2. **测试验证**: 在test.cashgit.com验证功能
3. **生产部署**: 手动执行 `deploy-production.sh` → cashgit.com
4. **服务管理**: PM2管理两个环境同时运行

### 🔧 关键文件
- **PM2配置**: `ecosystem.config.js` (生产), `ecosystem.test.config.js` (测试)
- **环境变量**: `env.production` (生产), 测试环境使用默认配置
- **部署脚本**: `deploy-production.sh`, `deploy-to-cashgit.sh`
- **GitHub Actions**: `.github/workflows/deploy-test.yml`

## ⚠️ 常见问题 (2025-01修复)
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
**⚡ 记住**: 
- 两个环境同时运行，互不影响
- 测试环境自动部署，生产环境手动部署
- 所有API都需要签名验证，生产环境必须HTTPS
- 服务器重启后需要手动启动PM2服务