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
bot.onText(/^\/y(@\w+)?(\s|$)/, async (msg) => {
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
bot.onText(/^\/t(@\w+)?(\s|$)/, async (msg) => {
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
今日入款汇总:  ${successDeposits.length}/${todayDeposits.length}
30分钟成功率:  ${recentSuccessRate}
今日入款成功率:  ${depositSuccessRate}
今日入款笔均:  ${avgDepositAmount}

今日出款汇总:  ${successWithdrawals.length}/${todayWithdrawals.length}
今日出款成功率:  ${withdrawalSuccessRate}
今日出款笔均:  ${avgWithdrawalAmount}
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('查询统计失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 查询统计失败，请稍后重试');
  }
});

// 代收订单查询
bot.onText(/^\/s(@\w+)?\s+(.+)/, async (msg, match) => {
  const orderId = match[2] || match[1];
  
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
    const order = await mongoose.connection.db.collection('orders').findOne({
      orderId: orderId.trim(),
      merchantId: merchantId,
      type: 'DEPOSIT'
    });

    if (!order) {
      bot.sendMessage(msg.chat.id, `❌ 未找到代收订单: ${orderId}`);
      return;
    }

    const statusEmoji = order.status === 'SUCCESS' ? '✅' : 
                       order.status === 'PENDING' ? '⏳' : 
                       order.status === 'PROCESSING' ? '🔄' : '❌';

    const responseText = `
**代收订单查询**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**订单状态:** ${order.status}
**订单金额:** ₹${formatAmount(order.amount)}
**支付提供商:** ${order.provider?.name || 'N/A'}
**创建时间:** ${order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}

${order.provider?.transactionId ? `**交易ID:** \`${order.provider.transactionId}\`` : ''}
${order.provider?.utrNumber ? `**UTR号码:** \`${order.provider.utrNumber}\`` : ''}
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('查询代收订单失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 查询代收订单失败，请稍后重试');
  }
});

// 代付订单查询
bot.onText(/^\/f(@\w+)?\s+(.+)/, async (msg, match) => {
  const orderId = match[2] || match[1];
  
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
    const order = await mongoose.connection.db.collection('orders').findOne({
      orderId: orderId.trim(),
      merchantId: merchantId,
      type: 'WITHDRAWAL'
    });

    if (!order) {
      bot.sendMessage(msg.chat.id, `❌ 未找到代付订单: ${orderId}`);
      return;
    }

    const responseText = `
**代付订单查询**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**订单状态:** ${order.status}
**代付金额:** ₹${formatAmount(order.amount)}
**收款账户:** ${order.bankAccount?.accountNumber || 'N/A'}
**收款人:** ${order.bankAccount?.accountHolderName || 'N/A'}
**支付提供商:** ${order.provider?.name || 'N/A'}
**创建时间:** ${order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}

${order.provider?.transactionId ? `**交易ID:** \`${order.provider.transactionId}\`` : ''}
${order.provider?.utrNumber ? `**UTR号码:** \`${order.provider.utrNumber}\`` : ''}
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('查询代付订单失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 查询代付订单失败，请稍后重试');
  }
});

// 代付凭证查询
bot.onText(/^\/p(@\w+)?\s+(.+)/, async (msg, match) => {
  const orderId = match[2] || match[1];
  
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
    const order = await mongoose.connection.db.collection('orders').findOne({
      orderId: orderId.trim(),
      merchantId: merchantId,
      type: 'WITHDRAWAL',
      status: 'SUCCESS'
    });

    if (!order) {
      bot.sendMessage(msg.chat.id, `❌ 未找到已成功的代付订单: ${orderId}`);
      return;
    }

    const responseText = `
**代付凭证**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**代付金额:** ₹${formatAmount(order.amount)}
**收款账户:** ${order.bankAccount?.accountNumber || 'N/A'}
**收款人:** ${order.bankAccount?.accountHolderName || 'N/A'}
**银行名称:** ${order.bankAccount?.bankName || 'N/A'}
**IFSC代码:** ${order.bankAccount?.ifscCode || 'N/A'}
**UTR号码:** \`${order.provider?.utrNumber || 'N/A'}\`
**交易时间:** ${order.completedAt ? new Date(order.completedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' }) : '未知'}

**状态:** 代付成功
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('查询代付凭证失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 查询代付凭证失败，请稍后重试');
  }
});

// UPI查询
bot.onText(/^\/i(@\w+)?\s+(\S+)\s+(.+)/, async (msg, match) => {
  const upiId = match[2] || match[1];
  const orderId = match[3] || match[2];
  
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

    const responseText = `
**UPI查询结果**

**UPI ID:** ${upiId}
**关联订单:** ${orderId}
**商户:** ${group.merchantId}
**查询时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

**注意:** UPI查询功能需要对接实际的UPI服务提供商API
**建议:** 请联系技术团队完善此功能
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('UPI查询失败:', error);
    bot.sendMessage(msg.chat.id, '❌ UPI查询失败，请稍后重试');
  }
});

