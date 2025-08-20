# 支付平台API对接文档

## 概述

本文档为游戏公司（5方）提供支付平台API的详细对接指南，支持玩家充值和提现功能。

## 基础信息

- **API Base URL**: `https://your-domain.com/api`
- **认证方式**: API Key (在请求头中传递)
- **数据格式**: JSON
- **字符编码**: UTF-8
- **时间格式**: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)

## 认证

所有API请求都需要在请求头中包含API Key：

```http
X-API-Key: your-api-key-here
```

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 具体数据
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

## API接口

### 1. 创建充值订单

**接口地址**: `POST /payment/create`

**功能描述**: 为玩家创建充值订单，返回支付链接

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| merchantId | string | 是 | 商户ID |
| amount | integer | 是 | 充值金额（分） |
| currency | string | 否 | 货币代码，默认INR |
| customerEmail | string | 是 | 玩家邮箱 |
| customerPhone | string | 是 | 玩家手机号 |
| returnUrl | string | 是 | 支付完成后的跳转URL |
| notifyUrl | string | 否 | 异步通知URL |
| provider | string | 否 | 支付服务商，默认airpay |
| description | string | 否 | 订单描述 |

**请求示例**:
```json
{
  "merchantId": "MERCHANT_001",
  "amount": 10000,
  "currency": "INR",
  "customerEmail": "player@example.com",
  "customerPhone": "919876543210",
  "returnUrl": "https://yourgame.com/payment/return",
  "notifyUrl": "https://yourgame.com/payment/notify",
  "provider": "airpay",
  "description": "Rummy game deposit"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD1234567890",
    "paymentUrl": "https://airpay.co.in/pay/abc123",
    "amount": 10000,
    "currency": "INR",
    "status": "PENDING"
  }
}
```

### 2. 查询订单状态

**接口地址**: `GET /payment/status/{orderId}`

**功能描述**: 查询充值订单的当前状态

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| orderId | string | 是 | 订单ID（路径参数） |
| merchantId | string | 是 | 商户ID（查询参数） |

**请求示例**:
```http
GET /api/payment/status/ORD1234567890?merchantId=MERCHANT_001
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

### 3. 发起提现

**接口地址**: `POST /payment/withdraw`

**功能描述**: 为玩家发起提现申请

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| merchantId | string | 是 | 商户ID |
| amount | integer | 是 | 提现金额（分） |
| currency | string | 否 | 货币代码，默认INR |
| bankAccount | object | 是 | 银行账户信息 |
| customerName | string | 是 | 玩家姓名 |
| provider | string | 否 | 支付服务商，默认airpay |
| description | string | 否 | 提现描述 |

**bankAccount对象结构**:
```json
{
  "accountNumber": "1234567890",
  "ifscCode": "SBIN0001234",
  "accountHolderName": "John Doe",
  "bankName": "State Bank of India"
}
```

**请求示例**:
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
  "description": "Rummy game withdrawal"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD1234567891",
    "amount": 5000,
    "currency": "INR",
    "fee": 50,
    "status": "PENDING"
  }
}
```

### 4. 查询提现状态

**接口地址**: `GET /payment/withdraw/status/{orderId}`

**功能描述**: 查询提现订单的当前状态

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| orderId | string | 是 | 订单ID（路径参数） |
| merchantId | string | 是 | 商户ID（查询参数） |

**请求示例**:
```http
GET /api/payment/withdraw/status/ORD1234567891?merchantId=MERCHANT_001
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD1234567891",
    "status": "SUCCESS",
    "amount": 5000,
    "currency": "INR",
    "fee": 50,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T02:00:00.000Z"
  }
}
```

### 5. 获取商户信息

**接口地址**: `GET /merchant/info`

**功能描述**: 获取当前商户的基本信息和余额

