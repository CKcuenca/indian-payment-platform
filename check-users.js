const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ 数据库连接成功');
  
  try {
    // 获取用户模型
    const User = require('./server/models/user');
    
    // 查询所有用户
    const users = await User.find().select('username role status createdAt email fullName');
    
    console.log('\n📋 用户列表:');
    console.log('='.repeat(80));
    
    if (users.length === 0) {
      console.log('❌ 数据库中没有用户数据');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. 用户名: ${user.username}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   状态: ${user.status}`);
        console.log(`   姓名: ${user.fullName || '未设置'}`);
        console.log(`   邮箱: ${user.email || '未设置'}`);
        console.log(`   创建时间: ${user.createdAt}`);
        console.log('   ' + '-'.repeat(60));
      });
      
      console.log(`\n📊 总计: ${users.length} 个用户`);
    }
    
    // 特别检查 cgpay 用户
    const cgpayUser = await User.findOne({ username: 'cgpay' });
    if (cgpayUser) {
      console.log('\n🎯 找到 cgpay 用户:');
      console.log(JSON.stringify(cgpayUser, null, 2));
    } else {
      console.log('\n❌ 未找到 cgpay 用户');
    }
    
  } catch (error) {
    console.error('❌ 查询用户数据失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}).catch(error => {
  console.error('❌ 数据库连接失败:', error);
});
