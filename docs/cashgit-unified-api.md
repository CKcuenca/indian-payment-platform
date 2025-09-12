# 📋 CashGit支付平台统一API文档

## 📖 概述

CashGit是一个专业的印度游戏聚合支付平台，为下游商户提供统一的支付接入服务。我们聚合了PassPay、DHPay、UnisPay等多家主流支付商，为您提供稳定、高效的支付解决方案。

### 🔧 基本信息
- **协议**: HTTPS (必须)
- **生产域名**: https://cashgit.com
- **测试域名**: https://test.cashgit.com  
- **请求方法**: POST
- **参数格式**: `Content-Type: application/json; charset=utf-8`
- **签名方式**: MD5 (小写)
- **时区**: Asia/Kolkata
- **金额单位**: INR (印度卢比)

### 🆔 商户信息
- **商户ID**: `appid` 参数 (由平台分配)
- **商户密钥**: `secret key` 参数 (用于签名验证)
- **状态**: ACTIVE (激活状态方可使用)

---

## 🔐 sign 加密

### MD5签名算法

#### 签名生成步骤：
1. **参数排序**: 所有请求参数按ASCII码从小到大排序
2. **过滤参数**: 排除 `sign` 参数和空值参数
3. **拼接参数**: 按 `key=value&key=value...` 格式拼接，源串最后**没有"&"**
4. **添加密钥**: 拼接串最后加上 `&key={secret_key}`
5. **计算MD5**: 对最终字符串计算MD5值并**转为小写**
6. **提交签名**: 将MD5值作为 `sign` 参数提交

#### 🔍 签名示例
```bash
# 原始参数
orderid=ORDER_20231201001
appid=cgpay
amount=100.00
desc=游戏充值
notify_url=https://merchant.com/notify

# 1. 排序后拼接
amount=100.00&appid=cgpay&desc=游戏充值&notify_url=https://merchant.com/notify&orderid=ORDER_20231201001

# 2. 添加密钥
amount=100.00&appid=cgpay&desc=游戏充值&notify_url=https://merchant.com/notify&orderid=ORDER_20231201001&key=your_secret_key

# 3. MD5签名 (小写)
sign=md5(上述字符串).toLowerCase()
```

#### ⚠️ 签名注意事项
- **参数过滤**: 空值、null、undefined参数不参与签名
- **字符编码**: 使用UTF-8编码
- **大小写**: MD5结果必须转为小写
- **密钥安全**: 商户密钥仅用于签名，不可在请求中传输
- **回调验证**: 接收回调时需要验证签名确保数据安全

---

## 📥 代收

### 创建代收订单

**接口地址**: `POST /api/pay`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| orderid | string | 是 | 商户订单号，长度6-32位 | "ORDER_20231201001" |
| amount | string | 是 | 订单金额(INR) | "100.00" |
| desc | string | 否 | 订单描述 | "游戏充值" |
| pay_id | string | 否 | 支付类型：1或缺省=原生支付，2=唤醒支付 | "1" |
| customer_phone | string | 条件 | 客户手机号，唤醒支付时必填 | "1234567890" |
| notify_url | string | 否 | 异步通知地址 | "https://merchant.com/notify" |
| return_url | string | 否 | 同步返回地址 | "https://merchant.com/return" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "订单创建成功",
  "data": {
    "orderid": "ORDER_20231201001",
    "platform_orderid": "CG202312010001",
    "amount": "100.00",
    "payurl": "https://payment.gateway.com/pay/abc123",
    "qrcode": "https://api.qrserver.com/v1/create-qr-code/?data=...",
    "status": "pending",
    "pay_type": "native",
    "expires_at": "2023-12-01T15:30:00+05:30"
  },
  "timestamp": 1701422400000
}
```

### 代收回调

**回调地址**: 商户提供的 `notify_url`
**回调方式**: POST
**回调时机**: 订单状态发生变化时

**📋 回调参数**:
| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| orderid | string | 商户订单号 | "ORDER_20231201001" |
| platform_orderid | string | 平台订单号 | "CG202312010001" |
| amount | string | 订单金额 | "100.00" |
| status | string | 订单状态 | "paid" |
| paytime | number | 支付时间戳 | 1701422400000 |
| utr | string | UTR交易号 | "341234567890" |
| sign | string | 签名 | "a1b2c3..." |

**✅ 回调响应**: 商户需返回字符串 `"success"` 表示处理成功

### 查询代收订单状态

**接口地址**: `POST /api/query`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| orderid | string | 是 | 商户订单号 | "ORDER_20231201001" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "orderid": "ORDER_20231201001",
    "platform_orderid": "CG202312010001",
    "amount": "100.00",
    "status": "paid",
    "pay_type": "native",
    "paytime": 1701422400000,
    "utr": "341234567890",
    "desc": "游戏充值",
    "created_at": 1701421800000,
    "updated_at": 1701422400000
  },
  "timestamp": 1701422400000
}
```

