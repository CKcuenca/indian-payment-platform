const mongoose = require('mongoose');
const User = require('./server/models/user');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    console.log('🔌 连接数据库...');
    await mongoose.connect('mongodb://localhost:27017/cashgit');
    console.log('✅ 数据库连接成功');
    
    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('✅ 管理员账户已存在:');
      console.log(`  用户名: ${existingAdmin.username}`);
      console.log(`  邮箱: ${existingAdmin.email}`);
      return;
    }
    
    console.log('➕ 创建管理员账户...');
    
    // 创建管理员用户
    const adminUser = new User({
      username: 'admin',
      email: 'admin@cashgit.com',
      password: 'admin123',
      fullName: '系统管理员',
      role: 'admin',
      status: 'active',
      permissions: User.getDefaultPermissions('admin')
    });
    
    await adminUser.save();
    
    console.log('✅ 管理员账户创建成功:');
    console.log(`  用户名: ${adminUser.username}`);
    console.log(`  邮箱: ${adminUser.email}`);
    console.log(`  密码: admin123`);
    console.log(`  角色: ${adminUser.role}`);
    console.log(`  状态: ${adminUser.status}`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

createAdminUser();
