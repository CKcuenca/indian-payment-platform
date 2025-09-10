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

## 🚀 部署
- **生产**: `deploy-production.sh` → cashgit.com
- **GitHub Actions**: `.github/workflows/deploy-test.yml`
- **PM2**: `ecosystem.config.js`
- **测试脚本**: `test-production-comprehensive.js`

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

---
**⚡ 记住**: 所有API都需要签名验证，生产环境必须HTTPS
- 我的线上服务器是aws的，已经部署了测试环境和生产环境。我推送到git仓库后，git会自动部署到线上测试环境，如果测试没问题，我就手动部署到生产环境。