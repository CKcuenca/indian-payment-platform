const mongoose = require('mongoose');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB连接错误:'));
db.once('open', async () => {
  console.log('✅ 数据库连接成功');
  
  try {
    // 获取用户模型
    const User = require('./server/models/user');
    
    // 查找商户用户
    const merchantUser = await User.findOne({ username: 'test_merchant_001' });
    
    if (!merchantUser) {
      console.log('❌ 未找到商户用户 test_merchant_001');
      return;
    }
    
    console.log('📋 商户用户信息:');
    console.log('用户名:', merchantUser.username);
    console.log('角色:', merchantUser.role);
    console.log('状态:', merchantUser.status);
    console.log('密码哈希:', merchantUser.password);
    console.log('密码是否以$2b$开头:', merchantUser.password.startsWith('$2b$'));
    
    // 测试密码验证
    const bcrypt = require('bcryptjs');
    const testPassword = 'test123456';
    const isPasswordValid = await bcrypt.compare(testPassword, merchantUser.password);
    console.log('密码验证结果:', isPasswordValid);
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
});
