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
    
    // 测试数据
    const timestamp = Date.now();
    const testUserData = {
      username: 'simple_test_' + timestamp,
      password: 'test123456',
      role: 'operator',
      status: 'active',
      fullName: '简单测试用户',
      // 邮箱字段已移除
    };
    
    console.log('🔍 测试用户数据:', testUserData);
    
    // 直接使用模型创建用户
    const user = new User(testUserData);
    
    // 手动设置权限（模拟路由中的逻辑）
    const getDefaultPermissions = (role) => {
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
    };
    
    // 设置权限
    user.permissions = getDefaultPermissions(testUserData.role);
    console.log('🔐 设置的权限:', user.permissions);
    
    // 保存用户
    const savedUser = await user.save();
    console.log('✅ 用户保存成功');
    console.log('用户ID:', savedUser._id);
    console.log('保存后的权限:', savedUser.permissions);
    
    // 清理测试数据
    await User.findByIdAndDelete(savedUser._id);
    console.log('✅ 测试用户已清理');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}).catch(error => {
  console.error('❌ 数据库连接失败:', error);
});
