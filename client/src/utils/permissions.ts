import { UserRole, Permission, RolePermissions } from '../types';

// 角色权限映射配置
export const ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.ADMIN]: [
    Permission.VIEW_ALL_MERCHANTS,
    Permission.MANAGE_MERCHANTS,
    Permission.VIEW_PAYMENT_CONFIG,
    Permission.MANAGE_PAYMENT_CONFIG,
    Permission.VIEW_ALL_ORDERS,
    Permission.VIEW_ALL_TRANSACTIONS,
    Permission.MANAGE_USERS,

  ],
  [UserRole.OPERATOR]: [
    Permission.VIEW_ALL_MERCHANTS,
    Permission.VIEW_ALL_ORDERS,
    Permission.VIEW_ALL_TRANSACTIONS
    // 注意：运营人员没有查看支付配置的权限
  ],
  [UserRole.MERCHANT]: [
    Permission.VIEW_OWN_ORDERS,
    Permission.VIEW_OWN_TRANSACTIONS
  ]
};

// 字符串角色到枚举角色的映射
const STRING_TO_ENUM_ROLE: { [key: string]: UserRole } = {
  'admin': UserRole.ADMIN,
  'operator': UserRole.OPERATOR,
  'merchant': UserRole.MERCHANT,
  'user': UserRole.MERCHANT // 默认用户角色映射到商户
};

// 权限检查工具类
export class PermissionManager {
  private userRole: UserRole;
  private userPermissions: Permission[];
  private merchantId?: string;

  constructor(userRole: UserRole | string, userPermissions: Permission[], merchantId?: string) {
    // 处理字符串角色到枚举角色的转换
    if (typeof userRole === 'string') {
      this.userRole = STRING_TO_ENUM_ROLE[userRole.toLowerCase()] || UserRole.MERCHANT;
    } else {
      this.userRole = userRole;
    }
    this.userPermissions = userPermissions;
    this.merchantId = merchantId;
  }

  // 检查是否有指定权限
  hasPermission(permission: Permission): boolean {
    return this.userPermissions.includes(permission);
  }

  // 检查是否有多个权限中的任意一个
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  // 检查是否有所有指定权限
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  // 检查是否是管理员
  isAdmin(): boolean {
    return this.userRole === UserRole.ADMIN;
  }

  // 检查是否是运营人员
  isOperator(): boolean {
    return this.userRole === UserRole.OPERATOR;
  }

  // 检查是否是商户
  isMerchant(): boolean {
    return this.userRole === UserRole.MERCHANT;
  }

  // 检查是否可以查看指定商户的数据
  canViewMerchantData(targetMerchantId: string): boolean {
    if (this.isAdmin() || this.isOperator()) {
      return true; // 管理员和运营人员可以查看所有商户数据
    }
    if (this.isMerchant()) {
      return this.merchantId === targetMerchantId; // 商户只能查看自己的数据
    }
    return false;
  }

  // 检查是否可以查看支付配置
  canViewPaymentConfig(): boolean {
    return this.hasPermission(Permission.VIEW_PAYMENT_CONFIG);
  }

  // 检查是否可以管理支付配置
  canManagePaymentConfig(): boolean {
    return this.hasPermission(Permission.MANAGE_PAYMENT_CONFIG);
  }

  // 检查是否可以查看所有订单
  canViewAllOrders(): boolean {
    return this.hasPermission(Permission.VIEW_ALL_ORDERS);
  }

  // 检查是否可以查看自己的订单
  canViewOwnOrders(): boolean {
    return this.hasPermission(Permission.VIEW_OWN_ORDERS);
  }

  // 检查是否可以查看所有交易
  canViewAllTransactions(): boolean {
    return this.hasPermission(Permission.VIEW_ALL_TRANSACTIONS);
  }

  // 检查是否可以查看自己的交易
  canViewOwnTransactions(): boolean {
    return this.hasPermission(Permission.VIEW_OWN_TRANSACTIONS);
  }

  // 检查是否可以管理用户
  canManageUsers(): boolean {
    return this.hasPermission(Permission.MANAGE_USERS);
  }



  // 获取用户角色显示名称
  getRoleDisplayName(): string {
    switch (this.userRole) {
      case UserRole.ADMIN:
        return '管理员';
      case UserRole.OPERATOR:
        return '运营人员';
      case UserRole.MERCHANT:
        return '商户';
      default:
        return '未知角色';
    }
  }

  // 获取角色对应的菜单权限
  getMenuPermissions() {
    return {
      dashboard: true, // 所有角色都可以访问仪表板
      merchants: this.hasPermission(Permission.VIEW_ALL_MERCHANTS),
      orders: this.hasAnyPermission([Permission.VIEW_ALL_ORDERS, Permission.VIEW_OWN_ORDERS]),
      transactions: this.hasAnyPermission([Permission.VIEW_ALL_TRANSACTIONS, Permission.VIEW_OWN_TRANSACTIONS]),
      paymentConfig: this.hasPermission(Permission.VIEW_PAYMENT_CONFIG),
      users: this.hasPermission(Permission.MANAGE_USERS),

    };
  }
}

// 创建权限管理器的工厂函数
export const createPermissionManager = (
  userRole: UserRole | string, 
  userPermissions: Permission[], 
  merchantId?: string
): PermissionManager => {
  return new PermissionManager(userRole, userPermissions, merchantId);
}; 