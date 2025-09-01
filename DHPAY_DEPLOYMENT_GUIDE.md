# DhPay支付通道部署指南

## 📋 概述

DhPay是一个上游支付通道，提供代收和代付功能。本指南将帮助您完成DhPay支付通道的部署和配置。

## 🚀 快速开始

### 1. 环境要求

- Node.js 16+
- MongoDB 4.4+
- 印度支付平台服务已启动

### 2. 安装依赖

```bash
npm install axios crypto
```

### 3. 配置环境变量

复制环境变量示例文件：

```bash
cp dhpay-env-example.txt .env
```

编辑 `.env` 文件，配置DhPay相关参数：

```bash
# DhPay生产环境配置
DHPAY_PRODUCTION_URL=https://api.dhpay.com
DHPAY_PRODUCTION_MCH_ID=your_production_merchant_id
DHPAY_PRODUCTION_SECRET_KEY=your_production_secret_key

# DhPay测试环境配置
DHPAY_TEST_URL=https://test-api.dhpay.com
DHPAY_TEST_MCH_ID=10000
DHPAY_TEST_SECRET_KEY=test_secret_key

# DhPay开发环境配置
DHPAY_DEV_URL=https://dev-api.dhpay.com
DHPAY_DEV_MCH_ID=10000
DHPAY_DEV_SECRET_KEY=dev_secret_key

# 设置当前环境
NODE_ENV=development
```

## 🔧 配置说明

### 环境配置

DhPay支持三种环境配置：

1. **开发环境 (development)**
   - 用于本地开发和测试
   - 使用测试API端点
   - 配置要求较低

2. **测试环境 (test)**
   - 用于集成测试和预发布测试
   - 使用测试API端点
   - 配置要求中等

3. **生产环境 (production)**
   - 用于生产环境
   - 使用生产API端点
   - 配置要求最高

### 必需配置项

- `baseUrl`: DhPay API网关地址
- `mchId`: 商户ID
- `secretKey`: 接口密钥

### 可选配置项

- `timeout`: 请求超时时间（毫秒）
- `retryAttempts`: 重试次数
- `retryDelay`: 重试延迟（毫秒）

## 📁 文件结构

```
server/
├── services/
│   └── payment-providers/
│       └── dhpay-provider.js      # DhPay支付提供者
├── config/
│   └── dhpay-config.js            # DhPay配置管理
├── routes/
│   └── dhpay.js                   # DhPay API路由
└── index.js                       # 主服务器文件

dhpay-env-example.txt              # 环境变量示例
test-dhpay-integration.js          # 集成测试脚本
DHPAY_DEPLOYMENT_GUIDE.md         # 部署指南
```

## 🔌 API接口

### 基础接口

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取信息 | GET | `/api/dhpay/info` | 获取DhPay提供者信息 |
| 配置状态 | GET | `/api/dhpay/config-status` | 获取配置状态 |
| 重新初始化 | POST | `/api/dhpay/reinitialize` | 重新初始化提供者 |

### 支付接口

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 创建支付 | POST | `/api/dhpay/create-payment` | 创建支付订单 |
| 创建提现 | POST | `/api/dhpay/create-withdraw` | 创建提现订单 |
| 查询状态 | GET | `/api/dhpay/order-status/:orderId` | 查询订单状态 |
| 查询余额 | GET | `/api/dhpay/balance` | 查询商户余额 |

### 查询接口

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 查询UTR | GET | `/api/dhpay/utr/:orderId` | 查询UTR信息 |
| 查询UPI | GET | `/api/dhpay/upi/:orderId` | 查询UPI信息 |

### 回调接口

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 回调处理 | GET | `/api/dhpay/callback` | 处理DhPay回调通知 |

## 🔐 签名算法

DhPay使用MD5签名算法，签名步骤如下：

1. **过滤参数**: 移除空值和sign参数
2. **排序参数**: 按参数名ASCII码从小到大排序
3. **拼接字符串**: 使用URL键值对格式拼接
4. **添加密钥**: 在字符串末尾拼接接口密钥
5. **MD5加密**: 对拼接后的字符串进行MD5加密
6. **转大写**: 将加密结果转换为大写

### 签名示例

```javascript
// 原始参数
const params = {
  mchId: '10000',
  amount: 10000,
  orderId: 'TEST123'
};

// 1. 过滤和排序
const sortedKeys = Object.keys(params).sort();
const stringA = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

// 2. 添加密钥
const stringSignTemp = stringA + secretKey;

// 3. MD5加密并转大写
const sign = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
```

## 🧪 测试

### 运行集成测试

```bash
node test-dhpay-integration.js
```

### 测试内容

1. **基础功能测试**
   - 获取提供者信息
   - 配置状态检查
   - 提供者初始化

2. **支付功能测试**
   - 创建支付订单
   - 创建提现订单
   - 查询订单状态

3. **查询功能测试**
   - 查询商户余额
   - 查询UTR信息
   - 查询UPI信息

4. **回调功能测试**
   - 回调通知处理
   - 签名验证

5. **签名算法测试**
   - 签名生成
   - 签名验证

## 🚨 故障排除

### 常见问题

1. **提供者未初始化**
   - 检查环境变量配置
   - 验证配置参数有效性
   - 查看服务器日志

2. **签名验证失败**
   - 检查密钥配置
   - 验证签名算法实现
   - 确认参数格式

3. **API调用失败**
   - 检查网络连接
   - 验证API端点地址
   - 查看错误响应

4. **回调处理异常**
   - 检查回调URL配置
   - 验证签名验证逻辑
   - 查看回调数据格式

### 日志查看

```bash
# 查看服务器日志
tail -f server.log

# 查看PM2日志
pm2 logs indian-payment-platform
```

### 调试模式

设置环境变量启用调试模式：

```bash
DHPAY_LOG_LEVEL=debug
DHPAY_LOG_SENSITIVE=true
```

## 🔒 安全注意事项

1. **密钥管理**
   - 不要在代码中硬编码密钥
   - 使用环境变量管理敏感信息
   - 定期轮换密钥

2. **网络安全**
   - 使用HTTPS进行API通信
   - 验证回调签名
   - 限制回调IP地址

3. **数据验证**
   - 验证所有输入参数
   - 检查金额范围
   - 验证订单ID格式

4. **错误处理**
   - 不要暴露敏感错误信息
   - 记录详细的错误日志
   - 实现适当的重试机制

## 📊 监控和维护

### 性能监控

- 监控API响应时间
- 跟踪成功率
- 监控错误率

### 健康检查

```bash
# 检查配置状态
curl -H "Authorization: Bearer your-token" \
  http://localhost:3001/api/dhpay/config-status

# 检查提供者信息
curl -H "Authorization: Bearer your-token" \
  http://localhost:3001/api/dhpay/info
```

### 定期维护

- 检查配置有效性
- 更新API端点地址
- 轮换接口密钥
- 清理过期日志

## 📞 技术支持

如果遇到问题，请：

1. 查看服务器日志
2. 运行集成测试
3. 检查配置参数
4. 联系技术支持团队

## 📝 更新日志

### v1.0.0 (2024-12-21)
- 初始版本发布
- 支持代收和代付功能
- 实现完整的API接口
- 提供集成测试脚本
- 支持多环境配置

---

**注意**: 本指南基于DhPay API文档v1.0版本编写，如有更新请参考最新文档。
