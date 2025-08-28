const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 检查用户集合
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📚 数据库集合:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // 如果有用户集合，检查用户数据
    if (collections.some(col => col.name === 'users')) {
      const User = require('./server/models/User');
      const users = await User.find({});
      
      console.log('\n👥 用户数据:');
      if (users.length === 0) {
        console.log('  - 暂无用户数据');
      } else {
        users.forEach(user => {
          console.log(`  - ID: ${user._id}`);
          console.log(`    用户名: ${user.username}`);
          console.log(`    角色: ${user.role}`);
          console.log(`    商户ID: ${user.merchantId || '无'}`);
          console.log(`    状态: ${user.isActive ? '激活' : '未激活'}`);
          console.log('    ---');
        });
      }
    } else {
      console.log('\n⚠️ 未找到用户集合');
    }
    
    // 检查商户集合
    const Merchant = require('./server/models/merchant');
    const merchants = await Merchant.find({});
    
    console.log('\n🏢 商户数据:');
    if (merchants.length === 0) {
      console.log('  - 暂无商户数据');
    } else {
      merchants.forEach(merchant => {
        console.log(`  - ID: ${merchant.merchantId}`);
        console.log(`    名称: ${merchant.name}`);
        console.log(`    状态: ${merchant.status}`);
        console.log('    ---');
      });
    }
    
  } catch (error) {
    console.error('❌ 检查用户数据失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

checkUsers();
