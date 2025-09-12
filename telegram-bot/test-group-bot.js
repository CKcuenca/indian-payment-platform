const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const Order = require('../server/models/order');
const Merchant = require('../server/models/merchant');
const TelegramGroup = require('../server/models/telegram-group');

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';

// 群组绑定流程测试函数
async function testGroupBindingFlow() {
  console.log('🧪 测试群组绑定商户流程...');
  
  try {
    // 创建测试商户
    const testMerchant = await Merchant.findOneAndUpdate(
      { merchantId: 'CGPAY_TEST' },
      {
        merchantId: 'CGPAY_TEST',
        name: 'CG Pay Test Merchant',
        status: 'ACTIVE',
        email: 'test@cgpay.com',
        secretKey: 'test-secret-cgpay',
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log('✅ 测试商户创建成功:', testMerchant.merchantId);

    // 模拟群组信息
    const mockChatInfo = {
      id: -1001234567890,
      title: 'CG Pay Support Group',
      type: 'supergroup'
    };

    // 模拟操作员信息
    const mockOperatorInfo = {
      id: 123456789,
      username: 'admin_user',
      first_name: 'Admin User'
    };

    // 测试群组绑定
    const boundGroup = await TelegramGroup.bindGroup(
      mockChatInfo,
      testMerchant.merchantId,
      mockOperatorInfo
    );

    console.log('✅ 群组绑定测试成功');
    console.log('📋 绑定信息:');
    console.log('  - 群组ID:', boundGroup.chatId);
    console.log('  - 群组名称:', boundGroup.chatTitle);
    console.log('  - 绑定商户:', boundGroup.merchantId);
    console.log('  - 绑定状态:', boundGroup.status);
    console.log('  - 操作员:', boundGroup.bindInfo.operatorUsername);

    // 创建测试订单
    const testOrders = [
      {
        orderId: 'CGPAY_DEPOSIT_001',
        merchantId: 'CGPAY_TEST',
        type: 'DEPOSIT',
        amount: 15000, // 150.00 INR
        status: 'SUCCESS',
        provider: {
          name: 'PassPay',
          transactionId: 'PP_' + Date.now(),
          utrNumber: 'UTR' + Date.now()
        },
        customer: {
          phone: '9876543210',
          name: 'Test Customer'
        },
        createdAt: new Date(),
        completedAt: new Date()
      },
      {
        orderId: 'CGPAY_WITHDRAWAL_001',
        merchantId: 'CGPAY_TEST',
        type: 'WITHDRAWAL',
        amount: 12000, // 120.00 INR
        status: 'SUCCESS',
        provider: {
          name: 'PassPay',
          transactionId: 'PP_OUT_' + Date.now(),
          utrNumber: 'UTR_OUT' + Date.now()
        },
        bankAccount: {
          accountNumber: '9876543210',
          ifscCode: 'HDFC0000456',
          accountHolderName: 'Test Customer',
          bankName: 'HDFC Bank'
        },
        createdAt: new Date(),
        completedAt: new Date()
      }
    ];

    // 插入测试订单
    for (const orderData of testOrders) {
      await Order.findOneAndUpdate(
        { orderId: orderData.orderId },
        orderData,
        { upsert: true, new: true }
      );
      console.log('✅ 测试订单创建成功:', orderData.orderId);
    }

    // 测试权限检查
    console.log('\n🔐 测试权限机制:');
    
    // 测试管理员权限
    const adminUserId = '123456789';
    const adminPermission = boundGroup.checkUserPermission(adminUserId);
    console.log('  - 管理员权限:', adminPermission ? '✅' : '❌');

    // 测试普通用户权限 (默认不允许所有成员)
    const regularUserId = '987654321';
    const regularPermission = boundGroup.checkUserPermission(regularUserId);
    console.log('  - 普通用户权限:', regularPermission ? '✅' : '❌');

    // 设置允许所有成员使用
    boundGroup.settings.allowAllMembers = true;
    await boundGroup.save();
    
    const regularPermissionAfterChange = boundGroup.checkUserPermission(regularUserId);
    console.log('  - 开放所有成员后普通用户权限:', regularPermissionAfterChange ? '✅' : '❌');

    // 测试命令权限
    console.log('\n⚡ 测试命令权限:');
    const allowedCommands = ['balance', 'statistics', 'deposit_query'];
    allowedCommands.forEach(cmd => {
      const hasPermission = boundGroup.checkCommandPermission(cmd);
      console.log(`  - ${cmd}命令权限:`, hasPermission ? '✅' : '❌');
    });

    // 测试使用统计更新
    console.log('\n📊 测试使用统计:');
    await boundGroup.updateUsage('balance');
    await boundGroup.updateUsage('statistics');
    await boundGroup.updateUsage('deposit_query');
    
    const updatedGroup = await TelegramGroup.findByChatId(mockChatInfo.id);
    console.log('  - 总命令使用次数:', updatedGroup.usage.totalCommands);
    console.log('  - 余额查询次数:', updatedGroup.usage.commandStats.balance);
    console.log('  - 统计查询次数:', updatedGroup.usage.commandStats.statistics);
    console.log('  - 最后使用时间:', updatedGroup.usage.lastUsed);

    return {
      merchant: testMerchant,
      group: boundGroup,
      orders: testOrders
    };

  } catch (error) {
    console.error('❌ 群组绑定流程测试失败:', error);
    throw error;
  }
}

// 测试业务流程
async function testBusinessFlow() {
  console.log('💼 测试完整业务流程...\n');
  
  try {
    const testData = await testGroupBindingFlow();
    
    console.log('\n📋 业务流程说明:');
    console.log('1. ✅ 管理员在后台创建商户账号 (merchantId: CGPAY_TEST)');
    console.log('2. ✅ 管理员将机器人拉入群组');
    console.log('3. ✅ 管理员使用 /bind CGPAY_TEST 命令绑定群组到商户');
    console.log('4. ✅ 机器人回复"绑定成功"并发送群组帮助');
    console.log('5. ✅ 群组成员可以使用查询命令');

    console.log('\n🤖 可测试的机器人命令:');
    console.log('管理员命令:');
    console.log('  /bind CGPAY_TEST - 绑定群组到商户');
    console.log('  /unbind - 解绑群组');
    console.log('  /groupinfo - 查看群组信息');
    
    console.log('\n群组成员命令:');
    console.log('  /y@bot_name - 查询商户余额');
    console.log('  /t@bot_name - 查看订单统计');
    console.log('  /s@bot_name CGPAY_DEPOSIT_001 - 查询代收订单');
    console.log('  /f@bot_name CGPAY_WITHDRAWAL_001 - 查询代付订单');
    console.log('  /p@bot_name CGPAY_WITHDRAWAL_001 - 查询代付凭证');
    
    console.log('\n📊 预期统计结果:');
    console.log('  - 今日入款汇总: 1/1');
    console.log('  - 今日入款成功率: 100%');
    console.log('  - 今日入款笔均: ₹150.00');
    console.log('  - 今日出款汇总: 1/1');
    console.log('  - 今日出款成功率: 100%');
    console.log('  - 今日出款笔均: ₹120.00');
    console.log('  - 商户可用余额: ₹30.00 (150-120)');

  } catch (error) {
    console.error('❌ 业务流程测试失败:', error);
    throw error;
  }
}

// 测试数据库连接
async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...');
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');
    
    // 测试查询
    const orderCount = await Order.countDocuments();
    const merchantCount = await Merchant.countDocuments();
    const groupCount = await TelegramGroup.countDocuments();
    
    console.log(`📊 数据库统计:`);
    console.log(`  - 订单总数: ${orderCount}`);
    console.log(`  - 商户总数: ${merchantCount}`);
    console.log(`  - 群组总数: ${groupCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始群组绑定机器人测试...\n');
  
  try {
    // 测试数据库连接
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      process.exit(1);
    }
    
    console.log('');
    
    // 测试业务流程
    await testBusinessFlow();
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📝 下一步操作:');
    console.log('1. 配置 .env 文件中的 TELEGRAM_BOT_TOKEN');
    console.log('2. 设置 ADMIN_TELEGRAM_USERS 管理员用户ID');
    console.log('3. 运行 npm start 启动群组绑定机器人');
    console.log('4. 创建测试群组，将机器人添加到群组');
    console.log('5. 使用 /bind CGPAY_TEST 命令绑定群组');
    console.log('6. 在群组中测试各种查询命令');
    
    console.log('\n💡 重要提醒:');
    console.log('- 只有管理员可以绑定/解绑群组');
    console.log('- 绑定成功后群组成员可以查询对应商户的数据');
    console.log('- 支持多个群组绑定到同一个商户');
    console.log('- 每个群组只能绑定一个商户');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 数据库连接已关闭');
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testDatabaseConnection,
  testGroupBindingFlow,
  testBusinessFlow
};