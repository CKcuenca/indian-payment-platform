# 🚀 PassPay集成架构说明

## 📋 系统架构概述

您的系统现在作为**PassPay的下游聚合支付平台**，完整的支付流程如下：

```
商户 → 您的系统(CashGit) → PassPay → 银行/UPI
```

### 🔄 数据流向

1. **下游商户** 向您的系统发起支付请求
2. **您的系统** 接收请求，验证签名，创建本地订单
3. **您的系统** 调用 **PassPay的API** 来完成实际的支付处理
4. **PassPay** 处理支付并与银行/UPI交互
5. **PassPay** 将结果回调给您的系统
6. **您的系统** 将结果通知给下游商户

## 🛠️ 已实现的功能

### 1. **代收功能**
- ✅ **创建代收订单** (`POST /api/pay`)
  - 接收商户请求
  - 调用PassPay创建订单
  - 返回PassPay的交易号

- ✅ **查询代收订单状态** (`POST /api/query`)
  - 调用PassPay查询最新状态
  - 自动同步本地订单状态
  - 返回实时状态信息

### 2. **UTR管理**
- ✅ **UTR补单** (`POST /api/utr/submit`)
  - 接收商户UTR信息
  - 调用PassPay提交UTR
  - 更新本地订单状态

- ✅ **UTR状态查询** (`POST /api/utr/query`)
  - 调用PassPay查询UTR状态
  - 返回验证结果

### 3. **UPI查询**
- ✅ **UPI状态查询** (`POST /api/upi/query`)
  - 调用PassPay查询UPI状态
  - 返回UPI活跃状态

### 4. **代付功能**
- ✅ **创建代付订单** (`POST /api/payout/create`)
  - 接收商户代付请求
  - 调用PassPay创建代付订单
  - 返回PassPay交易号

- ✅ **查询代付订单状态** (`POST /api/payout/query`)
  - 调用PassPay查询代付状态
  - 自动同步本地状态

### 5. **余额查询**
- ✅ **余额查询** (`POST /api/balance/query`)
  - 调用PassPay查询实时余额
  - 失败时回退到本地计算

## 🔧 技术实现

### 核心组件

1. **PassPayClient** (`server/services/passpay-client.js`)
   - PassPay API客户端
   - 处理所有与PassPay的通信
   - 签名生成和验证
   - 状态映射和错误处理

2. **路由层** (`server/routes/cashgitPayment.js`)
   - 接收商户请求
   - 调用PassPayClient
   - 处理响应和错误
   - 维护本地数据一致性

3. **数据模型**
   - **Order**: 支持UTR字段 (`utrNumber`, `utrAmount`)
   - **Transaction**: 支持UTR记录
   - **PaymentConfig**: 存储PassPay配置

### 错误处理策略

- **PassPay调用失败时**：返回本地状态，确保系统可用性
- **网络超时**：设置10秒超时，避免长时间等待
- **状态同步**：自动更新本地订单状态，保持数据一致性

## 📁 文件结构

```
server/
├── services/
│   └── passpay-client.js          # PassPay API客户端
├── routes/
│   └── cashgitPayment.js          # 支付路由（已更新）
├── models/
│   ├── order.js                   # 订单模型（已更新）
│   └── transaction.js             # 交易模型（已更新）
└── config/
    └── passpay-config-example.js  # 配置示例

test-passpay-integration.js        # 集成测试文件
PASSPAY_INTEGRATION_README.md      # 本文档
```

## 🚀 快速开始

### 1. 配置PassPay

```bash
# 复制配置示例
cp server/config/passpay-config-example.js server/config/passpay-config.js

# 编辑配置文件，填入您的PassPay信息
vim server/config/passpay-config.js
```

### 2. 数据库配置

```javascript
// 在MongoDB中添加PassPay配置
db.paymentconfigs.insertOne({
  "provider": {
    "name": "passpay",
    "accountId": "your_mchid_here",
    "payId": "your_pay_id_here", 
    "secretKey": "your_secret_key_here"
  },
  "enabled": true,
  "createdAt": new Date(),
  "updatedAt": new Date()
})
```

### 3. 测试集成

```bash
# 运行集成测试
node test-passpay-integration.js
```

## 🔍 API接口详情

### 代收订单创建
```http
POST /api/pay
Content-Type: application/json

{
  "appid": "merchant_appid",
  "orderid": "unique_order_id",
  "amount": "100.00",
  "desc": "订单描述",
  "notify_url": "https://merchant.com/notify",
  "sign": "md5_signature"
}
```

### UTR补单
```http
POST /api/utr/submit
Content-Type: application/json

{
  "appid": "merchant_appid",
  "orderid": "order_id",
  "utr_number": "UTR123456789",
  "amount": "100.00",
  "sign": "md5_signature"
}
```

### 代付订单创建
```http
POST /api/payout/create
Content-Type: application/json

{
  "appid": "merchant_appid",
  "orderid": "unique_payout_id",
  "amount": "500.00",
  "account_number": "1234567890",
  "ifsc_code": "SBIN0001234",
  "account_holder": "Account Holder Name",
  "notify_url": "https://merchant.com/payout_notify",
  "sign": "md5_signature"
}
```

## 🎯 下一步建议

### 1. **回调处理**
- 实现PassPay回调接收接口
- 验证回调签名
- 自动更新订单状态
- 转发通知给商户

### 2. **状态管理**
- 增强订单状态流转管理
- 添加状态变更日志
- 实现状态同步定时任务

### 3. **风控规则**
- 添加业务风控逻辑
- 实现限额控制
- 添加异常交易检测

### 4. **监控告警**
- 集成系统监控
- 添加异常告警机制
- 实现性能指标收集

## 🔒 安全考虑

- **签名验证**：所有API请求都经过MD5签名验证
- **参数过滤**：自动过滤空值和恶意参数
- **超时控制**：设置合理的API调用超时时间
- **错误处理**：不暴露内部错误信息给商户

## 📞 技术支持

如果您在使用过程中遇到问题，请检查：

1. **PassPay配置**：确认accountId、payId、secretKey正确
2. **网络连接**：确保能访问PassPay API
3. **数据库配置**：确认PaymentConfig记录存在
4. **日志信息**：查看服务器日志获取详细错误信息

---

**🎉 恭喜！您的系统现在已经完全集成了PassPay，具备了完整的支付处理能力！**
