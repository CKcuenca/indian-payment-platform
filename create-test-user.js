const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 检查用户模型
    const User = require('./server/models/User');
    
    // 检查是否已存在测试用户
    const existingUser = await User.findOne({ username: 'test_merchant_001' });
    if (existingUser) {
      console.log('⚠️ 测试用户已存在:', existingUser.username);
      console.log('   用户ID:', existingUser._id);
      console.log('   角色:', existingUser.role);
      console.log('   商户ID:', existingUser.merchantId);
      return;
    }
    
    // 创建测试商户用户
    const hashedPassword = await bcrypt.hash('test_password_123', 10);
    
    // 先获取商户的ObjectId
    const Merchant = require('./server/models/merchant');
    const merchant = await Merchant.findOne({ merchantId: 'TEST001' });
    if (!merchant) {
      console.log('❌ 未找到商户 TEST001');
      return;
    }
    
    const testUser = new User({
      username: 'test_merchant_001',
      fullName: '测试商户用户',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'merchant',
      merchantId: merchant._id,
      permissions: ['VIEW_OWN_ORDERS', 'VIEW_OWN_TRANSACTIONS'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await testUser.save();
    console.log('✅ 测试商户用户创建成功');
    console.log('   用户名: test_merchant_001');
    console.log('   密码: test_password_123');
    console.log('   角色: MERCHANT');
    console.log('   商户ID: TEST001');
    
    // 创建测试管理员用户
    const adminUser = new User({
      username: 'admin',
      fullName: '系统管理员',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      permissions: [
        'VIEW_ALL_MERCHANTS',
        'MANAGE_MERCHANTS',
        'VIEW_PAYMENT_CONFIG',
        'MANAGE_PAYMENT_CONFIG',
        'VIEW_ALL_ORDERS',
        'VIEW_ALL_TRANSACTIONS',
        'MANAGE_USERS'
      ],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await adminUser.save();
    console.log('\n✅ 测试管理员用户创建成功');
    console.log('   用户名: admin');
    console.log('   密码: test_password_123');
    console.log('   角色: ADMIN');
    
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

createTestUser();
