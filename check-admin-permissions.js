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
      console.log('🔍 admin用户详细信息:');
      console.log('用户名:', adminUser.username);
      console.log('角色:', adminUser.role);
      console.log('状态:', adminUser.status);
      console.log('权限:', adminUser.permissions);
      console.log('姓名:', adminUser.fullName);
      console.log('邮箱:', adminUser.email);
      console.log('创建时间:', adminUser.createdAt);
      console.log('更新时间:', adminUser.updatedAt);
      
      // 检查是否有MANAGE_USERS权限
      if (adminUser.permissions && adminUser.permissions.includes('MANAGE_USERS')) {
        console.log('✅ admin用户拥有MANAGE_USERS权限');
      } else {
        console.log('❌ admin用户缺少MANAGE_USERS权限');
        console.log('当前权限:', adminUser.permissions);
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
