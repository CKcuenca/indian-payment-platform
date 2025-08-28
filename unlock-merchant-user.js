const mongoose = require('mongoose');
require('dotenv').config();

async function unlockMerchantUser() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 解锁商户用户账户
    const User = require('./server/models/user');
    
    const unlockResult = await User.updateOne(
      { username: 'test_merchant_001' },
      {
        $unset: { lockUntil: 1 },
        $set: {
          loginAttempts: 0,
          status: 'active'
        }
      }
    );
    
    if (unlockResult.modifiedCount > 0) {
      console.log('✅ 商户用户账户已解锁');
      console.log('   重置登录尝试次数: 0');
      console.log('   账户状态: 已激活');
      console.log('   锁定状态: 已解锁');
    } else {
      console.log('ℹ️ 商户用户账户无需更新');
    }
    
    // 验证解锁结果
    const updatedUser = await User.findOne({ username: 'test_merchant_001' });
    console.log('\n📋 解锁后的用户状态:');
    console.log('   是否锁定:', updatedUser.isLocked);
    console.log('   是否激活:', updatedUser.isActive);
    console.log('   登录尝试次数:', updatedUser.loginAttempts);
    console.log('   状态:', updatedUser.status);
    
    // 重新设置密码
    const bcrypt = require('bcryptjs');
    const newPassword = 'merchant123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const passwordResult = await User.updateOne(
      { username: 'test_merchant_001' },
      { password: hashedPassword }
    );
    
    if (passwordResult.modifiedCount > 0) {
      console.log('\n🔐 密码已重新设置');
      console.log('   新密码:', newPassword);
    }
    
    console.log('\n💡 现在您可以使用以下凭据登录:');
    console.log('   用户名: test_merchant_001');
    console.log('   密码: merchant123');
    
  } catch (error) {
    console.error('❌ 解锁商户用户失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

unlockMerchantUser();
