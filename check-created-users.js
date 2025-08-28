const mongoose = require('mongoose');
require('dotenv').config();

async function checkCreatedUsers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    // 检查用户集合
    const User = require('./server/models/User');
    const users = await User.find({});
    
    console.log('\n👥 用户数据:');
    if (users.length === 0) {
      console.log('  - 暂无用户数据');
    } else {
      users.forEach(user => {
        console.log(`  - ID: ${user._id}`);
        console.log(`    用户名: ${user.username}`);
        console.log(`    全名: ${user.fullName}`);
        console.log(`    角色: ${user.role}`);
        console.log(`    状态: ${user.status}`);
        console.log(`    商户ID: ${user.merchantId || '无'}`);
        console.log(`    邮箱: ${user.email}`);
        console.log(`    密码哈希: ${user.password ? user.password.substring(0, 20) + '...' : '无'}`);
        console.log('    ---');
      });
    }
    
    // 检查商户集合
    const Merchant = require('./server/models/merchant');
    const merchants = await Merchant.find({ merchantId: 'TEST001' });
    
    console.log('\n🏢 TEST001商户数据:');
    if (merchants.length === 0) {
      console.log('  - 未找到TEST001商户');
    } else {
      merchants.forEach(merchant => {
        console.log(`  - ID: ${merchant._id}`);
        console.log(`    商户ID: ${merchant.merchantId}`);
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

checkCreatedUsers();
