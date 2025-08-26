# UniSpay 出款功能集成
ce文档
## 功能概述

UniSpay出款功能支持印度地区的银行转账，通过UPI和IMPS等方式进行资金划转。

## API接口

### 1. 发起出款
- **POST** `/api/withdraw/create`
- 支持印度主要银行出款
- 实时状态查询
- 异步回调通知

### 2. 查询状态
- **GET** `/api/withdraw/status/{orderId}`
- 查询出款订单状态
- 支持状态更新

### 3. 订单列表
- **GET** `/api/withdraw/list`
- 获取商户出款订单列表
- 支持分页和状态筛选

### 4. 取消出款
- **POST** `/api/withdraw/{orderId}/cancel`
- 取消待处理或处理中的出款申请

## 回调通知

### UniSpay回调
- **POST** `/api/webhook/unispay/withdraw`
- 处理UniSpay异步通知

### 通用回调
- **POST** `/api/webhook/withdraw`
- 支持多个支付服务商

## 状态映射

| 系统状态 | UniSpay状态 | 说明 |
|----------|-------------|------|
| PENDING | 0 | 待处理 |
| PROCESSING | 1 | 处理中 |
| SUCCESS | 2 | 出款成功 |
| FAILED | 3 | 出款失败 |
| CANCELLED | 4 | 已取消 |

## 测试

运行测试脚本：
```bash
node test-unispay-payout-integration.js
```

## 配置

设置环境变量：
```bash
UNISPAY_MCH_NO=your-merchant-number
UNISPAY_API_KEY=your-api-key
UNISPAY_SECRET_KEY=your-secret-key
UNISPAY_ENVIRONMENT=sandbox
```
