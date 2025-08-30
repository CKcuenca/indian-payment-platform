const mongoose = require('mongoose');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ 数据库连接成功');
  
  try {
    // 获取用户模型
    const User = require('./server/models/user');
    
    // 测试数据 - 使用唯一的邮箱
    const timestamp = Date.now();
    const testUserData = {
      username: 'test_user_' + timestamp,
      password: 'test123456',
      role: 'operator',
      status: 'active',
      fullName: '测试用户',
      email: `test${timestamp}@example.com` // 使用唯一邮箱
    };
    
    console.log('🔍 测试用户数据:', testUserData);
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username: testUserData.username });
    if (existingUser) {
      console.log('⚠️ 用户名已存在，跳过测试');
      return;
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email: testUserData.email });
    if (existingEmail) {
      console.log('⚠️ 邮箱已存在，跳过测试');
      return;
    }
    
    // 尝试创建用户
    console.log('\n🧪 尝试创建用户...');
    
    try {
      const user = new User(testUserData);
      console.log('✅ 用户对象创建成功');
      
      // 验证用户对象
      const validationError = user.validateSync();
      if (validationError) {
        console.log('❌ 用户对象验证失败:');
        console.log(validationError.message);
        console.log(validationError.errors);
        return;
      }
      console.log('✅ 用户对象验证通过');
      
      // 保存用户
      const savedUser = await user.save();
      console.log('✅ 用户保存成功');
      console.log('用户ID:', savedUser._id);
      console.log('保存后的用户数据:', {
        username: savedUser.username,
        role: savedUser.role,
        email: savedUser.email,
        permissions: savedUser.permissions
      });
      
      // 清理测试数据
      await User.findByIdAndDelete(savedUser._id);
      console.log('✅ 测试用户已清理');
      
    } catch (saveError) {
      console.log('❌ 保存用户失败:');
      console.log('错误类型:', saveError.constructor.name);
      console.log('错误消息:', saveError.message);
      
      if (saveError.errors) {
        console.log('验证错误详情:');
        Object.keys(saveError.errors).forEach(key => {
          const error = saveError.errors[key];
          console.log(`  ${key}: ${error.message}`);
        });
      }
      
      if (saveError.code) {
        console.log('MongoDB错误代码:', saveError.code);
      }
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
  }
}).catch(error => {
  console.error('❌ 数据库连接失败:', error);
});
