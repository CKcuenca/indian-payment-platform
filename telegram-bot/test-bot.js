const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const Order = require('../server/models/order');
const Merchant = require('../server/models/merchant');

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';

// 测试数据创建函数
async function createTestData() {
  console.log('🔧 创建测试数据...');
  
  try {
    // 创建测试商户
    const testMerchant = await Merchant.findOneAndUpdate(
      { merchantId: 'TEST_MERCHANT' },
      {
        merchantId: 'TEST_MERCHANT',
        name: 'Test Merchant',
        status: 'ACTIVE',
        email: 'test@merchant.com',
        secretKey: 'test-secret-key',
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log('✅ 测试商户创建成功:', testMerchant.merchantId);

    // 创建测试订单
    const testOrders = [
      {
        orderId: 'TEST_DEPOSIT_001',
        merchantId: 'TEST_MERCHANT',
        type: 'DEPOSIT',
        amount: 10000, // 100.00 INR
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
        orderId: 'TEST_DEPOSIT_002',
        merchantId: 'TEST_MERCHANT',
        type: 'DEPOSIT',
        amount: 5000, // 50.00 INR
        status: 'PENDING',
        provider: {
          name: 'DHPay',
          transactionId: 'DH_' + Date.now()
        },
        customer: {
          phone: '9876543211',
          name: 'Test Customer 2'
        },
        createdAt: new Date()
      },
      {
        orderId: 'TEST_WITHDRAWAL_001',
        merchantId: 'TEST_MERCHANT',
        type: 'WITHDRAWAL',
        amount: 8000, // 80.00 INR
        status: 'SUCCESS',
        provider: {
          name: 'PassPay',
          transactionId: 'PP_OUT_' + Date.now(),
          utrNumber: 'UTR_OUT' + Date.now()
        },
        bankAccount: {
          accountNumber: '1234567890',
          ifscCode: 'HDFC0000123',
          accountHolderName: 'Test Account Holder',
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

    console.log('🎉 测试数据创建完成！');
    
    // 显示测试命令
    console.log('\n📋 可以使用以下命令测试机器人:');
    console.log('/h - 查看帮助');
    console.log('/y - 查询余额');
    console.log('/t - 查看统计');
    console.log('/s TEST_DEPOSIT_001 - 查询代收订单');
    console.log('/f TEST_WITHDRAWAL_001 - 查询代付订单');
    console.log('/p TEST_WITHDRAWAL_001 - 查询代付凭证');
    console.log('/u UTR_OUT' + Date.now() + ' TEST_WITHDRAWAL_001 - UTR查询');
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
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
    
    console.log(`📊 数据库统计:`);
    console.log(`  - 订单总数: ${orderCount}`);
    console.log(`  - 商户总数: ${merchantCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
}

// 测试机器人功能
async function testBotFunctions() {
  console.log('🤖 测试机器人核心功能...');
  
  try {
    // 测试余额计算
    const merchants = await Merchant.find({ status: 'ACTIVE' });
    let totalBalance = 0;
    
    for (const merchant of merchants) {
      const successfulDeposits = await Order.aggregate([
        { $match: { merchantId: merchant.merchantId, type: 'DEPOSIT', status: 'SUCCESS' } },
        { $group: { _id: null, totalDeposits: { $sum: '$amount' } } }
      ]);

      const successfulWithdrawals = await Order.aggregate([
        { $match: { merchantId: merchant.merchantId, type: 'WITHDRAWAL', status: 'SUCCESS' } },
        { $group: { _id: null, totalWithdrawals: { $sum: '$amount' } } }
      ]);

      const deposits = successfulDeposits[0]?.totalDeposits || 0;
      const withdrawals = successfulWithdrawals[0]?.totalWithdrawals || 0;
      const merchantBalance = deposits - withdrawals;
      
      totalBalance += merchantBalance;
      
      console.log(`💰 商户 ${merchant.merchantId} 余额: ₹${(merchantBalance / 100).toFixed(2)}`);
    }
    
    console.log(`💰 平台总余额: ₹${(totalBalance / 100).toFixed(2)}`);
    
    // 测试统计功能
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDeposits = await Order.countDocuments({
      type: 'DEPOSIT',
      createdAt: { $gte: today }
    });
    
    const todaySuccessDeposits = await Order.countDocuments({
      type: 'DEPOSIT',
      status: 'SUCCESS',
      createdAt: { $gte: today }
    });
    
    const successRate = todayDeposits > 0 ? ((todaySuccessDeposits / todayDeposits) * 100).toFixed(2) : '0';
    
    console.log(`📊 今日统计:`);
    console.log(`  - 入款订单: ${todaySuccessDeposits}/${todayDeposits}`);
    console.log(`  - 成功率: ${successRate}%`);
    
    console.log('✅ 机器人功能测试完成');
    
  } catch (error) {
    console.error('❌ 机器人功能测试失败:', error);
    throw error;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始Telegram机器人测试...\n');
  
  try {
    // 测试数据库连接
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      process.exit(1);
    }
    
    console.log('');
    
    // 创建测试数据
    await createTestData();
    
    console.log('');
    
    // 测试机器人功能
    await testBotFunctions();
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📝 下一步:');
    console.log('1. 配置 .env 文件中的 TELEGRAM_BOT_TOKEN');
    console.log('2. 设置 AUTHORIZED_TELEGRAM_USERS 用户ID');
    console.log('3. 运行 npm start 启动机器人');
    console.log('4. 在Telegram中测试机器人功能');
    
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
  createTestData,
  testBotFunctions
};