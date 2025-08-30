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
      console.log('密码哈希:', adminUser.password);
      console.log('密码是否以$2b$开头:', adminUser.password.startsWith('$2b$'));
      
      // 测试密码比较
      const testPassword = 'admin123';
      console.log('\n🧪 测试密码比较...');
      console.log('测试密码:', testPassword);
      
      // 直接使用bcrypt比较
      const directCompare = await bcrypt.compare(testPassword, adminUser.password);
      console.log('直接bcrypt比较结果:', directCompare);
      
      // 使用用户模型的方法比较
      const methodCompare = await adminUser.comparePassword(testPassword);
      console.log('用户模型方法比较结果:', methodCompare);
      
      // 检查用户状态
      console.log('\n📊 用户状态信息:');
      console.log('状态:', adminUser.status);
      console.log('是否锁定:', adminUser.isLocked);
      console.log('是否激活:', adminUser.isActive);
      
    } else {
      console.log('❌ 未找到admin用户');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}).catch(error => {
  console.error('❌ 数据库连接失败:', error);
});