### UTR补单

**接口地址**: `POST /api/utr/submit`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| orderid | string | 是 | 商户订单号 | "ORDER_20231201001" |
| utr | string | 是 | UTR交易号 | "341234567890" |
| amount | string | 是 | 支付金额 | "100.00" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "UTR补单提交成功",
  "data": {
    "orderid": "ORDER_20231201001",
    "utr": "341234567890",
    "status": "processing",
    "submitted_at": 1701422400000
  },
  "timestamp": 1701422400000
}
```

### 查询我方UPI

**接口地址**: `POST /api/upi/query`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "upi_list": [
      {
        "upi_id": "merchant@paytm",
        "upi_name": "Merchant Account",
        "status": "active",
        "daily_limit": "500000.00"
      }
    ],
    "total_count": 1
  },
  "timestamp": 1701422400000
}
```

### 关闭代收订单

**接口地址**: `POST /api/close`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| orderid | string | 是 | 商户订单号 | "ORDER_20231201001" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "订单关闭成功",
  "data": {
    "orderid": "ORDER_20231201001",
    "platform_orderid": "CG202312010001",
    "status": "cancelled",
    "closed_at": 1701422400000
  },
  "timestamp": 1701422400000
}
```

---

## 📤 代付

### 创建代付订单

**接口地址**: `POST /api/payout/create`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| orderid | string | 是 | 商户订单号，长度6-32位 | "PAYOUT_20231201001" |
| amount | string | 是 | 代付金额(INR) | "500.00" |
| account_name | string | 是 | 收款人姓名 | "Rajesh Kumar" |
| account_number | string | 是 | 收款账号 | "1234567890123456" |
| ifsc | string | 是 | IFSC代码 | "SBIN0001234" |
| mobile | string | 是 | 收款人手机号 | "9876543210" |
| email | string | 否 | 收款人邮箱 | "rajesh@example.com" |
| notify_url | string | 否 | 异步通知地址 | "https://merchant.com/payout/notify" |
| desc | string | 否 | 代付描述 | "游戏提现" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "代付订单创建成功",
  "data": {
    "orderid": "PAYOUT_20231201001",
    "platform_orderid": "PO202312010001",
    "amount": "500.00",
    "fee": "10.00",
    "actual_amount": "490.00",
    "status": "processing",
    "account_name": "Rajesh Kumar",
    "account_number": "1234567890123456",
    "created_at": 1701422400000
  },
  "timestamp": 1701422400000
}
```

### 代付回调

**回调地址**: 商户提供的 `notify_url`
**回调方式**: POST
**回调时机**: 代付状态发生变化时

**📋 回调参数**:
| 参数名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| orderid | string | 商户订单号 | "PAYOUT_20231201001" |
| platform_orderid | string | 平台订单号 | "PO202312010001" |
| amount | string | 代付金额 | "500.00" |
| fee | string | 手续费 | "10.00" |
| actual_amount | string | 实际到账金额 | "490.00" |
| status | string | 代付状态 | "success" |
| utr | string | UTR交易号 | "341234567891" |
| completed_at | number | 完成时间戳 | 1701422400000 |
| sign | string | 签名 | "a1b2c3..." |

**✅ 回调响应**: 商户需返回字符串 `"success"` 表示处理成功

### 查询代付订单状态

**接口地址**: `POST /api/payout/query`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| orderid | string | 是 | 商户订单号 | "PAYOUT_20231201001" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "orderid": "PAYOUT_20231201001",
    "platform_orderid": "PO202312010001",
    "amount": "500.00",
    "fee": "10.00",
    "actual_amount": "490.00",
    "status": "success",
    "account_name": "Rajesh Kumar",
    "account_number": "1234567890123456",
    "ifsc": "SBIN0001234",
    "utr": "341234567891",
    "desc": "游戏提现",
    "created_at": 1701421800000,
    "completed_at": 1701422400000
  },
  "timestamp": 1701422400000
}
```

### 余额查询

**接口地址**: `POST /api/balance/query`

**📋 请求参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appid | string | 是 | 商户ID | "cgpay" |
| sign | string | 是 | MD5签名参数 | "a1b2c3..." |

**✅ 响应参数**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "balance": "10000.00",
    "frozen_balance": "500.00",
    "available_balance": "9500.00",
    "currency": "INR",
    "updated_at": 1701422400000
  },
  "timestamp": 1701422400000
}
```

