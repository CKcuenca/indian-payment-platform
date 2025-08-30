const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB连接错误:'));
db.once('open', async () => {
  console.log('✅ 数据库连接成功');
  
  try {
    // 获取用户模型
    const User = require('./server/models/user');
    
    // 删除现有的商户用户
    console.log('🗑️ 删除现有商户用户...');
    await User.deleteOne({ username: 'test_merchant_001' });
    console.log('✅ 现有商户用户已删除');
    
    // 创建新的商户用户
    console.log('\n➕ 创建新商户用户...');
    const newPassword = 'test123456';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const newMerchantUser = new User({
      username: 'test_merchant_001',
      password: hashedPassword,
      role: 'merchant',
      status: 'active',
      fullName: '测试商户用户',
      merchantId: 'test_merchant_001',
      permissions: [
        'VIEW_OWN_ORDERS',
        'VIEW_OWN_TRANSACTIONS',
        'VIEW_OWN_MERCHANT_DATA'
      ]
    });
    
    await newMerchantUser.save();
    console.log('✅ 新商户用户创建成功');
    console.log('用户名:', newMerchantUser.username);
    console.log('角色:', newMerchantUser.role);
    console.log('状态:', newMerchantUser.status);
    console.log('商户ID:', newMerchantUser.merchantId);
    console.log('密码哈希:', newMerchantUser.password);
    console.log('密码是否以$2b$开头:', newMerchantUser.password.startsWith('$2b$'));
    
    // 测试密码验证
    const isPasswordValid = await bcrypt.compare(newPassword, newMerchantUser.password);
    console.log('密码验证结果:', isPasswordValid);
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
});
