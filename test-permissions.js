const mongoose = require('mongoose');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ 数据库连接成功');
  
  try {
    // 获取用户模型
    const User = require('./server/models/user');
    
    // 查找admin用户
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (adminUser) {
      console.log('🔍 admin用户信息:');
      console.log('用户名:', adminUser.username);
      console.log('角色:', adminUser.role);
      console.log('权限:', adminUser.permissions);
      
      // 模拟前端的权限检查逻辑
      const userRole = adminUser.role; // 'admin'
      const userPermissions = adminUser.permissions; // ['VIEW_ALL_MERCHANTS', 'MANAGE_MERCHANTS', ...]
      
      console.log('\n🔍 权限检查测试:');
      console.log('角色类型:', typeof userRole);
      console.log('角色值:', userRole);
      console.log('是否有MANAGE_USERS权限:', userPermissions.includes('MANAGE_USERS'));
      
      // 检查角色映射
      const STRING_TO_ENUM_ROLE = {
        'admin': 'admin',
        'operator': 'operator',
        'merchant': 'merchant'
      };
      
      const mappedRole = STRING_TO_ENUM_ROLE[userRole.toLowerCase()];
      console.log('映射后的角色:', mappedRole);
      
      // 检查权限
      const hasManageUsersPermission = userPermissions.includes('MANAGE_USERS');
      console.log('✅ 拥有MANAGE_USERS权限:', hasManageUsersPermission);
      
      if (hasManageUsersPermission) {
        console.log('🎉 admin用户应该能够在用户管理界面创建和删除用户');
      } else {
        console.log('❌ admin用户缺少MANAGE_USERS权限，无法管理用户');
      }
      
    } else {
      console.log('❌ 未找到admin用户');
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}).catch(error => {
  console.error('❌ 数据库连接失败:', error);
});
