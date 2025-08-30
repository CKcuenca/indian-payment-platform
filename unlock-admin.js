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
      console.log('🔍 找到admin用户:', adminUser.username);
      console.log('当前状态:', adminUser.status);
      console.log('登录失败次数:', adminUser.loginAttempts);
      console.log('锁定状态:', adminUser.isLocked);
      
      // 解锁admin用户
      await User.updateOne(
        { username: 'admin' },
        { 
          $unset: { 
            loginAttempts: 1, 
            lockUntil: 1 
          },
          $set: {
            status: 'active'
          }
        }
      );
      
      console.log('✅ admin用户账户已解锁');
      console.log('现在可以正常登录了');
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
