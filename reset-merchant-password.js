const mongoose = require('mongoose');
require('dotenv').config();

async function resetMerchantPassword() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 重置商户用户密码
    const User = require('./server/models/user');
    const bcrypt = require('bcryptjs');
    
    const newPassword = 'merchant123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await User.updateOne(
      { username: 'test_merchant_001' },
      { password: hashedPassword }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ 商户用户密码已重置');
      console.log('   用户名: test_merchant_001');
      console.log('   新密码:', newPassword);
    } else {
      console.log('❌ 密码重置失败，可能用户不存在');
    }
    
    // 验证用户是否存在
    const user = await User.findOne({ username: 'test_merchant_001' });
    if (user) {
      console.log('\n📋 用户信息:');
      console.log('   用户ID:', user._id);
      console.log('   用户名:', user.username);
      console.log('   角色:', user.role);
      console.log('   权限:', user.permissions);
    } else {
      console.log('❌ 用户不存在');
    }
    
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

resetMerchantPassword();