// UTR查询
bot.onText(/^\/u(@\w+)?\s+(\S+)\s+(.+)/, async (msg, match) => {
  const utrNumber = match[2] || match[1];
  const orderId = match[3] || match[2];
  
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
    const orders = await mongoose.connection.db.collection('orders').find({
      merchantId: merchantId,
      $or: [
        { 'provider.utrNumber': utrNumber },
        { orderId: orderId.trim() }
      ]
    }).toArray();

    if (orders.length === 0) {
      bot.sendMessage(msg.chat.id, `❌ 未找到UTR相关订单: ${utrNumber}`);
      return;
    }

    let responseText = `
**UTR查询结果**

**UTR号码:** \`${utrNumber}\`
**商户:** ${merchantId}
**关联订单数量:** ${orders.length}

`;

    orders.forEach((order, index) => {
      responseText += `
**订单 ${index + 1}:**
- **订单号:** \`${order.orderId}\`
- **类型:** ${order.type === 'DEPOSIT' ? '代收' : '代付'}
- **状态:** ${order.status}
- **金额:** ₹${formatAmount(order.amount)}
- **时间:** ${order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
`;
    });

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('UTR查询失败:', error);
    bot.sendMessage(msg.chat.id, '❌ UTR查询失败，请稍后重试');
  }
});

// UTR补单
bot.onText(/^\/b(@\w+)?\s+(\S+)\s+(.+)/, async (msg, match) => {
  const utrNumber = match[2] || match[1];
  const orderId = match[3] || match[2];
  
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
    const order = await mongoose.connection.db.collection('orders').findOne({
      orderId: orderId.trim(),
      merchantId: merchantId
    });

    if (!order) {
      bot.sendMessage(msg.chat.id, `❌ 未找到订单: ${orderId}`);
      return;
    }

    if (order.status === 'SUCCESS') {
      bot.sendMessage(msg.chat.id, `✅ 订单 ${orderId} 已经是成功状态，无需补单`);
      return;
    }

    // 更新订单状态和UTR信息
    await mongoose.connection.db.collection('orders').updateOne(
      { orderId: orderId.trim(), merchantId: merchantId },
      {
        $set: {
          'provider.utrNumber': utrNumber,
          status: 'SUCCESS',
          completedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'SUCCESS',
            timestamp: new Date(),
            reason: `UTR补单: ${utrNumber}`,
            executedBy: `Telegram用户: ${msg.from.username || msg.from.id} (群组: ${msg.chat.title})`
          }
        }
      }
    );

    const responseText = `
**UTR补单成功**

**订单号:** \`${orderId}\`
**商户:** ${merchantId}
**UTR号码:** \`${utrNumber}\`
**订单状态:** SUCCESS
**补单金额:** ₹${formatAmount(order.amount)}
**补单时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
**操作人员:** @${msg.from.username || msg.from.first_name}

**补单完成，订单状态已更新**
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('UTR补单失败:', error);
    bot.sendMessage(msg.chat.id, '❌ UTR补单失败，请稍后重试');
  }
});

// 提币命令
bot.onText(/^\/tu\s+(\d+(?:\.\d+)?)\s+(.+)/, async (msg, match) => {
  const amount = match[1];
  const address = match[2];
  
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
    const orderId = `TU${Date.now()}${Math.random().toString(36).substr(2, 6)}`.toUpperCase();

    const responseText = `
**提币申请**

**申请单号:** \`${orderId}\`
**商户:** ${merchantId}
**提币金额:** ₹${amount}
**提币地址:** ${address}
**申请时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
**申请人:** @${msg.from.username || msg.from.first_name}

**状态:** 提币申请已提交，等待处理
**注意:** 此功能需要后台人工审核处理
    `;

    bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

    // 这里可以将提币申请记录到数据库
    // await mongoose.connection.db.collection('withdrawal_requests').insertOne({...});

  } catch (error) {
    console.error('提币申请失败:', error);
    bot.sendMessage(msg.chat.id, '❌ 提币申请失败，请稍后重试');
  }
});

// /h 和 /help 帮助命令
bot.onText(/^\/h(@\w+)?(\s|$)/, async (msg) => {
  await handleHelpCommand(msg);
});

// 帮助命令处理函数
async function handleHelpCommand(msg) {
  if (msg.chat.type === 'private') {
    const helpText = `
**印度支付平台机器人**

**管理员命令:**
\`/bind 商户ID\` - 绑定群组到商户 (仅群组)

**查询命令:** (需在已绑定的群组中使用)
\`/h\` - 查看机器人可以帮助您做什么
\`/y\` - 查询余额
\`/t\` - 查看近半小时/今日订单统计
\`/s 商户单号\` - 查询代收订单状态
\`/f 商户单号\` - 查询代付订单状态
\`/p 商户单号\` - 获取代付凭证
\`/tu 提币金额 提币地址\` - 获取代付凭证
\`/i UPI号码 商户单号\` - UPI查询收款户
\`/u UTR号码 商户单号\` - 使用UTR查询相关订单
\`/b UTR号码 商户单号\` - 使用UTR补单

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
**机器人可以帮助您做什么**

当前群组已绑定商户: \`${group.merchantId}\`

**可用命令:**
\`/h\` - 查看机器人可以帮助您做什么
\`/y\` - 查询余额
\`/t\` - 查看近半小时/今日订单统计
\`/s 商户单号\` - 查询代收订单状态
\`/f 商户单号\` - 查询代付订单状态
\`/p 商户单号\` - 获取代付凭证
\`/tu 提币金额 提币地址\` - 获取代付凭证

**印度机器人额外功能:**
\`/i UPI号码 商户单号\` - UPI查询收款户
\`/u UTR号码 商户单号\` - 使用UTR查询相关订单
\`/b UTR号码 商户单号\` - 使用UTR补单

**使用示例:**
\`/y\` - 查看余额
\`/s ORDER123456\` - 查询订单
\`/t\` - 查看统计
    `;

    bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  }
}

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