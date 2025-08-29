const mongoose = require('mongoose');
const PaymentConfig = require('../models/PaymentConfig');

/**
 * 迁移脚本：为现有的PaymentConfig记录添加默认merchantId
 * 由于我们将merchantId从required改为optional，需要为现有数据设置默认值
 */
async function migratePaymentConfigMerchantId() {
  try {
    console.log('🔄 开始迁移PaymentConfig的merchantId字段...');
    
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/payment-platform');
    console.log('✅ 数据库连接成功');
    
    // 查找所有没有merchantId的记录
    const configsWithoutMerchantId = await PaymentConfig.find({ 
      $or: [
        { merchantId: { $exists: false } },
        { merchantId: null },
        { merchantId: '' }
      ]
    });
    
    console.log(`📊 找到 ${configsWithoutMerchantId.length} 个没有merchantId的支付配置`);
    
    if (configsWithoutMerchantId.length > 0) {
      // 更新这些记录，设置默认merchantId
      const updateResult = await PaymentConfig.updateMany(
        { 
          $or: [
            { merchantId: { $exists: false } },
            { merchantId: null },
            { merchantId: '' }
          ]
        },
        { 
          $set: { merchantId: 'system' }  // 设置为系统级配置
        }
      );
      
      console.log(`✅ 成功更新 ${updateResult.modifiedCount} 个记录`);
    } else {
      console.log('✅ 所有记录都已经有merchantId字段');
    }
    
    // 显示所有记录的merchantId分布
    const merchantIdStats = await PaymentConfig.aggregate([
      {
        $group: {
          _id: '$merchantId',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log('\n📈 merchantId分布统计:');
    merchantIdStats.forEach(stat => {
      console.log(`   ${stat._id || 'undefined'}: ${stat.count} 个`);
    });
    
    // 验证所有记录都有merchantId
    const totalConfigs = await PaymentConfig.countDocuments();
    const configsWithMerchantId = await PaymentConfig.countDocuments({
      merchantId: { $exists: true, $ne: null, $ne: '' }
    });
    
    console.log(`\n🔍 验证结果:`);
    console.log(`   总记录数: ${totalConfigs}`);
    console.log(`   有merchantId的记录数: ${configsWithMerchantId}`);
    console.log(`   迁移状态: ${totalConfigs === configsWithMerchantId ? '✅ 完成' : '❌ 失败'}`);
    
    mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    if (mongoose.connection.readyState === 1) {
      mongoose.disconnect();
    }
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migratePaymentConfigMerchantId()
    .then(() => {
      console.log('\n🎉 迁移完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { migratePaymentConfigMerchantId };
