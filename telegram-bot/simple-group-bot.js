const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
require('dotenv').config();

// Bot配置
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';
const ADMIN_USERS = (process.env.ADMIN_TELEGRAM_USERS || '').split(',').filter(id => id);

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN 环境变量未设置');
  process.exit(1);
}

// 创建机器人实例
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// 连接数据库，增加超时设置
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30秒超时
  socketTimeoutMS: 45000, // 45秒socket超时
}).then(() => {
  console.log('✅ 已连接到MongoDB数据库');
}).catch(err => {
  console.error('❌ MongoDB连接失败:', err);
  process.exit(1);
});

// 简化的商户模型
const merchantSchema = new mongoose.Schema({
  merchantId: String,
  name: String,
  status: String,
  email: String,
  secretKey: String,
  apiKey: String,
  createdAt: Date
});

const Merchant = mongoose.model('Merchant', merchantSchema);

// 简化的群组模型
const groupSchema = new mongoose.Schema({
  chatId: String,
  chatTitle: String,
  merchantId: String,
  status: { type: String, default: 'ACTIVE' },
  bindTime: { type: Date, default: Date.now }
});

const Group = mongoose.model('TelegramGroup', groupSchema);

// 订单模型
const orderSchema = new mongoose.Schema({
  orderId: String,
  merchantId: String,
  type: String,
  amount: Number,
  status: String,
  provider: {
    name: String,
    transactionId: String,
    utrNumber: String
  },
  createdAt: Date,
  completedAt: Date
});

const Order = mongoose.model('Order', orderSchema);

// 工具函数
function isAdmin(userId) {
  return ADMIN_USERS.includes(userId.toString());
}

function formatAmount(paisa) {
  return (paisa / 100).toFixed(2);
}

// 绑定命令处理
bot.onText(/^\/bind\s+(\w+)/, async (msg, match) => {
  const merchantId = match[1];
  
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, '❌ 只有管理员可以绑定群组到商户');
    return;
  }

  if (msg.chat.type === 'private') {
    bot.sendMessage(msg.chat.id, '❌ 此命令只能在群组中使用');
    return;
  }

  try {
    console.log(`尝试查找商户: ${merchantId}`);
    
    // 直接使用MongoDB原生查询避免超时
    const merchant = await mongoose.connection.db.collection('merchants').findOne({ merchantId });
    
    if (!merchant) {
      bot.sendMessage(msg.chat.id, `❌ 商户 ${merchantId} 不存在，请先在后台创建商户账号`);
      return;
    }

    console.log(`找到商户: ${merchant.merchantId}`);

    // 保存群组绑定
    await mongoose.connection.db.collection('telegramgroups').updateOne(
      { chatId: msg.chat.id.toString() },
      {
        $set: {
          chatId: msg.chat.id.toString(),
          chatTitle: msg.chat.title || 'Unknown',
          merchantId: merchantId,
          status: 'ACTIVE',
          bindTime: new Date(),
          operatorId: msg.from.id.toString(),
          operatorUsername: msg.from.username || msg.from.first_name
        }
      },
      { upsert: true }
    );

    const successMessage = `
**群组绑定成功！**

**群组信息:**
群组名称: ${msg.chat.title}
群组ID: \`${msg.chat.id}\`

**绑定商户:**
商户ID: \`${merchantId}\`
商户名称: ${merchant.name || '未设置'}

**操作信息:**
操作人员: @${msg.from.username || msg.from.first_name}
绑定时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

**绑定成功后，群组成员可以使用以下命令：**
\`/y\` - 查询商户余额
\`/t\` - 查看订单统计
\`/s 订单号\` - 查询代收订单
\`/f 订单号\` - 查询代付订单
    `;

    bot.sendMessage(msg.chat.id, successMessage, { parse_mode: 'Markdown' });

    // 发送使用帮助
    setTimeout(() => {
      const helpMessage = `
**群组机器人使用指南**

当前群组已绑定商户: \`${merchantId}\`

**可用命令:**
\`/y\` - 查询商户余额
\`/t\` - 查看今日订单统计
\`/s 订单号\` - 查询代收订单状态
\`/f 订单号\` - 查询代付订单状态

**使用示例:**
\`/y\` - 查看余额
\`/s ORDER123456\` - 查询订单
\`/t\` - 查看统计

需要帮助请使用 \`/help\`
      `;

      bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
    }, 2000);

  } catch (error) {
    console.error('绑定群组失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 绑定群组失败，请稍后重试');
  }
});

