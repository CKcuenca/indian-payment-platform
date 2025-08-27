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

**商户号**
这是商户在平台上的唯一标识，用于验证其在平台的合法性。

**商户订单号**
商户系统为每笔订单生成的唯一编号，需确保其唯一性，以便在平台中进行区分。

**支付类型**
指用来区分支付产品类别的字段，具体内容详见接口描述。

**加密密钥**
商户用于交易请求前对数据进行加密和验签的关键工具。

**币种**
用于区分货币类型的字段，详情参考接口描述部分。

**后台异步回调**
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

## 💳 支付类型

### 印度唤醒支付类型

| 支付类型ID | 支付类型名称 | 说明 | 状态 |
|------------|--------------|------|------|
| 1001 | UPI唤醒支付 | 印度UPI唤醒支付方式 | ✅ 支持 |
| 1002 | 银行卡唤醒支付 | 印度银行卡唤醒支付方式 | ✅ 支持 |
| 1003 | 钱包唤醒支付 | 印度数字钱包唤醒支付方式 | ✅ 支持 |
| 1004 | 网银唤醒支付 | 印度网银唤醒支付方式 | ✅ 支持 |

---

## 💰 存款订单

### 申请存款（Deposit通用）

#### 接口信息

- **接口地址**: `/api/order/create`
- **请求方式**: POST
- **Content-Type**: application/json

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mchNo | string | ✅ | 商户号 |
| mchOrderId | string | ✅ | 商户订单号(唯一不重复) |
| timestamp | string | ✅ | 请求时间戳(unix时间戳毫秒) |
| payType | integer | ✅ | 支付类型 |
| amount | string | ✅ | 支付金额元(可接收小数点后2位) |
| notifyUrl | string | ✅ | 支付结果通知地址 |
| returnUrl | string | ✅ | 支付成功跳转地址 |
| sign | string | ✅ | 签名（此字段不参与签名） |

#### 请求示例

```json
{
  "mchNo": "M171925157713",
  "mchOrderId": "test",
  "timestamp": "1726228640694",
  "payType": 1001,
  "amount": "105",
  "notifyUrl": "http://localhost:8080/test",
  "returnUrl": "http://localhost:8080/success",
  "sign": "7c5642e9ec5455b5a09af5abc6543da10b4fbc835b16432802af96327ea0b880"
}
```

#### 响应参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 响应码，0表示成功 |
| msg | string | 响应消息 |
| data | object | 响应数据 |
| data.orderId | string | 平台订单号 |
| data.payUrl | string | 支付链接 |
| data.qrCode | string | 二维码链接（部分支付方式） |

#### 响应示例

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "orderId": "P20250127123456789",
    "payUrl": "https://pay.example.com/pay?orderId=P20250127123456789",
    "qrCode": "https://pay.example.com/qr?orderId=P20250127123456789"
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
| mchNo | string | ✅ | 商户号 |
| mchOrderId | string | ✅ | 商户订单号(唯一不重复) |
| timestamp | string | ✅ | 请求时间戳(unix时间戳毫秒) |
| payType | integer | ✅ | 出款类型 |
| amount | string | ✅ | 出款金额元(可接收小数点后2位) |
| bankCode | string | ✅ | 银行代码 |
| accountNo | string | ✅ | 银行账号 |
| accountName | string | ✅ | 账户姓名 |
| ifscCode | string | ✅ | IFSC代码（印度银行特有） |
| notifyUrl | string | ✅ | 出款结果通知地址 |
| sign | string | ✅ | 签名（此字段不参与签名） |

#### 请求示例

```json
{
  "mchNo": "M171925157713",
  "mchOrderId": "withdraw_001",
  "timestamp": "1726228640694",
  "payType": 2001,
  "amount": "1000",
  "bankCode": "HDFC",
  "accountNo": "1234567890",
  "accountName": "John Doe",
  "ifscCode": "HDFC0001234",
  "notifyUrl": "http://localhost:8080/withdraw_notify",
  "sign": "7c5642e9ec5455b5a09af5abc6543da10b4fbc835b16432802af96327ea0b880"
}
```

---

## 🔔 异步通知

### 存款异步通知

#### 通知地址
商户在申请存款时提供的`notifyUrl`地址

