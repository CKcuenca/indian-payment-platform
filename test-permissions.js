// 测试权限是否正确设置
const testUser = {
  id: '1',
  username: 'admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  permissions: [
    'VIEW_ALL_MERCHANTS',
    'MANAGE_MERCHANTS', 
    'VIEW_PAYMENT_CONFIG',
    'MANAGE_PAYMENT_CONFIG',
    'VIEW_ALL_ORDERS',
    'VIEW_ALL_TRANSACTIONS',
    'MANAGE_USERS',
    'SYSTEM_MONITORING'
  ],
  status: 'ACTIVE',
  createdAt: new Date().toISOString()
};

console.log('测试用户权限:');
console.log('用户角色:', testUser.role);
console.log('权限列表:', testUser.permissions);
console.log('是否有VIEW_PAYMENT_CONFIG权限:', testUser.permissions.includes('VIEW_PAYMENT_CONFIG'));
console.log('是否有MANAGE_PAYMENT_CONFIG权限:', testUser.permissions.includes('MANAGE_PAYMENT_CONFIG'));
