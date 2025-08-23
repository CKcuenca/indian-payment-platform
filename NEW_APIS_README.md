# 🚀 新添加的API接口文档

## 📋 概述

为了达到与PassPay类似的功能水平，我们在现有的CashGit支付系统中添加了以下新功能：

- UTR管理（补单和查询）
- UPI查询
- 代付功能（创建和查询）
- 余额查询

## 🔧 新增接口列表

### 1. UTR补单接口

**接口地址：** `POST /api/utr/submit`

**功能说明：** 当玩家通过UPI支付后，可以通过UTR号进行补单操作

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户应用ID |
| orderid | string | 是 | 商户订单号 |
| utr_number | string | 是 | UTR交易号 |
| amount | string | 是 | 交易金额 |
| sign | string | 是 | MD5签名 |

**响应示例：**
```json
{
  "code": 200,
  "message": "UTR补单成功",
  "data": {
    "orderid": "TEST_UTR_001",
    "utr_number": "UTR123456789",
    "amount": 100.00,
    "status": "processing"
  }
}
```

### 2. UTR状态查询接口

**接口地址：** `POST /api/utr/query`

**功能说明：** 查询UTR补单的状态信息

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户应用ID |
| orderid | string | 是 | 商户订单号 |
| sign | string | 是 | MD5签名 |

**响应示例：**
```json
{
  "code": 200,
  "message": "UTR查询成功",
  "data": {
    "orderid": "TEST_UTR_001",
    "utr_number": "UTR123456789",
    "amount": 100.00,
    "status": "PENDING",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. UPI查询接口

**接口地址：** `POST /api/upi/query`

**功能说明：** 查询可用的UPI账户信息

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户应用ID |
| sign | string | 是 | MD5签名 |

**响应示例：**
```json
{
  "code": 200,
  "message": "UPI查询成功",
  "data": {
    "upi_list": [
      {
        "upi_id": "cashgit@upi",
        "name": "CashGit Payment UPI",
        "status": "ACTIVE",
        "qr_code": "http://localhost:3000/upi/cashgit@upi"
      },
      {
        "upi_id": "pay@cashgit",
        "name": "CashGit UPI Account",
        "status": "ACTIVE",
        "qr_code": "http://localhost:3000/upi/pay@cashgit"
      }
    ]
  }
}
```

### 4. 创建代付订单接口

**接口地址：** `POST /api/payout/create`

**功能说明：** 为玩家创建提现订单，将资金转入指定银行账户

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户应用ID |
| orderid | string | 是 | 商户订单号 |
| amount | string | 是 | 提现金额 |
| account_number | string | 是 | 银行账户号 |
| ifsc_code | string | 是 | IFSC代码 |
| account_holder | string | 是 | 账户持有人姓名 |
| notify_url | string | 否 | 异步通知URL |
| sign | string | 是 | MD5签名 |

**响应示例：**
```json
{
  "code": 200,
  "message": "代付订单创建成功",
  "data": {
    "orderid": "TEST_PAYOUT_001",
    "trade_no": "TXN_1642233600000",
    "amount": "500.00",
    "status": "pending"
  }
}
```

### 5. 查询代付订单状态接口

**接口地址：** `POST /api/payout/query`

**功能说明：** 查询代付订单的当前状态

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户应用ID |
| orderid | string | 是 | 商户订单号 |
| sign | string | 是 | MD5签名 |

**响应示例：**
```json
{
  "code": 200,
  "message": "代付订单查询成功",
  "data": {
    "orderid": "TEST_PAYOUT_001",
    "amount": "500.00",
    "status": "PENDING",
    "account_number": "1234567890",
    "ifsc_code": "SBIN0001234",
    "account_holder": "Test User",
    "create_time": "2024-01-15T10:00:00.000Z",
    "update_time": "2024-01-15T10:00:00.000Z"
  }
}
```

### 6. 余额查询接口

**接口地址：** `POST /api/balance/query`

**功能说明：** 查询商户账户的当前余额

**请求参数：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户应用ID |
| sign | string | 是 | MD5签名 |

**响应示例：**
```json
{
  "code": 200,
  "message": "余额查询成功",
  "data": {
    "balance": "1000.00",
    "currency": "INR",
    "total_deposits": "2000.00",
    "total_withdrawals": "800.00",
    "total_refunds": "200.00",
    "last_update": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔐 签名算法

所有接口都使用相同的MD5签名算法：

1. 将所有参数按照参数名ASCII码从小到大排序
2. 拼接成 `key1=value1&key2=value2` 格式
3. 在字符串末尾拼接上商户密钥
4. 对拼接后的字符串进行MD5加密（32位小写）

**签名示例：**
```javascript
// 原始参数
const params = {
  appid: 'MERCHANT_001',
  orderid: 'ORD1234567890',
  amount: '100.00'
};

// 排序后拼接
const sortedParams = Object.keys(params)
  .sort()
  .map(key => `${key}=${params[key]}`)
  .join('&');
// 结果: amount=100.00&appid=MERCHANT_001&orderid=ORD1234567890

// 拼接密钥
const secretKey = 'YOUR_SECRET_KEY';
const signString = sortedParams + secretKey;

// MD5加密结果
const sign = md5(signString);
```

## 🧪 测试

使用提供的测试文件 `test-new-apis.js` 来验证新接口：

```bash
node test-new-apis.js
```

## 📊 数据模型更新

为了支持新功能，我们更新了以下数据模型：

### Order模型新增字段
- `provider.utrNumber`: UTR交易号
- `provider.utrAmount`: UTR金额

### Transaction模型新增字段
- `provider.utrNumber`: UTR交易号

## 🎯 功能对比

| 功能 | PassPay | 当前系统 | 状态 |
|------|---------|----------|------|
| 代收订单创建 | ✅ | ✅ | 已实现 |
| 代收订单查询 | ✅ | ✅ | 已实现 |
| UTR补单 | ✅ | ✅ | 新增 |
| UTR状态查询 | ✅ | ✅ | 新增 |
| UPI查询 | ✅ | ✅ | 新增 |
| 代付订单创建 | ✅ | ✅ | 新增 |
| 代付订单查询 | ✅ | ✅ | 新增 |
| 余额查询 | ✅ | ✅ | 新增 |

## 🚀 下一步计划

1. **回调处理**：完善代付回调处理机制
2. **状态管理**：增强订单状态管理
3. **风控系统**：集成风控规则
4. **监控告警**：添加系统监控和告警

## 📝 注意事项

1. 所有新接口都使用现有的认证中间件 `mgAuthMiddleware`
2. 签名算法与现有接口保持一致
3. 错误处理和响应格式遵循现有标准
4. 数据模型向后兼容，不影响现有功能

---

**版本：** v1.1.0  
**更新日期：** 2024年1月15日  
**开发者：** CashGit Team
