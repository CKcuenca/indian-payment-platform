const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
async function connectDB() {
  try {
    console.log('🔌 连接数据库...');
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';
    console.log('数据库URI:', dbUri);
    await mongoose.connect(dbUri);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 用户模型
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  fullName: String,
  role: String,
  permissions: [String],
  status: String,
  merchantId: String,
  phone: String,
  lastLoginAt: Date,
  loginAttempts: Number,
  lockUntil: Date,
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function fixRemoteAdminPermissions() {
  try {
    await connectDB();
    
    console.log('🔍 查找admin用户...');
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('❌ 未找到admin用户');
      return;
    }
    
    console.log('📋 当前admin用户信息:');
    console.log('用户名:', adminUser.username);
    console.log('角色:', adminUser.role);
    console.log('状态:', adminUser.status);
    console.log('当前权限:', adminUser.permissions);
    console.log('权限数量:', adminUser.permissions ? adminUser.permissions.length : 0);
    
    // 检查当前权限格式
    const hasOldFormat = adminUser.permissions && adminUser.permissions.some(p => p.includes('.'));
    const hasNewFormat = adminUser.permissions && adminUser.permissions.some(p => p.includes('VIEW_ALL_'));
    
    console.log('\n🔍 当前权限格式:');
    console.log('包含旧格式 (如 dashboard.view):', hasOldFormat);
    console.log('包含新格式 (如 VIEW_ALL_MERCHANTS):', hasNewFormat);
    
    // 如果权限格式不正确，修复它
    if (hasOldFormat || !hasNewFormat) {
      console.log('\n🔧 需要修复权限格式，更新为新格式...');
      
      // 正确的admin权限格式（与前端期望一致）
      const correctAdminPermissions = [
        'VIEW_ALL_MERCHANTS',
        'MANAGE_MERCHANTS', 
        'VIEW_PAYMENT_CONFIG',
        'MANAGE_PAYMENT_CONFIG',
        'VIEW_ALL_ORDERS',
        'VIEW_ALL_TRANSACTIONS',
        'MANAGE_USERS',
        'SYSTEM_MONITORING'
      ];
      
      await User.updateOne(
        { _id: adminUser._id },
        { 
          $set: { 
            permissions: correctAdminPermissions,
            status: 'active'
          }
        }
      );
      
      console.log('✅ admin权限已更新为:', correctAdminPermissions);
      
      // 验证更新结果
      const updatedAdmin = await User.findById(adminUser._id);
      console.log('🔍 验证更新结果:', updatedAdmin.permissions);
      
    } else {
      console.log('✅ 权限格式已经正确，无需修复');
    }
    
    console.log('\n📋 修复完成！现在admin用户应该能看到所有菜单页面。');
    
  } catch (error) {
    console.error('❌ 修复权限失败:', error);
  } finally {
    console.log('🔌 关闭数据库连接');
    await mongoose.connection.close();
  }
}

fixRemoteAdminPermissions();