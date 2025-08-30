const mongoose = require('mongoose');

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
    // 获取数据库实例
    const dbInstance = mongoose.connection.db;
    
    // 查看现有索引
    console.log('📋 查看现有索引...');
    const indexes = await dbInstance.collection('users').indexes();
    console.log('现有索引:', indexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique
    })));
    
    // 删除邮箱相关的索引
    console.log('\n🗑️ 删除邮箱相关索引...');
    try {
      await dbInstance.collection('users').dropIndex('email_1');
      console.log('✅ 邮箱索引已删除');
    } catch (error) {
      if (error.code === 26) {
        console.log('✅ 邮箱索引不存在，无需删除');
      } else {
        console.log('⚠️ 删除邮箱索引时出错:', error.message);
      }
    }
    
    // 重新查看索引
    console.log('\n📋 重新查看索引...');
    const newIndexes = await dbInstance.collection('users').indexes();
    console.log('更新后的索引:', newIndexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique
    })));
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
});
