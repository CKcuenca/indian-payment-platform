const mongoose = require('mongoose');
const path = require('path');

// 加载生产环境配置
require('dotenv').config({ path: path.join(__dirname, '../../env.production') });

// 引入模型
const User = require('../models/user');
const Merchant = require('../models/merchant');

/**
 * 查询生产环境数据库中的用户信息
 */
async function queryProductionUsers() {
  try {
    console.log('🔍 连接到生产环境数据库...');
    console.log('📍 数据库地址:', process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ 数据库连接成功');
    console.log('');
    
    // 查询所有用户
    const users = await User.find({}).sort({ createdAt: -1 });
    
    console.log(`📊 找到 ${users.length} 个用户:`);
    console.log('');
    
    // 按角色分组统计
    const roleStats = {};
    users.forEach(user => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1;
    });
    
    console.log('👥 用户角色统计:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} 个`);
    });
    console.log('');
    
    // 显示用户详细信息
    console.log('📋 用户详细信息:');
    console.log('----------------------------------------');
    
    for (const user of users) {
      console.log(`ID: ${user._id}`);
      console.log(`用户名: ${user.username}`);
      console.log(`全名: ${user.fullName}`);
      console.log(`角色: ${user.role}`);
      console.log(`状态: ${user.status}`);
      console.log(`手机: ${user.phone || '未设置'}`);
      console.log(`商户ID: ${user.merchantId || '无'}`);
      console.log(`权限: ${user.permissions.join(', ') || '无'}`);
      console.log(`创建时间: ${user.createdAt?.toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'}) || '未知'}`);
      console.log(`最后登录: ${user.lastLoginAt?.toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'}) || '从未登录'}`);
      
      // 如果是商户用户，查询关联的商户信息
      if (user.merchantId) {
        const merchant = await Merchant.findOne({ merchantId: user.merchantId });
        if (merchant) {
          console.log(`关联商户: ${merchant.name} (${merchant.status})`);
        }
      }
      
      console.log('----------------------------------------');
    }
    
    // 查询管理员用户
    console.log('');
    console.log('👑 管理员用户:');
    const adminUsers = users.filter(user => user.role === 'admin');
    if (adminUsers.length === 0) {
      console.log('   未找到管理员用户');
    } else {
      adminUsers.forEach(admin => {
        console.log(`   ${admin.username} (${admin.fullName}) - ${admin.status}`);
      });
    }
    
    // 查询商户用户
    console.log('');
    console.log('🏪 商户用户:');
    const merchantUsers = users.filter(user => user.role === 'merchant');
    if (merchantUsers.length === 0) {
      console.log('   未找到商户用户');
    } else {
      merchantUsers.forEach(merchant => {
        console.log(`   ${merchant.username} (${merchant.fullName}) - ${merchant.merchantId} - ${merchant.status}`);
      });
    }
    
    // 查询操作员用户
    console.log('');
    console.log('👨‍💼 操作员用户:');
    const operatorUsers = users.filter(user => user.role === 'operator');
    if (operatorUsers.length === 0) {
      console.log('   未找到操作员用户');
    } else {
      operatorUsers.forEach(operator => {
        console.log(`   ${operator.username} (${operator.fullName}) - ${operator.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查询用户失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('');
    console.log('🔐 数据库连接已关闭');
  }
}

/**
 * 根据条件查询用户
 */
async function queryUsersByCondition(conditions = {}) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('🔍 根据条件查询用户:', conditions);
    
    const users = await User.find(conditions).sort({ createdAt: -1 });
    
    console.log(`📊 找到 ${users.length} 个匹配的用户:`);
    
    users.forEach(user => {
      console.log(`- ${user.username} (${user.fullName}) - ${user.role} - ${user.status}`);
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
  }
}

/**
 * 查询特定用户详情
 */
async function queryUserDetail(identifier) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // 根据用户名或ID查询
    let user;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    } else {
      user = await User.findOne({ username: identifier });
    }
    
    if (!user) {
      console.log(`❌ 未找到用户: ${identifier}`);
      return;
    }
    
    console.log('👤 用户详细信息:');
    console.log('========================================');
    console.log(`ID: ${user._id}`);
    console.log(`用户名: ${user.username}`);
    console.log(`全名: ${user.fullName}`);
    console.log(`角色: ${user.role}`);
    console.log(`状态: ${user.status}`);
    console.log(`手机: ${user.phone || '未设置'}`);
    console.log(`商户ID: ${user.merchantId || '无'}`);
    console.log(`权限: ${user.permissions.join(', ') || '无'}`);
    console.log(`邮箱验证: ${user.emailVerified ? '是' : '否'}`);
    console.log(`账户锁定: ${user.isLocked ? '是' : '否'}`);
    console.log(`登录失败次数: ${user.loginAttempts || 0}`);
    console.log(`创建时间: ${user.createdAt?.toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'}) || '未知'}`);
    console.log(`更新时间: ${user.updatedAt?.toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'}) || '未知'}`);
    console.log(`最后登录: ${user.lastLoginAt?.toLocaleString('zh-CN', {timeZone: 'Asia/Kolkata'}) || '从未登录'}`);
    
    // 如果关联了商户，显示商户信息
    if (user.merchantId) {
      const merchant = await Merchant.findOne({ merchantId: user.merchantId });
      if (merchant) {
        console.log('');
        console.log('🏪 关联商户信息:');
        console.log(`商户名称: ${merchant.name}`);
        console.log(`商户状态: ${merchant.status}`);
        console.log(`可用余额: ${merchant.balance?.available || 0}`);
        console.log(`冻结余额: ${merchant.balance?.frozen || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// 主函数 - 根据命令行参数执行不同的查询
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // 默认查询所有用户
    await queryProductionUsers();
  } else if (args[0] === '--role') {
    // 按角色查询
    await queryUsersByCondition({ role: args[1] });
  } else if (args[0] === '--status') {
    // 按状态查询
    await queryUsersByCondition({ status: args[1] });
  } else if (args[0] === '--detail') {
    // 查询特定用户详情
    await queryUserDetail(args[1]);
  } else if (args[0] === '--merchant') {
    // 查询特定商户的用户
    await queryUsersByCondition({ merchantId: args[1] });
  } else {
    console.log('📖 使用方法:');
    console.log('  node query-production-users.js                    # 查询所有用户');
    console.log('  node query-production-users.js --role admin       # 按角色查询');
    console.log('  node query-production-users.js --status active    # 按状态查询');
    console.log('  node query-production-users.js --detail username  # 查询用户详情');
    console.log('  node query-production-users.js --merchant MERCHANT_ID # 查询商户用户');
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  queryProductionUsers,
  queryUsersByCondition,
  queryUserDetail
};