---

## 📊 订单状态说明

### 代收订单状态
| 状态值 | 说明 | 英文说明 |
|--------|------|----------|
| pending | 待支付 | Order created, waiting for payment |
| paid | 已支付 | Payment successful |
| cancelled | 已取消 | Order cancelled |
| expired | 已过期 | Order expired |
| failed | 支付失败 | Payment failed |

### 代付订单状态
| 状态值 | 说明 | 英文说明 |
|--------|------|----------|
| pending | 待处理 | Payout created, waiting for processing |
| processing | 处理中 | Payout is being processed |
| success | 代付成功 | Payout successful |
| failed | 代付失败 | Payout failed |
| rejected | 已拒绝 | Payout rejected |

---

## ⚠️ 错误码说明

| 错误码 | 说明 | 英文说明 |
|--------|------|----------|
| 200 | 成功 | Success |
| 400 | 参数错误 | Bad Request - Invalid parameters |
| 401 | 认证失败 | Unauthorized - Authentication failed |
| 403 | 权限不足 | Forbidden - Insufficient permissions |
| 404 | 资源不存在 | Not Found - Resource does not exist |
| 409 | 订单已存在 | Conflict - Order already exists |
| 429 | 请求过频 | Too Many Requests - Rate limit exceeded |
| 500 | 服务器内部错误 | Internal Server Error |
| 502 | 网关错误 | Bad Gateway - Upstream error |
| 503 | 服务不可用 | Service Unavailable |

---

## 🔧 接入示例

### Node.js示例
```javascript
const axios = require('axios');
const crypto = require('crypto');

// 生成MD5签名
function generateSignature(params, secretKey) {
  // 1. 过滤并排序参数
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== '')
    .sort();
  
  // 2. 拼接参数字符串
  const sourceString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${secretKey}`;
  
  // 3. 计算MD5并转小写
  return crypto.createHash('md5').update(sourceString, 'utf8').digest('hex').toLowerCase();
}

