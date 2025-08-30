const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
      
      // 使用正确的密码
      const correctPassword = 'Yyw11301107*';
      const hashedPassword = await bcrypt.hash(correctPassword, 12);
      
      // 直接更新数据库，绕过中间件
      await User.updateOne(
        { username: 'admin' },
        { 
          password: hashedPassword,
          $unset: { 
            loginAttempts: 1, 
            lockUntil: 1 
          },
          status: 'active'
        }
      );
      
      console.log('✅ admin用户密码重置成功');
      console.log('新密码:', correctPassword);
      console.log('账户已解锁');
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
