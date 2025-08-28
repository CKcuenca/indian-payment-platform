const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAdminPassword() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 重置管理员密码
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const User = require('./server/models/user');
    await User.updateOne(
      { username: 'admin' },
      { password: hashedPassword }
    );
    
    console.log('✅ 管理员密码已重置');
    console.log('   用户名: admin');
    console.log('   新密码: admin123');
    
  } catch (error) {
    console.error('❌ 重置管理员密码失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

resetAdminPassword();
