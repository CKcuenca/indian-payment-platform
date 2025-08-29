// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator', 
  MERCHANT = 'merchant'
}

// 权限枚举
export enum Permission {
  VIEW_ALL_MERCHANTS = 'VIEW_ALL_MERCHANTS',
  MANAGE_MERCHANTS = 'MANAGE_MERCHANTS',
  VIEW_PAYMENT_CONFIG = 'VIEW_PAYMENT_CONFIG',
  MANAGE_PAYMENT_CONFIG = 'MANAGE_PAYMENT_CONFIG',
  VIEW_OWN_ORDERS = 'VIEW_OWN_ORDERS',
  VIEW_ALL_ORDERS = 'VIEW_ALL_ORDERS',
  VIEW_OWN_TRANSACTIONS = 'VIEW_OWN_TRANSACTIONS',
  VIEW_ALL_TRANSACTIONS = 'VIEW_ALL_TRANSACTIONS',
  VIEW_OWN_MERCHANT_DATA = 'VIEW_OWN_MERCHANT_DATA',
  MANAGE_USERS = 'MANAGE_USERS',

}

// 用户信息接口
export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  merchantId?: string; // 如果是商户角色，关联的商户ID
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// 角色权限映射
export interface RolePermissions {
  [UserRole.ADMIN]: Permission[];
  [UserRole.OPERATOR]: Permission[];
  [UserRole.MERCHANT]: Permission[];
}

// 支付商类型枚举
export enum PaymentProviderType {
  NATIVE = 'native',      // 原生支付商
  WAKEUP = 'wakeup'       // 唤醒支付商
}

// 支付商分类接口
export interface PaymentProviderCategory {
  id: string;
  name: string;
  type: PaymentProviderType;
  description: string;
  providers: PaymentProvider[];
}

// 支付商接口
export interface PaymentProvider {
  id: string;
  name: string;
  displayName: string;
  type: PaymentProviderType;
  category: string;
  isActive: boolean;
  features: string[];
  supportedCurrencies: string[];
  environment: 'sandbox' | 'production';
  config: {
    apiKey: string;
    secretKey: string;
    accountId?: string;
    webhookUrl?: string;
  };
  limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
  fees: {
    transactionFee: number;
    fixedFee: number;
  };
  createdAt: string;
  updatedAt: string;
}

// 三方支付配置接口
export interface PaymentProviderConfig {
  id: string;
  providerName: string;
  merchantId: string;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  environment: 'sandbox' | 'production';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 系统统计接口
export interface SystemStats {
  totalMerchants: number;
  activeMerchants: number;
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  averageResponseTime: number;
}

// 商户信息接口
export interface Merchant {
  merchantId: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  balance: number;
  defaultProvider: string;
  
  // 绑定用户管理中的商户用户
  userId?: string;           // 关联的用户ID
  username?: string;         // 关联的用户名
  userFullName?: string;     // 关联用户的姓名
  
  // 代收（充值）配置
  deposit: {
    // 费率配置 - 固定比例 + 固定金额
    fee: {
      percentage: number;    // 固定比例，如 5 表示 5%
      fixedAmount: number;   // 固定金额，如 0 表示无固定费用
    };
    // 限额配置
    limits: {
      minAmount: number;     // 最小充值金额
      maxAmount: number;     // 最大充值金额
      dailyLimit: number;    // 每日充值限额
      monthlyLimit: number;  // 每月充值限额
      singleTransactionLimit: number; // 单笔充值限额
    };
    // 使用情况
    usage: {
      dailyUsed: number;     // 今日已使用充值额度
      monthlyUsed: number;   // 本月已使用充值额度
      lastResetDate: string; // 上次重置日期
    };
  };
  
  // 代付（提现）配置
  withdrawal: {
    // 费率配置 - 固定比例 + 固定金额
    fee: {
      percentage: number;    // 固定比例，如 3 表示 3%
      fixedAmount: number;   // 固定金额，如 6 表示 6卢比
    };
    // 限额配置
    limits: {
      minAmount: number;     // 最小提现金额
      maxAmount: number;     // 最大提现金额
      dailyLimit: number;    // 每日提现限额
      monthlyLimit: number;  // 每月提现限额
      singleTransactionLimit: number; // 单笔提现限额
    };
    // 使用情况
    usage: {
      dailyUsed: number;     // 今日已使用提现额度
      monthlyUsed: number;   // 本月已使用提现额度
      lastResetDate: string; // 上次重置日期
    };
  };
  
