# DhPay集成到唤醒支付系统

## 🎯 集成目标

将DhPay作为上游支付通道集成到现有的统一唤醒支付系统中，为客户提供更稳定的支付体验。

## 🏗️ 架构设计

### 1. **系统架构**
```
客户 → 统一唤醒支付接口 → WakeupProvider → DhPay上游通道
```

### 2. **集成方式**
- **保留现有接口**: 客户仍然调用 `/api/wakeup/*` 接口
- **新增DhPay支持**: 在WakeupProvider中添加DhPay上游通道
- **智能路由**: 根据配置自动选择DhPay或传统UPI方式
- **自动回退**: 如果DhPay失败，自动回退到传统UPI方式

## 📋 已实现的功能

### 1. **DhPay上游通道支持**
- ✅ DhPay提供者集成到WakeupProvider
- ✅ 自动初始化DhPay配置
- ✅ 支持DhPay代收订单创建
- ✅ DhPay回调处理
- ✅ DhPay返回页面处理

### 2. **智能支付路由**
- ✅ 支持 `useDhPay` 参数选择支付方式
- ✅ 自动回退机制
- ✅ 统一的订单管理

### 3. **回调处理**
- ✅ `/api/wakeup/dhpay-notify` - 处理DhPay异步通知
- ✅ `/api/wakeup/dhpay-return` - 处理DhPay返回页面
- ✅ 签名验证
- ✅ 订单状态更新

## 🔧 使用方法

### 1. **启用DhPay支付**
```javascript
// 创建唤醒支付订单时启用DhPay
POST /api/wakeup/create
{
  "orderid": "ORDER_123",
  "amount": 1000,
  "desc": "游戏充值",
  "notify_url": "https://yoursite.com/notify",
  "return_url": "https://yoursite.com/return",
  "customer_phone": "1234567890",
  "useDhPay": true  // 启用DhPay上游通道
}
```

### 2. **传统UPI方式**
```javascript
// 不指定useDhPay或设置为false时使用传统方式
POST /api/wakeup/create
{
  "orderid": "ORDER_123",
  "amount": 1000,
  "desc": "游戏充值",
  "notify_url": "https://yoursite.com/notify",
  "return_url": "https://yoursite.com/return",
  "customer_phone": "1234567890"
  // 不指定useDhPay，默认使用传统UPI方式
}
```

## ⚙️ 配置要求

### 1. **环境变量**
```bash
# DhPay配置
DHPAY_BASE_URL=https://test-api.dhpay.com
DHPAY_MCH_ID=10000
DHPAY_SECRET_KEY=test_secret_key
DHPAY_ENVIRONMENT=test

# 基础URL（用于回调）
BASE_URL=http://localhost:3001
```

### 2. **数据库配置**
- 确保存在 `wakeup` 类型的支付配置
- 配置中应包含必要的DhPay参数

## 🔄 工作流程

### 1. **DhPay支付流程**
1. 客户调用 `/api/wakeup/create` 并设置 `useDhPay: true`
2. WakeupProvider检测到DhPay标志
3. 调用DhPay上游API创建订单
4. 返回DhPay支付链接给客户
5. 客户完成支付
6. DhPay回调通知系统
7. 系统更新订单状态

### 2. **传统UPI流程**
1. 客户调用 `/api/wakeup/create`（不指定useDhPay）
2. WakeupProvider使用传统UPI方式
3. 返回UPI转账信息
4. 客户通过UPI转账
5. 系统定时检查转账状态
6. 手动或自动验证完成

## 🚀 优势

### 1. **对客户透明**
- 客户不需要知道DhPay的存在
- 统一的接口体验
- 自动选择最优支付方式

### 2. **系统稳定性**
- 多通道支持
- 自动回退机制
- 统一的订单管理

### 3. **维护性**
- 集中管理支付逻辑
- 易于添加新的上游通道
- 统一的错误处理

## 📝 注意事项

1. **配置优先级**: DhPay配置失败时不影响传统UPI功能
2. **回退机制**: DhPay失败时自动回退到传统方式
3. **订单追踪**: 支持追踪订单的上游支付商
4. **回调处理**: DhPay回调和传统验证并存

## 🔍 测试建议

1. **DhPay功能测试**: 测试DhPay订单创建和回调
2. **回退机制测试**: 测试DhPay失败时的回退
3. **混合模式测试**: 测试同时使用两种支付方式
4. **性能测试**: 测试DhPay集成的性能影响
