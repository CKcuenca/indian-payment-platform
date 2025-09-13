const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';

const merchantSchema = new mongoose.Schema({
  merchantId: String,
  name: String,
  apiKey: String,
  secretKey: String,
  status: String,
  balance: {
    available: Number,
    frozen: Number
  },
  defaultProvider: String,
  email: String,
  userId: String,
  username: String,
  userFullName: String,
  deposit: Object,
  withdrawal: Object,
  paymentConfigs: [String],
  security: Object,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'merchants' });

// 生成8位纯数字商户ID
function generateMerchantId() {
  const firstDigit = Math.floor(Math.random() * 9) + 1; // 1-9，确保不以0开头
  const remainingDigits = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return firstDigit + remainingDigits;
}

// 检查商户ID是否已存在
async function isIdExists(Merchant, id) {
  const existing = await Merchant.findOne({ merchantId: id });
  return !!existing;
}

// 生成唯一的8位商户ID
async function generateUniqueId(Merchant) {
  let id;
  let attempts = 0;
  do {
    id = generateMerchantId();
    attempts++;
    if (attempts > 1000) {
      throw new Error('无法生成唯一的商户ID，请检查数据库状态');
    }
  } while (await isIdExists(Merchant, id));
  return id;
}

async function migrateMerchantIds() {
  try {
    // 连接数据库
    console.log('正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    const Merchant = mongoose.model('Merchant', merchantSchema);

    // 查询所有商户
    const merchants = await Merchant.find({});
    console.log(`找到 ${merchants.length} 个商户需要处理`);

    if (merchants.length === 0) {
      console.log('没有商户需要迁移');
      return;
    }

    // 用于记录迁移结果
    const migrationResults = [];

    for (const merchant of merchants) {
      const oldId = merchant.merchantId;
      
      // 检查是否已经是8位纯数字
      const isEightDigitNumber = /^\d{8}$/.test(oldId);
      
      if (isEightDigitNumber) {
        console.log(`商户 ${merchant.name} (${oldId}) 已经是8位数字ID，跳过`);
        migrationResults.push({
          name: merchant.name,
          oldId: oldId,
          newId: oldId,
          status: 'skipped',
          reason: '已经是8位数字ID'
        });
        continue;
      }

      try {
        // 生成新的8位数字ID
        const newId = await generateUniqueId(Merchant);
        
        // 更新商户ID
        await Merchant.updateOne(
          { _id: merchant._id },
          { 
            merchantId: newId,
            updatedAt: new Date()
          }
        );

        console.log(`✅ 商户 ${merchant.name}: ${oldId} → ${newId}`);
        migrationResults.push({
          name: merchant.name,
          oldId: oldId,
          newId: newId,
          status: 'success',
          reason: '成功更新'
        });

      } catch (error) {
        console.error(`❌ 更新商户 ${merchant.name} (${oldId}) 失败:`, error.message);
        migrationResults.push({
          name: merchant.name,
          oldId: oldId,
          newId: null,
          status: 'failed',
          reason: error.message
        });
      }
    }

    // 输出迁移总结
    console.log('\n=== 迁移总结 ===');
    const successful = migrationResults.filter(r => r.status === 'success').length;
    const skipped = migrationResults.filter(r => r.status === 'skipped').length;
    const failed = migrationResults.filter(r => r.status === 'failed').length;
    
    console.log(`总计处理: ${migrationResults.length} 个商户`);
    console.log(`成功更新: ${successful} 个`);
    console.log(`已跳过: ${skipped} 个`);
    console.log(`失败: ${failed} 个`);

    if (failed > 0) {
      console.log('\n❌ 失败的商户:');
      migrationResults
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.name} (${r.oldId}): ${r.reason}`));
    }

    if (successful > 0) {
      console.log('\n✅ 成功更新的商户:');
      migrationResults
        .filter(r => r.status === 'success')
        .forEach(r => console.log(`  - ${r.name}: ${r.oldId} → ${r.newId}`));
    }

    console.log('\n迁移完成！');

  } catch (error) {
    console.error('迁移过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateMerchantIds().catch(console.error);
}

module.exports = migrateMerchantIds;