# CashGit支付平台API文档

## 概述

CashGit是一个专业的4方支付平台，为下游商户提供统一的支付接入服务。我们聚合了AirPay、Cashfree等多家3方支付商，为您提供稳定、高效的支付解决方案。

### 基本信息
- **协议**: HTTPS
- **请求域名**: api.cashgit.com (生产环境)
- **请求方法**: POST
- **参数格式**: `Content-Type: application/json; charset=utf-8`
- **签名方式**: MD5 (默认)

## 商户认证

### 商户信息
- **商户ID**: `appid` 参数
- **商户密钥**: `secret key` 参数
- **签名方式**: MD5

### 数据签名

#### MD5签名生成步骤：
1. **参数排序**: 所有请求参数按ASCII码从小到大排序
2. **拼接参数**: 按 `key=value&key=value...` 格式拼接参数签名源串，注意：源串最后没有"&"
3. **添加密钥**: 拼接好的源串最后拼接上 `secret key`
4. **计算MD5**: 计算最终拼接好签名源串的MD5散列值
5. **提交签名**: 计算得到的散列值作为数据签名参数字段 `sign` 的值，一起提交

#### 签名示例
```
假设请求参数为: orderid=ts202306001&appid=123&amount=100&desc=hello world
排序后: amount=100&appid=123&desc=hello world&orderid=ts202306001
添加密钥: amount=100&appid=123&desc=hello world&orderid=ts202306001{secret_key}
MD5签名: {计算得到的MD5值}
```

## API接口

### 1. 创建支付订单

**接口地址**: `POST /api/pay`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户ID |
| orderid | string | 是 | 订单ID，长度至少6位 |
| amount | string | 是 | 订单金额 |
| desc | string | 否 | 订单描述 |
| notify_url | string | 否 | 异步通知地址 |
| return_url | string | 否 | 同步返回地址 |
| sign | string | 是 | 签名参数 |

**响应参数**:
```json
{
  "code": 200,
  "message": "订单创建成功",
  "data": {
    "orderid": "ts202306001",
    "amount": "100.00",
    "payurl": "支付链接",
    "qrcode": "二维码链接",
    "status": "success"
  },
  "timestamp": 1640995200000
}
```

### 2. 查询订单状态

**接口地址**: `POST /api/query`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户ID |
| orderid | string | 是 | 订单ID |
| sign | string | 是 | 签名参数 |

**响应参数**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "orderid": "ts202306001",
    "amount": "100.00",
    "status": "paid",
    "paytime": 1640995200000,
    "desc": "订单描述"
  },
  "timestamp": 1640995200000
}
```

### 3. 关闭订单

**接口地址**: `POST /api/close`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户ID |
| orderid | string | 是 | 订单ID |
| sign | string | 是 | 签名参数 |

**响应参数**:
```json
{
  "code": 200,
  "message": "订单关闭成功",
  "data": {
    "orderid": "ts202306001",
    "status": "cancelled"
  },
  "timestamp": 1640995200000
}
```

### 4. 退款接口

**接口地址**: `POST /api/refund`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| appid | string | 是 | 商户ID |
| orderid | string | 是 | 订单ID |
| amount | string | 是 | 退款金额 |
| sign | string | 是 | 签名参数 |

**响应参数**:
```json
{
  "code": 200,
  "message": "退款申请成功",
  "data": {
    "orderid": "ts202306001",
    "refund_amount": "50.00",
    "status": "success"
  },
  "timestamp": 1640995200000
}
```

## 订单状态说明

| 状态值 | 说明 |
|--------|------|
| pending | 待支付 |
| paid | 已支付 |
| cancelled | 已取消 |
| refunded | 已退款 |
| failed | 支付失败 |

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 认证失败 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 接入示例

### Node.js示例
```javascript
const axios = require('axios');
const crypto = require('crypto');

// 生成MD5签名
function generateSignature(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  const sourceString = sortedKeys
    .filter(key => key !== 'sign' && params[key] !== undefined && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&') + secretKey;
  
  return crypto.createHash('md5').update(sourceString, 'utf8').digest('hex');
}

// 创建支付订单
async function createPayment() {
  const params = {
    appid: 'your_merchant_id',
    orderid: 'order_' + Date.now(),
    amount: '100.00',
    desc: '测试订单'
  };
  
  const sign = generateSignature(params, 'your_secret_key');
  const requestData = { ...params, sign };
  
  try {
    const response = await axios.post('https://api.cashgit.com/api/pay', requestData);
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
}
```

### PHP示例
```php
<?php
// 生成MD5签名
function generateSignature($params, $secretKey) {
    ksort($params);
    $sourceString = '';
    foreach ($params as $key => $value) {
        if ($key !== 'sign' && $value !== '' && $value !== null) {
            $sourceString .= $key . '=' . $value . '&';
        }
    }
    $sourceString = rtrim($sourceString, '&') . $secretKey;
    return md5($sourceString);
}

// 创建支付订单
$params = [
    'appid' => 'your_merchant_id',
    'orderid' => 'order_' . time(),
    'amount' => '100.00',
    'desc' => '测试订单'
];

$sign = generateSignature($params, 'your_secret_key');
$params['sign'] = $sign;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.cashgit.com/api/pay');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>
```

## 注意事项

1. **安全性**: 请妥善保管商户密钥，不要泄露给第三方
2. **签名验证**: 所有请求必须包含有效的签名
3. **参数格式**: 金额参数使用字符串格式，避免精度问题
4. **订单ID**: 订单ID必须唯一，建议使用时间戳+随机数
5. **异步通知**: 建议配置异步通知地址，及时获取支付状态
6. **错误处理**: 请妥善处理各种错误情况，提供良好的用户体验

## 技术支持

如有技术问题，请联系CashGit技术支持团队。
邮箱: support@cashgit.com
电话: +91-XXXXXXXXXX
