// 测试getDefaultPermissions函数
console.log('🔍 测试getDefaultPermissions函数\n');

// 复制路由文件中的函数
function getDefaultPermissions(role) {
  switch (role) {
    case 'admin':
      return [
        'VIEW_ALL_MERCHANTS',
        'MANAGE_MERCHANTS',
        'VIEW_PAYMENT_CONFIG',
        'MANAGE_PAYMENT_CONFIG',
        'VIEW_ALL_ORDERS',
        'VIEW_ALL_TRANSACTIONS',
        'MANAGE_USERS',
        'SYSTEM_MONITORING'
      ];
    case 'operator':
      return [
        'VIEW_ALL_MERCHANTS',
        'VIEW_ALL_ORDERS',
        'VIEW_ALL_TRANSACTIONS'
      ];
    case 'merchant':
      return [
        'VIEW_OWN_ORDERS',
        'VIEW_OWN_TRANSACTIONS',
        'VIEW_OWN_MERCHANT_DATA'
      ];
    default:
      return [];
  }
}

// 测试不同角色的权限
console.log('🧪 测试不同角色的权限:');
console.log('admin权限:', getDefaultPermissions('admin'));
console.log('operator权限:', getDefaultPermissions('operator'));
console.log('merchant权限:', getDefaultPermissions('merchant'));
console.log('unknown权限:', getDefaultPermissions('unknown'));

// 测试函数调用
const testRole = 'operator';
const permissions = getDefaultPermissions(testRole);
console.log(`\n📋 ${testRole}角色的权限:`, permissions);
console.log('权限数量:', permissions.length);
console.log('是否包含VIEW_ALL_MERCHANTS:', permissions.includes('VIEW_ALL_MERCHANTS'));
console.log('是否包含MANAGE_USERS:', permissions.includes('MANAGE_USERS'));

console.log('\n✅ 函数测试完成');
