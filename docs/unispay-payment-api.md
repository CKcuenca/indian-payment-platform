# UNISPAY 唤醒支付 API 文档

## 概述

UNISPAY 唤醒支付是一种特殊的支付方式，玩家通过 UPI 转账到指定印度人的私人银行卡，第三方支付公司通过网银查询转账是否完成，然后通知游戏公司支付结果。

## 支付类型

- **9111**: 印度一类（唤醒）

## 环境配置

### 测试环境
- API地址: `https://test-api.unispay.com`
- 商户号: 测试商户号
- API密钥: 测试密钥

### 生产环境
- API地址: `https://api.unispay.com`
- 商户号: 正式商户号
- API密钥: 正式密钥

## API 接口

### 1. 创建唤醒支付订单

**接口地址**: `POST /api/unispay/create`

**请求参数**:
```json
{
  "orderid": "ORDER123456",
  "amount": "1000",
  "desc": "游戏充值",
  "notify_url": "https://example.com/notify",
  "return_url": "https://example.com/return",
  "customer_phone": "919876543210"
}
```

**参数说明**:
- `orderid`: 商户订单号，长度至少6位
- `amount`: 支付金额（卢比）
- `desc`: 订单描述
- `notify_url`: 异步通知地址
- `return_url`: 同步返回地址
- `customer_phone`: 客户手机号（印度格式）

**响应示例**:
```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": {
    "orderid": "ORDER123456",
    "status": "SUCCESS",
    "message": "订单创建成功，等待玩家完成UPI转账",
    "upi_transfer_info": {
      "beneficiaryName": "UNISPAY",
      "beneficiaryUPI": "unispay@upi",
      "beneficiaryAccount": "1234567890",
      "ifscCode": "SBIN0001234",
      "bankName": "State Bank of India",
      "amount": 1000,
      "currency": "INR",
      "transferNote": "订单ORDER123456",
      "expectedCompletionTime": "5-10分钟",
      "orderNo": "UNISPAY_123456789"
    },
    "order_no": "UNISPAY_123456789"
  }
}
```

### 2. 查询订单状态

**接口地址**: `POST /api/unispay/query`

**请求参数**:
```json
{
  "orderid": "ORDER123456"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": {
    "orderid": "ORDER123456",
    "status": "SUCCESS",
    "amount": 1000,
    "order_no": "UNISPAY_123456789",
    "paid_time": 1640995200,
    "message": "查询成功"
  }
}
```

### 3. 异步通知回调

**接口地址**: `POST /api/unispay/notify`

**通知参数**:
```json
{
  "mchNo": "UNISPAY001",
  "mchOrderId": "ORDER123456",
  "orderNo": "UNISPAY_123456789",
  "state": "1",
  "amount": 100000,
  "currency": "INR",
  "successTime": 1640995200,
  "reqTime": 1640995200,
  "version": "1.0",
  "sign": "ABCDEF1234567890"
}
```

**状态说明**:
- `0`: 待支付
- `1`: 支付成功
- `2`: 支付失败
- `3`: 已取消
- `4`: 已退款

**响应要求**: 必须返回 `SUCCESS` 字符串

### 4. 获取支付配置

**接口地址**: `GET /api/unispay/config`

**响应示例**:
```json
{
  "code": 0,
  "message": "SUCCESS",
  "data": {
    "provider": "unispay",
    "accountName": "UNISPAY唤醒支付账户",
    "status": "ACTIVE",
    "limits": {
      "dailyLimit": 1000000,
      "monthlyLimit": 10000000,
      "singleTransactionLimit": 100000,
      "minTransactionAmount": 100
    },
    "fees": {
      "transactionFee": 0.5,
      "fixedFee": 0
    }
  }
}
```

## 签名算法

### 签名生成步骤

1. 移除 `sign` 字段
2. 按字母顺序排序所有参数
3. 构建签名字符串：`key1=value1&key2=value2&...&key=secretKey`
4. 使用 MD5 加密并转为大写

### 签名验证

```javascript
function verifySignature(params, receivedSign, secretKey) {
  const { sign, ...signParams } = params;
  const sortedKeys = Object.keys(signParams).sort();
  
  let signStr = '';
  sortedKeys.forEach(key => {
    if (signParams[key] !== undefined && signParams[key] !== null && signParams[key] !== '') {
      signStr += `${key}=${signParams[key]}&`;
    }
  });
  
  signStr += `key=${secretKey}`;
  const calculatedSign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  
  return calculatedSign === receivedSign;
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 认证失败 |
| 500 | 服务器内部错误 |

## 集成步骤

### 1. 配置支付参数

在 `.env` 文件中配置：
```bash
UNISPAY_MCH_NO=your_merchant_number
UNISPAY_API_KEY=your_api_key
UNISPAY_SECRET_KEY=your_secret_key
UNISPAY_ENV=test  # 或 production
```

### 2. 初始化配置

运行初始化脚本：
```bash
node server/scripts/init-unispay-config.js
```

### 3. 测试支付流程

运行测试脚本：
```bash
node test-unispay-payment.js
```

## 注意事项

1. **异步通知**: 必须正确处理异步通知，返回 `SUCCESS` 字符串
2. **重试机制**: UNISPAY 失败时会重试3次，间隔为3分钟
3. **签名验证**: 所有请求和通知都必须验证签名
4. **金额单位**: API 请求中金额单位为卢比，内部处理时转换为分
5. **订单ID**: 商户订单号必须唯一，长度至少6位
6. **超时设置**: HTTP 请求超时设置为30秒

## 测试用例

### 测试订单创建
```bash
curl -X POST http://localhost:3000/api/unispay/create \
  -H "Content-Type: application/json" \
  -H "X-Merchant-ID: test_merchant_001" \
  -H "X-API-Key: test_api_key_123" \
  -d '{
    "orderid": "TEST123456",
    "amount": "500",
    "desc": "测试唤醒支付",
    "notify_url": "https://example.com/notify",
    "return_url": "https://example.com/return",
    "customer_phone": "919876543210"
  }'
```

### 测试订单查询
```bash
curl -X POST http://localhost:3000/api/unispay/query \
  -H "Content-Type: application/json" \
  -H "X-Merchant-ID: test_merchant_001" \
  -H "X-API-Key: test_api_key_123" \
  -d '{
    "orderid": "TEST123456"
  }'
```

## 技术支持

如有问题，请联系技术支持团队或查看服务器日志获取详细错误信息。
