#!/usr/bin/env node

/**
 * 清理生产环境测试数据脚本
 * 用于移除生产环境中的测试商户和模拟数据
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupTestData() {
  try {
    console.log('🧹 开始清理生产环境测试数据...');
    
    // 检查环境
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️  当前不是生产环境，跳过清理');
      return;
    }
    
    // 清理测试商户
    const Merchant = require('./server/models/merchant');
    const testMerchants = await Merchant.find({
      $or: [
        { merchantId: { $regex: /^TEST/i } },
        { name: { $regex: /测试|test/i } },
        { email: { $regex: /test@/i } }
      ]
    });
    
    if (testMerchants.length > 0) {
      console.log(`📋 发现 ${testMerchants.length} 个测试商户:`);
      testMerchants.forEach(m => {
        console.log(`   - ${m.merchantId}: ${m.name} (${m.email})`);
      });
      
      // 删除测试商户
      await Merchant.deleteMany({
        _id: { $in: testMerchants.map(m => m._id) }
      });
      console.log('✅ 测试商户已删除');
    } else {
      console.log('✅ 没有发现测试商户');
    }
    
    // 清理测试订单
    const Order = require('./server/models/order');
    const testOrders = await Order.find({
      $or: [
        { orderId: { $regex: /^TEST|^ORD/i } },
        { merchantId: { $regex: /^TEST/i } }
      ]
    });
    
    if (testOrders.length > 0) {
      console.log(`📋 发现 ${testOrders.length} 个测试订单:`);
      testOrders.forEach(o => {
        console.log(`   - ${o.orderId}: ${o.merchantId} (${o.amount})`);
      });
      
      await Order.deleteMany({
        _id: { $in: testOrders.map(o => o._id) }
      });
      console.log('✅ 测试订单已删除');
    } else {
      console.log('✅ 没有发现测试订单');
    }
    
    // 清理测试交易记录
    const Transaction = require('./server/models/transaction');
    const testTransactions = await Transaction.find({
      $or: [
        { transactionId: { $regex: /^TEST|^TXN/i } },
        { merchantId: { $regex: /^TEST/i } }
      ]
    });
    
    if (testTransactions.length > 0) {
      console.log(`📋 发现 ${testTransactions.length} 个测试交易记录:`);
      testTransactions.forEach(t => {
        console.log(`   - ${t.transactionId}: ${t.merchantId} (${t.type})`);
      });
      
      await Transaction.deleteMany({
        _id: { $in: testTransactions.map(t => t._id) }
      });
      console.log('✅ 测试交易记录已删除');
    } else {
      console.log('✅ 没有发现测试交易记录');
    }
    
    console.log('🎉 生产环境测试数据清理完成！');
    
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
    process.exit(0);
  }
}

// 运行清理
cleanupTestData();
