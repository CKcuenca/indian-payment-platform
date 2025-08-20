const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const PaymentStats = require('./server/models/PaymentStats');
const PaymentConfig = require('./server/models/PaymentConfig');

async function createMockStats() {
  try {
    // 获取支付配置
    const configs = await PaymentConfig.find();
    if (configs.length === 0) {
      console.log('没有找到支付配置，请先创建支付配置');
      return;
    }

    const paymentAccountId = configs[0]._id;
    console.log('使用支付账户ID:', paymentAccountId);

    // 创建过去7天的模拟数据
    const mockStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const totalOrders = Math.floor(Math.random() * 50) + 10;
      const successOrders = Math.floor(totalOrders * 0.85);
      const failedOrders = Math.floor(totalOrders * 0.1);
      const pendingOrders = totalOrders - successOrders - failedOrders;
      
      const totalAmount = Math.floor(Math.random() * 500000) + 100000;
      const successAmount = Math.floor(totalAmount * 0.85);
      const failedAmount = Math.floor(totalAmount * 0.1);
      const pendingAmount = totalAmount - successAmount - failedAmount;

      const successRate = totalOrders > 0 ? (successOrders / totalOrders) * 100 : 0;
      const avgProcessingTime = Math.floor(Math.random() * 5000) + 1000;

      const stats = new PaymentStats({
        paymentAccountId,
        date,
        timeDimension: 'daily',
        orders: {
          total: totalOrders,
          success: successOrders,
          failed: failedOrders,
          pending: pendingOrders,
          cancelled: 0
        },
        amounts: {
          total: totalAmount,
          success: successAmount,
          failed: failedAmount,
          pending: pendingAmount,
          refunded: 0
        },
        successRate,
        avgProcessingTime,
        errors: {
          total: failedOrders,
          byType: new Map([
            ['network_error', Math.floor(failedOrders * 0.3)],
            ['timeout', Math.floor(failedOrders * 0.2)],
            ['invalid_amount', Math.floor(failedOrders * 0.1)],
            ['other', failedOrders - Math.floor(failedOrders * 0.6)]
          ])
        }
      });

      mockStats.push(stats);
    }

    // 保存到数据库
    await PaymentStats.insertMany(mockStats);
    console.log('成功创建', mockStats.length, '条模拟统计数据');

    // 验证数据
    const savedStats = await PaymentStats.find({ paymentAccountId }).sort({ date: 1 });
    console.log('保存的统计数据:');
    savedStats.forEach(stat => {
      console.log(`${stat.date.toISOString().split('T')[0]}: ${stat.orders.total} 订单, 成功率 ${stat.successRate.toFixed(1)}%`);
    });

  } catch (error) {
    console.error('创建模拟统计数据失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

createMockStats(); 