#### 通知参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| orderId | string | 平台订单号 |
| mchOrderId | string | 商户订单号 |
| status | string | 订单状态：SUCCESS-成功，FAIL-失败 |
| amount | string | 支付金额 |
| payType | integer | 支付类型 |
| payTime | string | 支付时间 |
| sign | string | 签名 |

#### 通知示例

```json
{
  "orderId": "P20250127123456789",
  "mchOrderId": "test",
  "status": "SUCCESS",
  "amount": "105",
  "payType": 1001,
  "payTime": "2025-01-27 12:34:56",
  "sign": "7c5642e9ec5455b5a09af5abc6543da10b4fbc835b16432802af96327ea0b880"
}
```

---

## 🔍 查询接口

### 存款订单查询

#### 接口信息

- **接口地址**: `/api/order/query`
- **请求方式**: POST
- **Content-Type**: application/json

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mchNo | string | ✅ | 商户号 |
| orderId | string | ❌ | 平台订单号 |
| mchOrderId | string | ❌ | 商户订单号 |
| timestamp | string | ✅ | 请求时间戳 |
| sign | string | ✅ | 签名 |

---

## ❌ 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 0 | 成功 | - |
| 1001 | 参数错误 | 检查请求参数是否完整 |
| 1002 | 签名错误 | 检查签名算法和密钥是否正确 |
| 1003 | 商户不存在 | 联系平台确认商户号 |
| 1004 | 商户已禁用 | 联系平台启用商户 |
| 1005 | 余额不足 | 充值账户余额 |
| 1006 | 订单号重复 | 使用新的订单号 |
| 1007 | 支付类型不支持 | 检查支付类型ID是否正确 |
| 1008 | 金额超出限制 | 检查金额是否在允许范围内 |
| 1009 | 银行信息错误 | 检查银行账号、IFSC等信息 |
| 1010 | 系统繁忙 | 稍后重试 |
| 9999 | 系统错误 | 联系平台技术支持 |

---

## 💻 示例代码

### Java示例

```java
import java.util.Map;
import java.util.TreeMap;
import java.security.MessageDigest;

public class IndiaWakeupPaymentDemo {
    
    private static final String MERCHANT_NO = "M171925157713";
    private static final String SECRET_KEY = "your_secret_key";
    private static final String API_BASE_URL = "https://api.indiawakeup.com";
    
    public static void main(String[] args) {
        // 创建存款订单
        createDepositOrder();
    }
    
    public static void createDepositOrder() {
        Map<String, Object> params = new TreeMap<>();
        params.put("mchNo", MERCHANT_NO);
        params.put("mchOrderId", "deposit_" + System.currentTimeMillis());
        params.put("timestamp", String.valueOf(System.currentTimeMillis()));
        params.put("payType", 1001);
        params.put("amount", "100");
        params.put("notifyUrl", "http://your-domain.com/notify");
        params.put("returnUrl", "http://your-domain.com/return");
        
        String sign = generateSign(params, SECRET_KEY);
        params.put("sign", sign);
        
        System.out.println("存款订单参数: " + params);
    }
    
    public static String generateSign(Map<String, Object> params, String secretKey) {
        StringBuilder sb = new StringBuilder();
        
        // 按ASCII码排序拼接参数
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().toString().isEmpty()) {
                sb.append(entry.getKey()).append("=").append(entry.getValue()).append("&");
            }
        }
        
        // 拼接密钥
        sb.append("key=").append(secretKey);
        
        // SHA-256加密
        return sha256(sb.toString());
    }
    
    public static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes("UTF-8"));
            StringBuilder hexString = new StringBuilder();
            
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256加密失败", e);
        }
    }
}
```

---

## 📞 技术支持

### 联系方式

- **技术支持邮箱**: support@indiawakeup.com
- **商务合作邮箱**: business@indiawakeup.com
- **技术支持电话**: +91-XXXXXXXXXX
- **在线客服**: 7x24小时在线

### 文档更新

- **最后更新时间**: 2025年1月27日
- **文档版本**: v1.0.0
- **更新说明**: 初始版本发布

---

*本文档由印度唤醒支付平台提供，如有疑问请联系技术支持团队。*
