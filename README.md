# 印度支付平台

一个专为rummy和teen patti等游戏设计的聚合支付平台，支持AirPay、Cashfree等印度主流支付服务商。

## 功能特性

- 🏦 **多支付商支持**: 集成AirPay、Cashfree等印度主流支付服务商
- 🎮 **游戏专用**: 专为rummy、teen patti等游戏优化
- �� **代收代付**: 支持玩家充值和提现功能
- 🛡️ **安全可靠**: 完整的签名验证和风控机制
- 📊 **实时监控**: 订单状态实时查询和回调通知
- 🔧 **易于扩展**: 模块化设计，支持快速接入新支付商

## 技术架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   游戏公司      │    │   支付平台      │    │   支付服务商    │
│   (5方)         │◄──►│   (4方)         │◄──►│   (3方)         │
│                 │    │                 │    │                 │
│ - 充值接口      │    │ - 聚合支付      │    │ - AirPay        │
│ - 提现接口      │    │ - 风控管理      │    │ - Cashfree      │
│ - 订单查询      │    │ - 商户管理      │    │ - 其他...       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 快速开始

### 1. 环境要求

- Node.js 16+
- MongoDB 4.4+
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下参数：

```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/payment-platform

# AirPay配置
AIRPAY_MERCHANT_ID=your-merchant-id
AIRPAY_API_KEY=your-api-key
AIRPAY_SECRET_KEY=your-secret-key
AIRPAY_SANDBOX=true
```

### 4. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务将在 http://localhost:3000 启动

## API文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: API Key (在请求头中传递)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 主要接口

#### 1. 创建支付订单

```http
POST /api/payment/create
```

**请求参数**:
```json
{
  "merchantId": "MERCHANT_001",
  "amount": 10000,
  "currency": "INR",
  "customerEmail": "player@example.com",
  "customerPhone": "919876543210",
  "returnUrl": "https://game.com/return",
  "notifyUrl": "https://game.com/notify",
  "provider": "airpay",
  "description": "Game deposit"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD1234567890",
    "paymentUrl": "https://airpay.co.in/pay/...",
    "amount": 10000,
    "currency": "INR",
    "status": "PENDING"
  }
}
```

#### 2. 查询订单状态

```http
GET /api/payment/status/:orderId?merchantId=MERCHANT_001
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD1234567890",
    "status": "SUCCESS",
    "amount": 10000,
    "currency": "INR",
    "fee": 100,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "paidAt": "2024-01-01T00:05:00.000Z"
  }
}
```

#### 3. 发起代付

```http
POST /api/payment/withdraw
```

**请求参数**:
```json
{
  "merchantId": "MERCHANT_001",
  "amount": 5000,
  "currency": "INR",
  "bankAccount": {
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234",
    "accountHolderName": "John Doe",
    "bankName": "State Bank of India"
  },
  "customerName": "John Doe",
  "provider": "airpay",
  "description": "Game withdrawal"
}
```

#### 4. 查询代付状态

```http
GET /api/payment/withdraw/status/:orderId?merchantId=MERCHANT_001
```

### 回调通知

#### 支付回调

```http
POST /api/payment/callback/:provider
```

#### 代付回调

```http
POST /api/payment/withdraw/callback/:provider
```

## 支付状态说明

| 状态 | 说明 |
|------|------|
| PENDING | 待处理 |
| PROCESSING | 处理中 |
| SUCCESS | 成功 |
| FAILED | 失败 |
| CANCELLED | 已取消 |

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| INVALID_SIGNATURE | 签名验证失败 |
| INVALID_AMOUNT | 金额无效 |
| ORDER_NOT_FOUND | 订单不存在 |
| INSUFFICIENT_BALANCE | 余额不足 |
| MERCHANT_NOT_FOUND | 商户不存在 |

## 开发指南

### 添加新的支付服务商

1. 在 `server/services/payment-providers/` 目录下创建新的提供者类
2. 继承 `BasePaymentProvider` 类
3. 实现所有必需的方法
4. 在 `PaymentManager` 中注册新的提供者

### 示例：添加Cashfree支持

```javascript
// server/services/payment-providers/cashfree-provider.js
const BasePaymentProvider = require('./base-provider');

class CashfreeProvider extends BasePaymentProvider {
  async createPayment(params) {
    // 实现Cashfree支付逻辑
  }
  
  // 实现其他必需方法...
}

module.exports = CashfreeProvider;
```

## 部署指南

### 本地部署

1. 安装MongoDB
2. 配置环境变量
3. 运行 `npm start`

### 云服务器部署

推荐使用AWS、阿里云等云服务：

1. 准备云服务器（建议2核4G以上）
2. 安装Node.js和MongoDB
3. 配置域名和SSL证书
4. 使用PM2或Docker部署

### Docker部署

```bash
# 构建镜像
docker build -t payment-platform .

# 运行容器
docker run -d -p 3000:3000 --name payment-platform payment-platform
```

## 安全建议

1. **API密钥安全**: 妥善保管API密钥，定期更换
2. **HTTPS**: 生产环境必须使用HTTPS
3. **IP白名单**: 限制回调IP地址
4. **日志监控**: 实时监控异常交易
5. **数据备份**: 定期备份数据库

## 支持

如有问题，请联系技术支持或查看项目文档。

## 许可证

MIT License