  // 支付配置关联
  paymentConfigs?: string[]; // 关联的支付配置ID列表
  createdAt: string;
  updatedAt: string;
}

// UPI支付信息接口
export interface UpiPaymentInfo {
  upiId: string;           // UPI ID (例如: user@bank)
  phoneNumber: string;     // 手机号
  accountName?: string;    // 账户名称
  bankName?: string;       // 银行名称
  ifscCode?: string;       // IFSC代码
  accountNumber?: string;  // 账户号码（可选）
}

// 游戏订单信息接口
export interface GameOrderInfo {
  gameOrderId: string;     // 游戏公司订单ID
  gameName: string;        // 游戏名称
  gameType: 'RUMMY' | 'TEEN_PATTI' | 'OTHER';  // 游戏类型
  playerId: string;        // 玩家ID
  playerName?: string;     // 玩家名称
  tableId?: string;        // 牌桌ID
  roomId?: string;         // 房间ID
  betAmount?: number;      // 下注金额
  winAmount?: number;      // 赢得金额
}

// 订单信息接口
export interface Order {
  orderId: string;
  merchantId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'WAKE_UP';
  amount: number;
  status: string;
  fee: number;
  netAmount: number;
  currency: string;
  customer: {
    email?: string;
    phone?: string;
    name?: string;
  };
  provider: {
    name: string;
    refId?: string;
  };
  // 印度支付特有字段
  upiPayment?: UpiPaymentInfo;      // UPI支付信息
  gameOrder?: GameOrderInfo;        // 游戏订单信息
  // 支付相关字段
  returnUrl: string;
  notifyUrl?: string;
  // 时间字段
  createdAt: string;
  updatedAt: string;
  // 错误信息
  error?: any;
}

// 交易记录接口
export interface Transaction {
  transactionId: string;
  orderId?: string;
  merchantId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  balanceChange: number;
  balanceSnapshot: {
    before: number;
    after: number;
  };
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'CANCELLED' | 'REFUNDED' | 'PARTIAL_REFUNDED' | 'DISPUTED' | 'DISPUTE_RESOLVED' | 'RISK_BLOCKED' | 'MANUAL_REVIEW' | 'REVERSED' | 'EXPIRED';
  orderStatus?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT' | 'PARTIAL_SUCCESS' | 'REFUNDED' | 'PARTIAL_REFUNDED' | 'DISPUTED' | 'DISPUTE_RESOLVED' | 'RISK_BLOCKED' | 'MANUAL_REVIEW' | 'REVERSED' | 'EXPIRED';
  provider?: {
    name: string;
    refId?: string;
  };
  // UPI支付信息（提现时使用）
  upiPayment?: UpiPaymentInfo;
  // 收款方信息
  beneficiaryAccount?: string;
  beneficiaryName?: string;
  // 时间字段
  createdAt: string;
  updatedAt: string;
}

// API响应接口
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// 分页响应接口
export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// 登录请求接口
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应接口
export interface LoginResponse {
  user: User;
  token: string;
}

// MG支付标准接口
export interface MGPaymentRequest {
  appid: string;
  orderid: string;
  amount: string;
  desc?: string;
  notify_url?: string;
  return_url?: string;
  sign: string;
}

export interface MGPaymentResponse {
  code: number;
  message: string;
  data: any;
  timestamp: number;
}

export interface MGPayResponseData {
  orderid: string;
  amount: string;
  payurl: string;
  qrcode: string;
  status: string;
}

export interface MGQueryResponseData {
  orderid: string;
  amount: string;
  status: string;
  paytime?: number;
  desc?: string;
}

export interface MGRefundRequest {
  appid: string;
  orderid: string;
  amount: string;
  sign: string;
}

export interface MGRefundResponseData {
  orderid: string;
  refund_amount: number;
  status: string;
}

// MG支付配置
export interface MGPaymentConfig {
  id: string;
  merchantId: string;
  appid: string;
  secretKey: string;
  apiUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 订单状态枚举
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}

// 交易类型枚举
export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit'
}

// CashGit支付API类型定义
export interface CashGitPaymentRequest {
  appid: string;
  orderid: string;
  amount: string;
  desc: string;
  notify_url: string;
  return_url?: string;
  user_mobile?: string;
  upi_id?: string;
  game_info?: string;
  sign: string;
}

export interface CashGitPaymentResponse {
  code: number;
  message: string;
  data: any;
  timestamp: number;
}

export interface CashGitQueryRequest {
  appid: string;
  orderid: string;
  sign: string;
}

export interface CashGitQueryResponse {
  code: number;
  message: string;
  data: any;
  timestamp: number;
}

export interface CashGitRefundRequest {
  appid: string;
  orderid: string;
  amount: string;
  desc: string;
  sign: string;
}

export interface CashGitRefundResponse {
  code: number;
  message: string;
  data: any;
  timestamp: number;
}

export interface CashGitCloseRequest {
  appid: string;
  orderid: string;
  sign: string;
}

export interface CashGitCloseResponse {
  code: number;
  message: string;
  data: any;
  timestamp: number;
}

// 支付配置类型
export interface PaymentConfig {
  _id: string;
  accountName: string;
  provider: {
    name: string;
    accountId: string;
    apiKey: string;
    secretKey: string;
    environment: 'sandbox' | 'production';
  };
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    singleTransactionLimit: number;
    minTransactionAmount: number;
  };
  usage: {
    dailyUsed: number;
    monthlyUsed: number;
    lastResetDate: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  priority: number;
  fees: {
    transactionFee: number;
    fixedFee: number;
  };
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 支付统计类型
export interface PaymentStats {
  _id: string;
  paymentAccountId: string;
  date: string;
  timeDimension: 'hourly' | 'daily' | 'monthly';
  orders: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    cancelled: number;
  };
  amounts: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    refunded: number;
  };
  successRate: number;
  avgProcessingTime: number;
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AggregatedStats {
  totalOrders: number;
  successOrders: number;
  failedOrders: number;
  totalAmount: number;
  successAmount: number;
  avgSuccessRate: number;
  avgProcessingTime: number;
}

// 支付账户接口
export interface PaymentAccount {
  _id: string;
  accountName: string;
  provider: {
    name: string;
    type: string;
    subType: string;
    accountId: string;
    apiKey: string;
    secretKey: string;
    environment: string;
    mchNo?: string;
  };
  description: string;
  collectionNotifyUrl: string;
  collectionReturnUrl: string;
  payoutNotifyUrl: string;
  payoutReturnUrl: string;
  limits: {
    collection: {
      dailyLimit: number;
      monthlyLimit: number;
      singleTransactionLimit: number;
      minTransactionAmount: number;
    };
    payout: {
      dailyLimit: number;
      monthlyLimit: number;
      singleTransactionLimit: number;
      minTransactionAmount: number;
    };
  };
  fees: {
    collection: {
      transactionFee: number;
      fixedFee: number;
    };
    payout: {
      transactionFee: number;
      fixedFee: number;
    };
  };
  priority: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
