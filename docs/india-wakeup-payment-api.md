# 印度唤醒支付API对接文档

## 📋 目录

- [前言概述](#前言概述)
- [签名算法](#签名算法)
- [支付类型](#支付类型)
- [存款订单](#存款订单)
- [出款订单](#出款订单)
- [异步通知](#异步通知)
- [查询接口](#查询接口)
- [错误码说明](#错误码说明)
- [示例代码](#示例代码)

---

## 🎯 前言概述

### 概要

本文档定义了接入印度唤醒支付系统的报文接口规范，具体包括：

- **接口通信方式**：涵盖网络通讯方式及接口加解密方式
- **业务处理流程**：涉及代收、代付、流水管理及财务管理等模块
- **交易报文格式说明**：包含入参、出参规范及JSON格式标准

### 目标人群

目标读者为具备开发能力、熟悉相关编程语言的开发、维护及管理人员。

### 请求头说明

💡 **请求头Content-Type为：application/json;charset=utf-8，所有接口一致**

### 相关术语

**平台或系统**
指提供印度唤醒支付功能的我司系统，用于支持商户完成各类交易。

**商户号 (appid)**
这是商户在平台上的唯一标识，用于验证其在平台的合法性。

**商户订单号 (mchOrderId)**
商户系统为每笔订单生成的唯一编号，需确保其唯一性，以便在平台中进行区分。

**支付类型 (payType)**
指用来区分支付产品类别的字段，具体内容详见接口描述。

**加密密钥**
商户用于交易请求前对数据进行加密和验签的关键工具。

**币种 (currency)**
用于区分货币类型的字段，详情参考接口描述部分。

**后台异步回调 (notifyUrl)**
当交易处理完成后，系统会主动通知商户网站并携带相关结果信息。

**商户**
指接入平台并使用其支付服务的客户或机构。

---

## 🔐 签名算法

### 签名规则

#### Step 1. 排序拼接
将非空参数值按照参数名ASCII码从小到大排序（字典序），使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串(strString）。
- 参数名ASCII码从小到大排序
- 如果参数的值为空不参与签名
- 参数名区分大小写

#### Step 2. 拼接key加密
将strString最后拼接上key得到strSign字符串，并对strSign进行`SHA-256`，得到sign值signValue(16进制小写)

### 示例参考【Java】

```java
/**
 * 计算SHA-256摘要值，并转为16进制字符串
 */
public static String checkSha256Hex(Map<String, Object> obj, String key, String signWebKey) {
    TreeMap<String, Object> map = mapToTreeMap(obj);
    String data = strSign(map, key, signWebKey);
    return sha256Hex(data);
}

public static String sha256Hex(String data) {
    return DigestUtil.sha256Hex(data);
}

/**
 * 字符拼接k=1&v=2形式
 */
public static String strSign(TreeMap<String, Object> map, String key, String signKye) {
    StringBuilder builder = new StringBuilder();
    map.forEach((k, v) -> {
        builder.append(k).append("=").append(v).append("&");
    });
    builder.append(signKye).append("=").append(key);
    return builder.toString();
}
```

---

## 🔐 认证和签名要求

### 认证机制

所有API接口都需要通过商户认证中间件验证，包括：

1. **商户身份验证**: 验证 `appid` 对应的商户是否存在且状态为 `ACTIVE`
2. **签名验证**: 验证请求参数的签名是否正确
3. **参数完整性**: 确保所有必填参数都已提供

### 签名要求

#### 签名算法
- **算法**: SHA-256
- **编码**: 16进制小写
- **密钥**: 商户的 `secretKey`

#### 签名步骤
1. **参数过滤**: 移除空值、null、undefined 的参数
2. **参数排序**: 按参数名ASCII码从小到大排序
3. **参数拼接**: 使用 `key=value&key=value` 格式拼接
4. **密钥拼接**: 在最后添加 `&key=商户密钥`
5. **哈希计算**: 对拼接后的字符串进行SHA-256计算

#### 签名示例
```javascript
// 原始参数
const params = {
  appid: 'M171925157713',
  mchOrderId: 'test_001',
  timestamp: '1726228640694',
  payType: 9111,
  amount: '100',
  currency: 'INR',
  notifyUrl: 'http://localhost:8080/notify'
};

// 1. 过滤空值
const filteredParams = Object.keys(params)
  .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
  .reduce((result, key) => {
    result[key] = params[key];
    return result;
  }, {});

// 2. 排序并拼接
const signString = Object.keys(filteredParams)
  .sort()
  .map(key => `${key}=${filteredParams[key]}`)
  .join('&') + '&key=your_secret_key';

// 3. SHA-256计算
const sign = crypto.createHash('sha256').update(signString).digest('hex');
```

### 认证失败响应

当认证失败时，系统会返回以下格式的响应：

```json
{
  "code": 401,
  "message": "商户不存在或未激活",
  "data": null
}
```

常见认证错误：

| 错误码 | 错误消息 | 原因 |
|--------|----------|------|
| 400 | 缺少商户ID (appid) | 请求中未提供appid参数 |
| 400 | 缺少签名参数 (sign) | 请求中未提供sign参数 |
| 401 | 商户不存在或未激活 | appid对应的商户不存在或状态非ACTIVE |
| 400 | 签名验证失败 | 签名计算错误或密钥不正确 |

---

## 💳 支付类型

### 印度唤醒支付类型

| 支付类型ID | 支付类型名称 | 说明 | 状态 |
|------------|--------------|------|------|
| 9111 | 印度一类（唤醒） | 印度唤醒支付方式，通过UPI转账到指定账户 | ✅ 支持 |

**注意**: 当前系统仅支持支付类型 9111，其他支付类型暂不支持。

---

## 💰 存款订单

### 申请存款（Deposit通用）

#### 接口信息

- **接口地址**: `/api/wakeup/create`
- **请求方式**: POST
- **Content-Type**: application/json

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | ✅ | 商户号（与商户ID一致） |
| orderid | string | ✅ | 商户订单号(唯一不重复，长度至少6位) |
| timestamp | string | ✅ | 请求时间戳(unix时间戳毫秒) |
| payType | integer | ✅ | 支付类型（固定为9111） |
| amount | string | ✅ | 支付金额元(可接收小数点后2位) |
| currency | string | ✅ | 币种（固定为INR） |
| notify_url | string | ✅ | 支付结果通知地址 |
| return_url | string | ✅ | 支付完成返回地址 |
| customer_phone | string | ✅ | 客户手机号 |
| desc | string | ❌ | 订单描述 |
| useDhPay | boolean | ❌ | 是否使用DhPay作为上游支付通道 |
| sign | string | ✅ | 签名（此字段不参与签名） |

#### 请求示例

```json
{
  "appid": "M171925157713",
  "orderid": "test001",
  "timestamp": "1726228640694",
  "payType": 9111,
  "amount": "105",
  "currency": "INR",
  "notify_url": "http://localhost:8080/notify",
  "return_url": "http://localhost:8080/return",
  "customer_phone": "919876543210",
  "desc": "Game deposit",
  "useDhPay": false,
  "sign": "7c5642e9ec5455b5a09af5abc6543da10b4fbc835b16432802af96327ea0b880"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 响应状态码，200表示成功 |
| message | string | 响应消息 |
| data | object | 响应数据（成功时） |
| data.orderid | string | 商户订单号 |
| data.status | string | 订单状态 |
| data.message | string | 响应消息 |
| data.upi_transfer_info | object | UPI转账信息（传统唤醒模式） |
| data.payment_url | string | 支付链接（DhPay模式） |
| data.dhpay_order_id | string | DhPay订单ID（DhPay模式） |
| data.verification_required | boolean | 是否需要验证 |

#### 响应示例（传统唤醒模式）

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "orderid": "test001",
    "status": "PENDING",
    "message": "请通过UPI转账到指定账户，转账完成后系统将自动验证",
    "upi_transfer_info": {
      "beneficiaryName": "RAHUL KUMAR",
      "beneficiaryUPI": "rahul.kumar@hdfc",
      "beneficiaryAccount": "1234567890",
      "ifscCode": "HDFC0001234",
      "bankName": "HDFC Bank",
      "amount": 105,
      "currency": "INR",
      "transferNote": "Order: test001 - Game deposit",
      "expectedCompletionTime": "5-10 minutes"
    },
    "verification_required": true
  }
}
```

#### 响应示例（DhPay模式）

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "orderid": "test001",
    "status": "PENDING",
    "message": "DhPay订单创建成功",
    "payment_url": "https://test-api.dhpay.com/payment/12345",
    "dhpay_order_id": "DH20240101123456",
    "verification_required": false
  }
}
```

---

## 💸 出款订单

### 申请出款（Withdraw通用）

#### 接口信息

- **接口地址**: `/api/payout/create`
- **请求方式**: POST
- **Content-Type**: application/json

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | ✅ | 商户号（与商户ID一致） |
| mchOrderId | string | ✅ | 商户订单号(唯一不重复) |
| timestamp | string | ✅ | 请求时间戳(unix时间戳毫秒) |
| payType | integer | ✅ | 支付类型（固定为9111） |
| amount | string | ✅ | 出款金额元(可接收小数点后2位) |
| currency | string | ✅ | 币种（固定为INR） |
| notifyUrl | string | ✅ | 出款结果通知地址 |
| customerPhone | string | ✅ | 客户手机号 |
| sign | string | ✅ | 签名（此字段不参与签名） |

#### 请求示例

```json
{
  "appid": "M171925157713",
  "mchOrderId": "withdraw_test",
  "timestamp": "1726228640694",
  "payType": 9111,
  "amount": "100",
  "currency": "INR",
  "notifyUrl": "http://localhost:8080/withdraw_notify",
  "customerPhone": "919876543210",
  "sign": "7c5642e9ec5455b5a09af5abc6543da10b4fbc835b16432802af96327ea0b880"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 响应状态码，200表示成功 |
| message | string | 响应消息 |
| data | object | 响应数据（成功时） |
| data.orderid | string | 商户订单号 |
| data.status | string | 订单状态 |
| data.message | string | 响应消息 |

---

## 📡 异步通知

### 支付结果通知

#### 通知地址
商户在创建订单时提供的 `notifyUrl`

#### 通知参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| orderId | string | 商户订单号 |
| status | string | 订单状态 |
| amount | number | 支付金额 |
| currency | string | 币种 |
| timestamp | string | 通知时间戳 |
| sign | string | 签名 |

#### 订单状态说明

| 状态值 | 说明 |
|--------|------|
| PENDING_VERIFICATION | 待验证（等待UPI转账完成） |
| SUCCESS | 支付成功 |
| FAILED | 支付失败 |
| CANCELLED | 订单取消 |

---

## 🔍 查询接口

### 订单查询

#### 接口信息

- **接口地址**: `/api/wakeup/query`
- **请求方式**: POST
- **Content-Type**: application/json

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | ✅ | 商户号 |
| orderid | string | ✅ | 商户订单号 |
| timestamp | string | ✅ | 请求时间戳 |
| sign | string | ✅ | 签名 |

#### 请求示例

```json
{
  "appid": "M171925157713",
  "orderid": "test001",
  "timestamp": "1726228640694",
  "sign": "calculated_signature_here"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 响应状态码，200表示成功 |
| message | string | 响应消息 |
| data | object | 订单数据 |
| data.orderid | string | 商户订单号 |
| data.status | string | 订单状态 |
| data.message | string | 状态描述 |
| data.transfer_info | object | 转账信息 |

#### 响应示例

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "orderid": "test001",
    "status": "PENDING_VERIFICATION",
    "message": "等待UPI转账完成",
    "transfer_info": {
      "beneficiaryName": "RAHUL KUMAR",
      "beneficiaryUPI": "rahul.kumar@hdfc",
      "amount": 105
    }
  }
}
```

---

## ❌ 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求参数格式和必填项 |
| 401 | 认证失败 | 检查商户号和签名 |
| 500 | 系统错误 | 联系技术支持 |

---

## 💻 示例代码

### Node.js 示例

```javascript
const crypto = require('crypto');

// 生成签名
function generateSign(params, secretKey) {
  // 过滤空值并排序
  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  // 拼接参数
  const signString = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&') + `&key=${secretKey}`;
  
  // SHA-256加密
  return crypto.createHash('sha256').update(signString).digest('hex');
}

// 创建存款订单
async function createDepositOrder() {
  const params = {
    appid: 'M171925157713',
    orderid: 'test_' + Date.now(),
    timestamp: Date.now().toString(),
    payType: 9111,
    amount: '100',
    currency: 'INR',
    notify_url: 'http://localhost:8080/notify',
    return_url: 'http://localhost:8080/return',
    customer_phone: '919876543210',
    desc: 'Game deposit',
    useDhPay: false
  };
  
  // 生成签名
  params.sign = generateSign(params, 'your_secret_key');
  
  try {
    const response = await fetch('https://cashgit.com/api/wakeup/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    
    // 检查响应格式
    if (result.code === 200) {
      console.log('✅ 订单创建成功:', result.data);
      if (result.data.upi_transfer_info) {
        console.log('💳 UPI转账信息:', result.data.upi_transfer_info);
      }
      if (result.data.payment_url) {
        console.log('🔗 支付链接:', result.data.payment_url);
      }
    } else {
      console.error('❌ 订单创建失败:', result.message);
    }
  } catch (error) {
    console.error('创建订单失败:', error);
  }
}

// 查询订单状态
async function queryOrderStatus(orderid) {
  const params = {
    appid: 'M171925157713',
    orderid: orderid,
    timestamp: Date.now().toString()
  };
  
  params.sign = generateSign(params, 'your_secret_key');
  
  try {
    const response = await fetch('https://cashgit.com/api/wakeup/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    
    if (result.code === 200) {
      console.log('✅ 查询成功:', result.data);
      return result.data;
    } else {
      console.error('❌ 查询失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('查询订单失败:', error);
    return null;
  }
}

// 手动验证转账
async function verifyTransfer(orderid, utrNumber, transferAmount) {
  const params = {
    appid: 'M171925157713',
    orderid: orderid,
    utr_number: utrNumber,
    transfer_amount: transferAmount.toString(),
    transfer_date: new Date().toISOString(),
    timestamp: Date.now().toString()
  };
  
  params.sign = generateSign(params, 'your_secret_key');
  
  try {
    const response = await fetch('https://cashgit.com/api/wakeup/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    
    if (result.code === 200) {
      console.log('✅ 验证成功:', result.data);
      return result.data;
    } else {
      console.error('❌ 验证失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('验证转账失败:', error);
    return null;
  }
}

// 完整的错误处理示例
async function createOrderWithErrorHandling() {
  try {
    const params = {
      appid: 'M171925157713',
      orderid: 'test_' + Date.now(),
      timestamp: Date.now().toString(),
      payType: 9111,
      amount: '100',
      currency: 'INR',
      notify_url: 'http://localhost:8080/notify',
      return_url: 'http://localhost:8080/return',
      customer_phone: '919876543210',
      desc: 'Game deposit',
      useDhPay: false
    };
    
    params.sign = generateSign(params, 'your_secret_key');
    
    const response = await fetch('https://cashgit.com/api/wakeup/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    
    switch (result.code) {
      case 200:
        console.log('✅ 订单创建成功');
        console.log('订单ID:', result.data.orderid);
        console.log('状态:', result.data.status);
        if (result.data.upi_transfer_info) {
          console.log('💳 UPI转账信息:', result.data.upi_transfer_info);
        }
        if (result.data.payment_url) {
          console.log('🔗 支付链接:', result.data.payment_url);
        }
        break;
      case 400:
        console.error('❌ 参数错误:', result.message);
        break;
      case 401:
        console.error('❌ 认证失败:', result.message);
        break;
      case 500:
        console.error('❌ 系统错误:', result.message);
        break;
      default:
        console.error('❌ 未知错误:', result.message);
    }
  } catch (error) {
    console.error('网络错误:', error.message);
  }
}
```

---

## 🧪 测试环境要求

### 测试商户设置

在测试API接口之前，需要确保：

1. **商户已创建**: 在系统中创建测试商户账户
2. **商户状态**: 商户状态必须为 `ACTIVE`
3. **支付配置**: 配置对应的支付提供商（如wakeup）
4. **密钥配置**: 确保商户的 `secretKey` 正确配置

### 创建测试商户

可以使用以下脚本创建测试商户：

```javascript
// 创建测试商户脚本
const mongoose = require('mongoose');
const Merchant = require('./models/merchant');

async function createTestMerchant() {
  try {
    await mongoose.connect('mongodb://localhost:27017/payment-platform');
    
    const testMerchant = new Merchant({
      merchantId: 'TEST_MERCHANT_001',
      name: '测试商户',
      email: 'test@example.com',
      status: 'ACTIVE',
      apiKey: 'test_api_key_123',
      secretKey: 'test_secret_key_123'
    });
    
    await testMerchant.save();
    console.log('✅ 测试商户创建成功:', testMerchant.merchantId);
  } catch (error) {
    console.error('❌ 创建测试商户失败:', error);
  }
}
```

### 测试数据准备

1. **订单ID**: 确保每次测试使用唯一的订单ID
2. **金额**: 使用合理的测试金额（如100 INR）
3. **回调URL**: 使用可访问的测试回调地址
4. **时间戳**: 使用当前时间戳，确保不重复

### 测试流程建议

1. **基础认证测试**: 先测试商户认证和签名验证
2. **参数验证测试**: 测试各种参数组合和边界值
3. **业务流程测试**: 测试完整的订单创建和查询流程
4. **错误处理测试**: 测试各种错误情况的处理

### 常见测试问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 商户不存在 | 商户未创建或状态非ACTIVE | 检查商户配置和状态 |
| 签名验证失败 | 密钥错误或签名算法错误 | 检查secretKey和签名计算 |
| 支付配置缺失 | 未配置对应的支付提供商 | 在后台配置支付提供商 |
| 订单ID重复 | 使用了已存在的订单ID | 使用新的唯一订单ID |

---

## 📝 注意事项

1. **支付类型**: 当前系统仅支持支付类型 9111（印度一类唤醒）
2. **币种**: 仅支持 INR 币种
3. **订单ID**: 必须唯一，长度至少6位
4. **金额**: 支持小数点后2位，最小金额1 INR
5. **验证流程**: 
   - **传统唤醒模式**: 用户通过UPI转账到指定账户，系统自动或手动验证
   - **DhPay模式**: 通过DhPay提供的支付链接完成支付
6. **响应格式**: 系统使用 `code` 字段表示状态码，200表示成功
7. **认证要求**: 所有接口都需要商户认证和签名验证
8. **签名算法**: 使用SHA-256算法，密钥为商户的secretKey
9. **错误处理**: 系统返回统一的错误格式，包含code、message和data字段
10. **两种模式**:
    - **传统唤醒**: 返回UPI转账信息，需要手动验证
    - **DhPay集成**: 返回支付链接，自动处理支付流程
11. **手动验证**: 支持通过UTR号码手动验证转账完成
12. **账户管理**: 系统维护多个收款账户，自动选择可用账户
13. **回调通知**: 支付完成后会向商户的notify_url发送异步通知
14. **测试环境**: 需要先创建测试商户并配置wakeup支付提供商

## 🔄 支付流程说明

### 传统唤醒模式流程
1. 商户调用创建订单接口
2. 系统返回UPI转账信息
3. 用户手动通过UPI应用转账
4. 系统检测到转账或商户手动验证
5. 系统发送回调通知给商户

### DhPay模式流程  
1. 商户调用创建订单接口（设置useDhPay=true）
2. 系统返回DhPay支付链接
3. 用户通过支付链接完成支付
4. DhPay发送回调给系统
5. 系统发送回调通知给商户

## 🔧 额外接口

### 手动验证转账
- **接口地址**: `/api/wakeup/verify`
- **用途**: 当自动验证失败时，可通过UTR号码手动验证转账

### 获取收款账户
- **接口地址**: `/api/wakeup/accounts`  
- **用途**: 获取当前可用的收款账户信息

### 状态检查
- **接口地址**: `/api/wakeup/check-status`
- **用途**: 定时任务调用，检查待验证订单的转账状态

---

## 🔗 相关链接

- [系统状态监控](/api/health)
- [支付配置管理](/api/payment-config)
- [商户管理](/api/merchant)
