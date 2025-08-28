const bcrypt = require('bcryptjs');

async function testPassword() {
  console.log('🧪 测试密码验证...\n');
  
  const plainPassword = 'test_password_123';
  const hashedPassword = '$2a$12$NgTlCtqDA4ZYh...'; // 从数据库获取的哈希值
  
  console.log('1️⃣ 测试密码哈希...');
  const newHash = await bcrypt.hash(plainPassword, 10);
  console.log('   新哈希值:', newHash);
  
  console.log('\n2️⃣ 测试密码验证...');
  const isValid = await bcrypt.compare(plainPassword, newHash);
  console.log('   密码验证结果:', isValid);
  
  console.log('\n3️⃣ 测试数据库中的哈希值...');
  // 从数据库获取完整的哈希值
  const mongoose = require('mongoose');
  require('dotenv').config();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indian_payment_platform');
    console.log('✅ 数据库连接成功');
    
    const User = require('./server/models/User');
    const user = await User.findOne({ username: 'test_merchant_001' });
    
    if (user) {
      console.log('   数据库中的密码哈希:', user.password);
      console.log('   测试密码:', plainPassword);
      
      const dbPasswordValid = await bcrypt.compare(plainPassword, user.password);
      console.log('   数据库密码验证结果:', dbPasswordValid);
      
      // 重新生成密码哈希
      const newPasswordHash = await bcrypt.hash(plainPassword, 10);
      console.log('   新生成的密码哈希:', newPasswordHash);
      
      // 更新用户密码
      await User.updateOne(
        { _id: user._id },
        { password: newPasswordHash }
      );
      console.log('✅ 用户密码已更新');
      
    } else {
      console.log('❌ 未找到用户 test_merchant_001');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

testPassword();
