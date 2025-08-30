// 模拟前端的权限管理器测试
console.log('🔍 测试前端权限管理器\n');

// 模拟权限枚举
const Permission = {
  VIEW_ALL_MERCHANTS: 'VIEW_ALL_MERCHANTS',
  MANAGE_MERCHANTS: 'MANAGE_MERCHANTS',
  VIEW_PAYMENT_CONFIG: 'VIEW_PAYMENT_CONFIG',
  MANAGE_PAYMENT_CONFIG: 'MANAGE_PAYMENT_CONFIG',
  VIEW_ALL_ORDERS: 'VIEW_ALL_ORDERS',
  VIEW_ALL_TRANSACTIONS: 'VIEW_ALL_TRANSACTIONS',
  MANAGE_USERS: 'MANAGE_USERS'
};

// 模拟用户角色枚举
const UserRole = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  MERCHANT: 'merchant'
};

// 模拟字符串角色到枚举角色的映射
const STRING_TO_ENUM_ROLE = {
  'admin': 'admin',
  'operator': 'operator',
  'merchant': 'merchant'
};

// 模拟权限管理器类
class PermissionManager {
  constructor(userRole, userPermissions, merchantId) {
    // 处理字符串角色到枚举角色的转换
    if (typeof userRole === 'string') {
      this.userRole = STRING_TO_ENUM_ROLE[userRole.toLowerCase()] || 'merchant';
    } else {
      this.userRole = userRole;
    }
    this.userPermissions = userPermissions;
    this.merchantId = merchantId;
    
    console.log('🔧 权限管理器初始化:');
    console.log('  - 用户角色:', this.userRole);
    console.log('  - 用户权限:', this.userPermissions);
    console.log('  - 商户ID:', this.merchantId);
  }

  // 检查是否有指定权限
  hasPermission(permission) {
    const result = this.userPermissions.includes(permission);
    console.log(`🔍 检查权限 ${permission}: ${result}`);
    return result;
  }

  // 检查是否有多个权限中的任意一个
  hasAnyPermission(permissions) {
    const result = permissions.some(permission => this.hasPermission(permission));
    console.log(`🔍 检查任意权限 ${permissions}: ${result}`);
    return result;
  }

  // 检查是否是管理员
  isAdmin() {
    const result = this.userRole === UserRole.ADMIN;
    console.log(`🔍 检查是否是管理员: ${result}`);
    return result;
  }

  // 检查是否可以管理用户
  canManageUsers() {
    const result = this.hasPermission(Permission.MANAGE_USERS);
    console.log(`🔍 检查是否可以管理用户: ${result}`);
    return result;
  }
}

// 模拟创建权限管理器的工厂函数
function createPermissionManager(userRole, userPermissions, merchantId) {
  console.log('🏭 创建权限管理器:');
  console.log('  - 角色:', userRole);
  console.log('  - 权限:', userPermissions);
  console.log('  - 商户ID:', merchantId);
  
  return new PermissionManager(userRole, userPermissions, merchantId);
}

// 测试数据 - 模拟从API获取的用户数据
const testUser = {
  username: 'admin',
  role: 'admin',
  permissions: [
    'VIEW_ALL_MERCHANTS',
    'MANAGE_MERCHANTS',
    'VIEW_PAYMENT_CONFIG',
    'MANAGE_PAYMENT_CONFIG',
    'VIEW_ALL_ORDERS',
    'VIEW_ALL_TRANSACTIONS',
    'MANAGE_USERS'
  ]
};

console.log('📋 测试用户数据:');
console.log('用户名:', testUser.username);
console.log('角色:', testUser.role);
console.log('权限:', testUser.permissions);

// 创建权限管理器
console.log('\n🧪 创建权限管理器...');
const permissionManager = createPermissionManager(
  testUser.role,
  testUser.permissions,
  testUser.merchantId
);

// 测试权限检查
console.log('\n🔍 测试权限检查:');
console.log('是否有MANAGE_USERS权限:', permissionManager.hasPermission(Permission.MANAGE_USERS));
console.log('是否是管理员:', permissionManager.isAdmin());
console.log('是否可以管理用户:', permissionManager.canManageUsers());

// 测试PermissionGuard逻辑
console.log('\n🔒 测试PermissionGuard逻辑:');
const requiredPermissions = [Permission.MANAGE_USERS];
const hasRequiredPermission = requiredPermissions.some(permission => 
  permissionManager.hasPermission(permission)
);

console.log('需要的权限:', requiredPermissions);
console.log('是否有所需权限:', hasRequiredPermission);

if (hasRequiredPermission) {
  console.log('✅ 权限检查通过，应该显示用户管理功能');
} else {
  console.log('❌ 权限检查失败，不应该显示用户管理功能');
}

console.log('\n✅ 权限管理器测试完成');
