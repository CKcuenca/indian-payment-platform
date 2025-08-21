const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

async function initAdmin() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // 检查是否已存在管理员用户
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      process.exit(0);
    }

    // 创建管理员用户
    const adminUser = new User({
      username: 'admin',
      email: 'admin@cashgit.com',
      password: 'Yyw11301107*', // 你的密码
      fullName: '系统管理员',
      role: 'admin',
      status: 'active',
      permissions: User.getDefaultPermissions('admin')
    });

    await adminUser.save();
    console.log('Admin user created successfully:', adminUser.username);
    console.log('Username: admin');
    console.log('Password: Yyw11301107*');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// 运行初始化
initAdmin();
