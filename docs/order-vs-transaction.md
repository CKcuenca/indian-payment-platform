# 订单管理 vs 交易记录 - 详细说明

## 📋 核心区别

### **订单管理 (Order Management)**
- **定义**：用户发起的支付请求，包含完整的订单信息
- **生命周期**：从创建到完成的整个支付流程
- **特点**：一个订单可能对应多个交易记录
- **用途**：跟踪支付流程，管理订单状态

### **交易记录 (Transaction Records)**
- **定义**：实际的资金流动记录，包含具体的支付操作
- **生命周期**：单次资金操作的记录
- **特点**：一个交易记录对应一个具体的支付操作
- **用途**：记录资金流向，财务对账

## 🔄 业务流程示例

### 场景：用户充值 1000 卢比

#### 1. 订单创建阶段
```
订单ID: ORD-2024-001
状态: PENDING (待支付)
金额: ₹1000
手续费: ₹10
净额: ₹990
支付商: AirPay
```

#### 2. 支付处理阶段
```
交易记录1:
- 交易ID: TXN-2024-001
- 类型: DEPOSIT
- 金额: ₹1000
- 状态: PENDING
- 余额变化: +₹990
```

#### 3. 支付成功阶段
```
订单状态更新: SUCCESS
交易记录1状态更新: SUCCESS
余额快照: 0 → ₹990
```

## 📊 数据字段对比

### 订单管理字段
```typescript
interface Order {
  orderId: string;           // 订单ID
  merchantId: string;        // 商户ID
  type: 'DEPOSIT' | 'WITHDRAWAL';  // 订单类型
  amount: number;            // 订单金额
  status: string;            // 订单状态
  fee: number;               // 手续费
  netAmount: number;         // 净额
  currency: string;          // 货币
  customer: {                // 客户信息
    email?: string;
    phone?: string;
    name?: string;
  };
  provider: {                // 支付商信息
    name: string;
    refId?: string;
  };
  returnUrl: string;         // 返回URL
  notifyUrl?: string;        // 通知URL
  createdAt: string;         // 创建时间
}
```

### 交易记录字段
```typescript
interface Transaction {
  transactionId: string;     // 交易ID
  orderId?: string;          // 关联订单ID
  merchantId: string;        // 商户ID
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'REFUND' | 'ADJUSTMENT';  // 交易类型
  amount: number;            // 交易金额
  fee: number;               // 手续费
  netAmount: number;         // 净额
  currency: string;          // 货币
  balanceChange: number;     // 余额变化
  balanceSnapshot: {         // 余额快照
    before: number;
    after: number;
  };
  status: 'PENDING' | 'SUCCESS' | 'FAILED';  // 交易状态
  provider?: {               // 支付商信息
    name: string;
    refId?: string;
  };
  beneficiaryAccount?: string;  // 收款账户
  beneficiaryName?: string;     // 收款人姓名
  createdAt: string;         // 创建时间
}
```

## 🎯 显示信息对比

### 订单管理页面显示
- **订单ID**：唯一标识符
- **商户信息**：商户ID和图标
- **支付账户**：支付商名称和参考ID
- **订单类型**：充值/提现
- **金额信息**：订单金额、手续费、净额
- **订单状态**：待支付/支付成功/支付失败/已取消
- **客户信息**：姓名、邮箱、电话
- **支付信息**：支付商、返回URL、通知URL

### 交易记录页面显示
- **交易ID**：唯一标识符
- **商户信息**：商户ID和图标
- **支付账户**：支付商名称和参考ID
- **交易类型**：充值/提现/退款/调整（带图标）
- **金额信息**：交易金额、手续费、净额
- **余额变化**：正负值显示，颜色区分
- **交易状态**：处理中/成功/失败
- **余额快照**：交易前后余额
- **收款方信息**：账户和姓名（提现时）

## 🔍 查询和筛选

### 订单管理筛选
- **订单类型**：充值、提现
- **订单状态**：待支付、支付成功、支付失败、已取消
- **时间范围**：创建时间
- **商户筛选**：按商户ID

### 交易记录筛选
- **交易类型**：充值、提现、退款、调整
- **交易状态**：处理中、成功、失败
- **时间范围**：创建时间
- **商户筛选**：按商户ID

## 💡 使用场景

### 订单管理适用场景
1. **业务人员**：查看订单处理状态
2. **客服人员**：处理用户订单问题
3. **运营人员**：监控订单成功率
4. **财务人员**：订单对账

### 交易记录适用场景
1. **财务人员**：资金流水对账
2. **风控人员**：异常交易监控
3. **技术人员**：支付流程调试
4. **审计人员**：资金流向追踪

## 📈 报表和统计

### 订单管理统计
- 订单成功率
- 订单处理时间
- 各状态订单数量
- 商户订单分布

### 交易记录统计
- 资金流水汇总
- 手续费收入
- 余额变化趋势
- 异常交易监控

## 🔧 技术实现

### 数据关系
```
订单 (Order) 1:N 交易记录 (Transaction)
商户 (Merchant) 1:N 订单 (Order)
支付商 (Provider) 1:N 交易记录 (Transaction)
```

### 状态流转
```
订单状态: PENDING → SUCCESS/FAILED/CANCELLED
交易状态: PENDING → SUCCESS/FAILED
```

---

**总结**：订单管理关注业务层面的支付流程，交易记录关注财务层面的资金流动。两者相互关联，共同构成完整的支付系统。 