const mongoose = require('mongoose');
const User = require('./server/models/user');

async function findMerchantUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 查找所有用户
    const allUsers = await User.find({});
    console.log(`📊 数据库中的所有用户 (${allUsers.length}个):`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.username}`);
      console.log(`   全名: ${user.fullName}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   状态: ${user.status}`);
      console.log(`   邮箱: ${user.email || '未设置'}`);
      console.log('---');
    });
    
    // 查找商户用户
    const merchantUsers = await User.find({ role: 'merchant' });
    console.log(`\n📊 商户用户 (${merchantUsers.length}个):`);
    merchantUsers.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.username}`);
      console.log(`   全名: ${user.fullName}`);
      console.log(`   状态: ${user.status}`);
    });
    
    // 查找包含cgpay的用户
    const cgpayUsers = await User.find({
      $or: [
        { username: { $regex: 'cgpay', $options: 'i' } },
        { fullName: { $regex: 'cgpay', $options: 'i' } }
      ]
    });
    console.log(`\n📊 cgpay相关用户 (${cgpayUsers.length}个):`);
    cgpayUsers.forEach((user, index) => {
      console.log(`${index + 1}. 用户名: ${user.username}`);
      console.log(`   全名: ${user.fullName}`);
      console.log(`   角色: ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

findMerchantUsers();