**请求示例**:
```http
GET /api/merchant/info
X-API-Key: your-api-key-here
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "merchantId": "MERCHANT_001",
    "name": "Your Game Company",
    "email": "admin@yourgame.com",
    "status": "ACTIVE",
    "balance": {
      "available": 1000000,
      "frozen": 50000
    },
    "paymentConfig": {
      "defaultProvider": "airpay",
      "fees": {
        "deposit": 0.01,
        "withdrawal": 0.01
      },
      "limits": {
        "minDeposit": 100,
        "maxDeposit": 50000,
        "minWithdrawal": 100,
        "maxWithdrawal": 50000
      }
    }
  }
}
```

### 6. 获取交易历史

**接口地址**: `GET /merchant/transactions`

**功能描述**: 获取商户的交易历史记录

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认1 |
| limit | integer | 否 | 每页数量，默认20，最大100 |
| type | string | 否 | 交易类型：DEPOSIT/WITHDRAWAL |
| status | string | 否 | 交易状态：PENDING/SUCCESS/FAILED |

**请求示例**:
```http
GET /api/merchant/transactions?page=1&limit=20&type=DEPOSIT
X-API-Key: your-api-key-here
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "transactionId": "TXN1234567890",
        "orderId": "ORD1234567890",
        "type": "DEPOSIT",
        "amount": 10000,
        "currency": "INR",
        "balanceChange": 10000,
        "status": "SUCCESS",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "completedAt": "2024-01-01T00:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

## 订单状态说明

| 状态 | 说明 |
|------|------|
| PENDING | 待处理 |
| PROCESSING | 处理中 |
| SUCCESS | 成功 |
| FAILED | 失败 |
| CANCELLED | 已取消 |

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| INVALID_API_KEY | API密钥无效 | 检查API密钥是否正确 |
| MERCHANT_NOT_FOUND | 商户不存在 | 联系平台管理员 |
| INVALID_AMOUNT | 金额无效 | 检查金额是否在允许范围内 |
| INSUFFICIENT_BALANCE | 余额不足 | 检查商户余额 |
| ORDER_NOT_FOUND | 订单不存在 | 检查订单ID是否正确 |
| INVALID_SIGNATURE | 签名验证失败 | 检查签名算法 |

## 异步通知

### 通知URL配置

在创建订单时，可以设置`notifyUrl`参数，当订单状态发生变化时，平台会向该URL发送POST请求。

### 通知参数

```json
{
  "orderId": "ORD1234567890",
  "status": "SUCCESS",
  "amount": 10000,
  "currency": "INR",
  "transactionId": "TXN1234567890",
  "timestamp": "2024-01-01T00:05:00.000Z",
  "signature": "abc123..."
}
```

### 签名验证

通知请求包含签名，用于验证请求的合法性：

```javascript
// 签名验证示例
function verifySignature(params, signature, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .filter(key => key !== 'signature')
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signString)
    .digest('hex');
  
  return expectedSignature === signature;
}
```

### 响应要求

收到通知后，请返回以下格式的响应：

```json
{
  "success": true
}
```

## 对接流程

### 1. 申请商户账号

联系平台管理员申请商户账号，获取：
- 商户ID (merchantId)
- API密钥 (apiKey)
- 密钥 (secretKey)

### 2. 配置回调URL

在您的系统中配置回调URL，用于接收异步通知。

### 3. 集成API

按照本文档集成充值、提现、查询等API接口。

### 4. 测试联调

使用测试环境进行API联调，确保所有功能正常。

### 5. 上线运营

测试通过后，切换到生产环境正式运营。

## 安全建议

1. **API密钥安全**: 妥善保管API密钥，不要泄露给第三方
2. **HTTPS**: 生产环境必须使用HTTPS协议
3. **IP白名单**: 建议配置IP白名单，限制API访问来源
4. **签名验证**: 务必验证异步通知的签名
5. **日志记录**: 记录所有API调用和回调通知
6. **异常处理**: 做好异常情况的处理和重试机制

## 技术支持

如有技术问题，请联系：

- 邮箱: support@yourplatform.com
- 电话: +91-XXXXXXXXXX
- 工作时间: 周一至周五 9:00-18:00 (IST)

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2024-01-01 | 初始版本发布 |
