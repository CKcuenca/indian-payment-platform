const mongoose = require('mongoose');
require('dotenv').config();

async function updateMerchantPermissions() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 更新商户用户权限
    const User = require('./server/models/user');
    await User.updateOne(
      { username: 'test_merchant_001' },
      { 
        $addToSet: { 
          permissions: 'VIEW_OWN_MERCHANT_DATA' 
        } 
      }
    );
    
    console.log('✅ 商户用户权限已更新');
    console.log('   添加权限: VIEW_OWN_MERCHANT_DATA');
    
    // 验证更新结果
    const updatedUser = await User.findOne({ username: 'test_merchant_001' });
    console.log('\n📋 更新后的权限列表:');
    console.log('   权限:', updatedUser.permissions);
    
  } catch (error) {
    console.error('❌ 更新商户权限失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

updateMerchantPermissions();