// 余额查询
bot.onText(/^\/y$/, async (msg) => {
  if (msg.chat.type === 'private') {
    bot.sendMessage(msg.chat.id, '❌ 此命令只能在已绑定的群组中使用');
    return;
  }

  try {
    const group = await mongoose.connection.db.collection('telegramgroups').findOne({
      chatId: msg.chat.id.toString(),
      status: 'ACTIVE'
    });

    if (!group) {
      bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，请使用 /bind 命令绑定');
      return;
    }

    const merchantId = group.merchantId;
    
    // 计算余额
    const successDeposits = await mongoose.connection.db.collection('orders').aggregate([
      { $match: { merchantId, type: 'DEPOSIT', status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const successWithdrawals = await mongoose.connection.db.collection('orders').aggregate([
      { $match: { merchantId, type: 'WITHDRAWAL', status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    const totalDeposits = successDeposits[0]?.total || 0;
    const totalWithdrawals = successWithdrawals[0]?.total || 0;
    const balance = totalDeposits - totalWithdrawals;

    const responseText = `
**商户余额查询**

**商户ID:** \`${merchantId}\`
**可用余额:** ₹${formatAmount(balance)}
**总存款:** ₹${formatAmount(totalDeposits)}
**总提款:** ₹${formatAmount(totalWithdrawals)}

**查询时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('查询余额失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 查询余额失败，请稍后重试');
  }
});

// 统计查询
bot.onText(/^\/t$/, async (msg) => {
  if (msg.chat.type === 'private') {
    bot.sendMessage(msg.chat.id, '❌ 此命令只能在已绑定的群组中使用');
    return;
  }

  try {
    const group = await mongoose.connection.db.collection('telegramgroups').findOne({
      chatId: msg.chat.id.toString(),
      status: 'ACTIVE'
    });

    if (!group) {
      bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，请使用 /bind 命令绑定');
      return;
    }

    const merchantId = group.merchantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日入款统计
    const todayDeposits = await mongoose.connection.db.collection('orders').find({
      merchantId,
      type: 'DEPOSIT',
      createdAt: { $gte: today }
    }).toArray();

    const successDeposits = todayDeposits.filter(order => order.status === 'SUCCESS');
    const depositSuccessRate = todayDeposits.length > 0 ? ((successDeposits.length / todayDeposits.length) * 100).toFixed(2) : '0';
    const avgDepositAmount = successDeposits.length > 0 ? 
      formatAmount(successDeposits.reduce((sum, order) => sum + order.amount, 0) / successDeposits.length) : '0.00';

    // 今日出款统计
    const todayWithdrawals = await mongoose.connection.db.collection('orders').find({
      merchantId,
      type: 'WITHDRAWAL',
      createdAt: { $gte: today }
    }).toArray();

    const successWithdrawals = todayWithdrawals.filter(order => order.status === 'SUCCESS');
    const withdrawalSuccessRate = todayWithdrawals.length > 0 ? ((successWithdrawals.length / todayWithdrawals.length) * 100).toFixed(2) : '0';
    const avgWithdrawalAmount = successWithdrawals.length > 0 ? 
      formatAmount(successWithdrawals.reduce((sum, order) => sum + order.amount, 0) / successWithdrawals.length) : '0.00';

    // 30分钟成功率
    const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentDeposits = await mongoose.connection.db.collection('orders').find({
      merchantId,
      type: 'DEPOSIT',
      createdAt: { $gte: halfHourAgo }
    }).toArray();

    const recentSuccessDeposits = recentDeposits.filter(order => order.status === 'SUCCESS');
    const recentSuccessRate = recentDeposits.length > 0 ? ((recentSuccessDeposits.length / recentDeposits.length) * 100).toFixed(0) : '0';

    const responseText = `
**订单统计报告**

**商户ID:** \`${merchantId}\`

**今日入款汇总:** ${successDeposits.length}/${todayDeposits.length}
**30分钟成功率:** ${recentSuccessRate}
**今日入款成功率:** ${depositSuccessRate}
**今日入款笔均:** ₹${avgDepositAmount}

**今日出款汇总:** ${successWithdrawals.length}/${todayWithdrawals.length}
**今日出款成功率:** ${withdrawalSuccessRate}
**今日出款笔均:** ₹${avgWithdrawalAmount}

**统计时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('查询统计失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 查询统计失败，请稍后重试');
  }
});

// 帮助命令
bot.onText(/^\/help$/, async (msg) => {
  if (msg.chat.type === 'private') {
    const helpText = `
**印度支付平台机器人**

**管理员命令:**
\`/bind 商户ID\` - 绑定群组到商户 (仅群组)

**查询命令:** (需在已绑定的群组中使用)
\`/y\` - 查询商户余额
\`/t\` - 查看订单统计
\`/s 订单号\` - 查询代收订单状态
\`/f 订单号\` - 查询代付订单状态

**使用说明:**
- 查询功能需要在已绑定商户的群组中使用
- 管理员可以使用 /bind 命令绑定群组到商户
    `;

    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  } else {
    const group = await mongoose.connection.db.collection('telegramgroups').findOne({
      chatId: msg.chat.id.toString(),
      status: 'ACTIVE'
    });

    if (!group) {
      bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，请管理员使用 `/bind 商户ID` 命令绑定', { parse_mode: 'Markdown' });
      return;
    }

    const helpText = `
**群组机器人使用指南**

当前群组已绑定商户: \`${group.merchantId}\`

**可用命令:**
\`/y\` - 查询商户余额
\`/t\` - 查看今日订单统计
\`/s 订单号\` - 查询代收订单状态
\`/f 订单号\` - 查询代付订单状态

**使用示例:**
\`/y\` - 查看余额
\`/s ORDER123456\` - 查询订单
\`/t\` - 查看统计
    `;

    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  }
});

// 错误处理
bot.on('polling_error', (error) => {
  console.error('❌ Polling错误:', error);
});

console.log('✅ 简化版群组机器人已启动');
console.log('🔧 管理员用户:', ADMIN_USERS);
console.log('📋 支持命令: /bind, /y, /t, /help');

// 优雅关闭
process.on('SIGINT', () => {
  console.log('🛑 正在关闭机器人...');
  mongoose.connection.close(() => {
    console.log('✅ 已断开数据库连接');
    process.exit(0);
  });
});

module.exports = bot;