// 创建代收订单
async function createPayment() {
  const params = {
    appid: 'cgpay',
    orderid: 'ORDER_' + Date.now(),
    amount: '100.00',
    desc: '游戏充值',
    notify_url: 'https://merchant.com/notify'
  };
  
  const sign = generateSignature(params, 'your_secret_key');
  const requestData = { ...params, sign };
  
  try {
    const response = await axios.post('https://cashgit.com/api/pay', requestData, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('支付订单创建成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('支付订单创建失败:', error.response?.data || error.message);
  }
}

// 查询订单状态
async function queryOrder(orderid) {
  const params = {
    appid: 'cgpay',
    orderid: orderid
  };
  
  const sign = generateSignature(params, 'your_secret_key');
  const requestData = { ...params, sign };
  
  try {
    const response = await axios.post('https://cashgit.com/api/query', requestData, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('订单查询成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('订单查询失败:', error.response?.data || error.message);
  }
}

// 验证回调签名
function verifyCallback(callbackData, secretKey) {
  const { sign, ...params } = callbackData;
  const expectedSign = generateSignature(params, secretKey);
  return sign === expectedSign;
}

// 使用示例
async function example() {
  // 创建订单
  const result = await createPayment();
  if (result?.code === 200) {
    const orderid = result.data.orderid;
    
    // 查询订单状态
    setTimeout(async () => {
      await queryOrder(orderid);
    }, 5000);
  }
}

// 导出函数
module.exports = {
  generateSignature,
  createPayment,
  queryOrder,
  verifyCallback
};
```

### PHP示例
```php
<?php
// 生成MD5签名
function generateSignature($params, $secretKey) {
    // 1. 过滤空值参数
    $filteredParams = array_filter($params, function($value, $key) {
        return $key !== 'sign' && $value !== '' && $value !== null;
    }, ARRAY_FILTER_USE_BOTH);
    
    // 2. 按key排序
    ksort($filteredParams);
    
    // 3. 拼接参数字符串
    $sourceString = '';
    foreach ($filteredParams as $key => $value) {
        $sourceString .= $key . '=' . $value . '&';
    }
    $sourceString = rtrim($sourceString, '&') . '&key=' . $secretKey;
    
    // 4. 计算MD5并转小写
    return strtolower(md5($sourceString));
}

// 创建代收订单
function createPayment() {
    $params = [
        'appid' => 'cgpay',
        'orderid' => 'ORDER_' . time(),
        'amount' => '100.00',
        'desc' => '游戏充值',
        'notify_url' => 'https://merchant.com/notify'
    ];
    
    $secretKey = 'your_secret_key';
    $params['sign'] = generateSignature($params, $secretKey);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://cashgit.com/api/pay',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($params),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT => 30
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        echo "支付订单创建成功:\n" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return $result;
    } else {
        echo "请求失败，HTTP状态码: $httpCode\n";
        echo "响应内容: $response\n";
        return null;
    }
}

// 验证回调签名
function verifyCallback($callbackData, $secretKey) {
    $sign = $callbackData['sign'];
    unset($callbackData['sign']);
    
    $expectedSign = generateSignature($callbackData, $secretKey);
    return $sign === $expectedSign;
}

// 处理支付回调
function handlePaymentCallback() {
    $input = file_get_contents('php://input');
    $callbackData = json_decode($input, true);
    
    if (!$callbackData) {
        http_response_code(400);
        echo "Invalid JSON data";
        return;
    }
    
    $secretKey = 'your_secret_key';
    
    // 验证签名
    if (!verifyCallback($callbackData, $secretKey)) {
        http_response_code(401);
        echo "Signature verification failed";
        return;
    }
    
    // 处理业务逻辑
    $orderid = $callbackData['orderid'];
    $status = $callbackData['status'];
    $amount = $callbackData['amount'];
    $utr = $callbackData['utr'] ?? '';
    
    // TODO: 更新订单状态到数据库
    // updateOrderStatus($orderid, $status, $amount, $utr);
    
    // 返回成功响应
    echo "success";
}

// 使用示例
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handlePaymentCallback();
} else {
    createPayment();
}
?>
```

---

## 📝 注意事项

### 🔒 安全要求
1. **HTTPS**: 生产环境必须使用HTTPS协议
2. **签名验证**: 所有请求和回调都必须进行签名验证
3. **密钥保护**: 商户密钥严格保密，定期更换
4. **IP白名单**: 建议配置服务器IP白名单

### 💡 最佳实践
1. **订单号唯一性**: 确保商户订单号在商户系统中唯一
2. **幂等性**: 相同订单号的重复请求应返回相同结果
3. **超时处理**: 设置合理的请求超时时间(建议30秒)
4. **重试机制**: 网络异常时实现指数退避重试
5. **日志记录**: 完整记录请求响应日志用于问题排查

### 📞 回调处理
1. **异步处理**: 回调通知采用异步方式，不依赖同步返回
2. **重试机制**: 平台会重试失败的回调通知(最多5次)
3. **签名验证**: 必须验证回调数据签名
4. **幂等处理**: 相同订单的多次回调应保持幂等性
5. **快速响应**: 回调接口应在3秒内返回"success"

### 🚫 限制说明
1. **请求频率**: 单商户每秒最多10次请求
2. **订单金额**: 单笔订单金额10-50000 INR
3. **订单有效期**: 订单创建后15分钟内有效
4. **日交易限额**: 根据商户等级设置不同限额

---

## 🆘 技术支持

### 📧 联系方式
- **技术支持邮箱**: support@cashgit.com
- **商务合作邮箱**: business@cashgit.com
- **紧急联系电话**: +91-XXXXXXXXXX

### 📚 开发资源
- **API测试工具**: [Postman Collection](./Indian-Payment-Platform-API.postman_collection.json)
- **SDK下载**: 提供Node.js、PHP、Java、Python等多语言SDK
- **测试环境**: https://test.cashgit.com
- **状态页面**: https://status.cashgit.com

### ⏰ 服务时间
- **技术支持**: 7×24小时
- **人工客服**: 工作日09:00-18:00 (IST)
- **紧急响应**: 30分钟内响应

---

**⚡ 版本信息**: v2.0 | 更新时间: 2023-12-01 | 支持统一支付接口

---