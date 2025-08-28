const mongoose = require('mongoose');
require('dotenv').config();

async function checkMerchantUserStatus() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 检查商户用户状态
    const User = require('./server/models/user');
    
    const merchantUser = await User.findOne({ username: 'test_merchant_001' });
    
    if (merchantUser) {
      console.log('📋 商户用户详细信息:');
      console.log('   用户ID:', merchantUser._id);
      console.log('   用户名:', merchantUser.username);
      console.log('   邮箱:', merchantUser.email);
      console.log('   角色:', merchantUser.role);
      console.log('   状态:', merchantUser.status);
      console.log('   是否激活:', merchantUser.isActive);
      console.log('   是否锁定:', merchantUser.isLocked);
      console.log('   登录尝试次数:', merchantUser.loginAttempts);
      console.log('   权限:', merchantUser.permissions);
      console.log('   商户ID:', merchantUser.merchantId);
      console.log('   创建时间:', merchantUser.createdAt);
      console.log('   更新时间:', merchantUser.updatedAt);
      console.log('   最后登录时间:', merchantUser.lastLoginAt);
      
      // 检查密码哈希
      console.log('\n🔐 密码信息:');
      console.log('   密码哈希长度:', merchantUser.password?.length || 0);
      console.log('   密码哈希前20字符:', merchantUser.password?.substring(0, 20) || '无密码');
      
      // 检查是否有问题
      console.log('\n⚠️ 潜在问题检查:');
      
      if (merchantUser.isLocked) {
        console.log('   ❌ 用户账户被锁定');
      } else {
        console.log('   ✅ 用户账户未锁定');
      }
      
      if (merchantUser.isActive) {
        console.log('   ✅ 用户账户已激活');
      } else {
        console.log('   ❌ 用户账户未激活');
      }
      
      if (merchantUser.status === 'active') {
        console.log('   ✅ 用户状态正常');
      } else {
        console.log('   ❌ 用户状态异常:', merchantUser.status);
      }
      
      if (merchantUser.loginAttempts >= 5) {
        console.log('   ⚠️ 登录尝试次数过多:', merchantUser.loginAttempts);
      } else {
        console.log('   ✅ 登录尝试次数正常:', merchantUser.loginAttempts);
      }
      
    } else {
      console.log('❌ 商户用户不存在');
    }
    
    // 检查是否有其他同名用户
    const allUsers = await User.find({ username: { $regex: 'test_merchant', $options: 'i' } });
    console.log('\n🔍 相关用户检查:');
    console.log('   找到相关用户数量:', allUsers.length);
    
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.role}) - ${user.status}`);
    });
    
  } catch (error) {
    console.error('❌ 检查商户用户状态失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkMerchantUserStatus();
