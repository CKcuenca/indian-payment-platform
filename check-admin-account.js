const mongoose = require('mongoose');
const User = require('./server/models/user');

async function checkAdminAccount() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect('mongodb://localhost:27017/cashgit');
    console.log('✅ 数据库连接成功');
    
    console.log('🔍 查找管理员账户...');
    const admin = await User.findOne({ role: 'admin' });
    
    if (admin) {
      console.log('✅ 找到管理员账户:');
      console.log(`  用户名: ${admin.username}`);
      console.log(`  邮箱: ${admin.email}`);
      console.log(`  角色: ${admin.role}`);
      console.log(`  状态: ${admin.status}`);
      console.log(`  是否锁定: ${admin.isLocked}`);
      console.log(`  创建时间: ${admin.createdAt}`);
    } else {
      console.log('❌ 未找到管理员账户');
      
      // 查找所有用户
      console.log('\n🔍 查找所有用户...');
      const users = await User.find().select('username email role status isLocked createdAt');
      console.log(`📊 总用户数: ${users.length}`);
      
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username} (${user.role}) - ${user.status} ${user.isLocked ? '[锁定]' : ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

checkAdminAccount();
