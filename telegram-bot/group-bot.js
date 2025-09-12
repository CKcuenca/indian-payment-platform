const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// 导入模型
const Order = require('../server/models/order');
const Merchant = require('../server/models/merchant');
const TelegramGroup = require('../server/models/telegram-group');

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

// 连接数据库
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ 已连接到MongoDB数据库');
}).catch(err => {
  console.error('❌ MongoDB连接失败:', err);
  process.exit(1);
});

// 工具函数：检查是否为管理员
function isAdmin(userId) {
  if (ADMIN_USERS.length === 0) {
    console.warn('⚠️  警告: 未设置管理员用户列表');
    return false;
  }
  return ADMIN_USERS.includes(userId.toString());
}

// 工具函数：格式化金额（paisa转换为INR）
function formatAmount(paisa) {
  return (paisa / 100).toFixed(2);
}

// 工具函数：计算时间差
function getTimeRange(hours) {
  const now = new Date();
  const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { startTime, endTime: now };
}

// 工具函数：获取今日时间范围
function getTodayRange() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  return { startTime: startOfDay, endTime: now };
}

// 群组绑定商户机器人类
class GroupMerchantBot {
  constructor(bot) {
    this.bot = bot;
    this.setupCommands();
    this.setupEvents();
  }

  setupCommands() {
    // 管理员命令：绑定群组到商户
    this.bot.onText(/^\/bind(@\w+)?\s+(\w+)/, (msg, match) => this.handleBind(msg, match[2]));
    
    // 管理员命令：解绑群组
    this.bot.onText(/^\/unbind(@\w+)?(\s|$)/, (msg) => this.handleUnbind(msg));
    
    // 管理员命令：查看群组信息
    this.bot.onText(/^\/groupinfo(@\w+)?(\s|$)/, (msg) => this.handleGroupInfo(msg));
    
    // 帮助命令 (群组和私聊通用)
    this.bot.onText(/^\/help(@\w+)?(\s|$)/, (msg) => this.handleHelp(msg));
    this.bot.onText(/^\/h(@\w+)?(\s|$)/, (msg) => this.handleHelp(msg));
    
    // 查询命令 (需要群组绑定)
    this.bot.onText(/^\/y(@\w+)?(\s|$)/, (msg) => this.handleBalance(msg));
    this.bot.onText(/^\/t(@\w+)?(\s|$)/, (msg) => this.handleStatistics(msg));
    this.bot.onText(/^\/s(@\w+)?\s+(.+)/, (msg, match) => this.handleDepositQuery(msg, match[2]));
    this.bot.onText(/^\/f(@\w+)?\s+(.+)/, (msg, match) => this.handleWithdrawQuery(msg, match[2]));
    this.bot.onText(/^\/p(@\w+)?\s+(.+)/, (msg, match) => this.handlePayoutProof(msg, match[2]));
    this.bot.onText(/^\/i(@\w+)?\s+(\S+)\s+(.+)/, (msg, match) => this.handleUpiQuery(msg, match[2], match[3]));
    this.bot.onText(/^\/u(@\w+)?\s+(\S+)\s+(.+)/, (msg, match) => this.handleUtrQuery(msg, match[2], match[3]));
    this.bot.onText(/^\/b(@\w+)?\s+(\S+)\s+(.+)/, (msg, match) => this.handleUtrFix(msg, match[2], match[3]));

    console.log('✅ Telegram机器人已启动 (群组绑定模式)');
    console.log('🔧 管理员命令:');
    console.log('   /bind 商户ID - 绑定当前群组到商户');
    console.log('   /unbind - 解绑当前群组');
    console.log('   /groupinfo - 查看群组绑定信息');
    console.log('📋 用户命令:');
    console.log('   /help - 查看帮助');
    console.log('   /y - 查询余额');
    console.log('   /t - 查看订单统计');
  }

  setupEvents() {
    // 新成员加入群组事件
    this.bot.on('new_chat_members', (msg) => this.handleNewMembers(msg));
    
    // 机器人被加入群组事件
    this.bot.on('group_chat_created', (msg) => this.handleBotAddedToGroup(msg));
    this.bot.on('supergroup_chat_created', (msg) => this.handleBotAddedToGroup(msg));
    
    // 群组信息变更事件
    this.bot.on('new_chat_title', (msg) => this.handleGroupTitleChange(msg));
    
    // 错误处理
    this.bot.on('polling_error', (error) => {
      console.error('❌ Polling错误:', error);
    });
  }

  // 检查群组绑定状态
  async checkGroupBinding(msg) {
    if (msg.chat.type === 'private') {
      return { bound: false, reason: 'private_chat' };
    }

    try {
      const group = await TelegramGroup.findByChatId(msg.chat.id);
      if (!group) {
        return { bound: false, reason: 'not_bound' };
      }

      return { bound: true, group };
    } catch (error) {
      console.error('检查群组绑定失败:', error);
      return { bound: false, reason: 'error' };
    }
  }

  // 检查用户权限
  async checkUserPermission(msg, group, commandType = 'query') {
    const userId = msg.from.id.toString();
    
    // 管理员始终有权限
    if (isAdmin(userId)) {
      return { authorized: true, reason: 'admin' };
    }

    // 检查群组权限设置
    if (!group.checkUserPermission(userId)) {
      return { authorized: false, reason: 'not_authorized' };
    }

    // 检查命令权限
    if (!group.checkCommandPermission(commandType)) {
      return { authorized: false, reason: 'command_disabled' };
    }

    return { authorized: true, reason: 'group_member' };
  }

  // 管理员命令：绑定群组到商户
  async handleBind(msg, merchantId) {
    // 只允许管理员执行
    if (!isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, '❌ 只有管理员可以绑定群组到商户');
      return;
    }

    // 只能在群组中执行
    if (msg.chat.type === 'private') {
      this.bot.sendMessage(msg.chat.id, '❌ 此命令只能在群组中使用');
      return;
    }

    try {
      // 验证商户是否存在
      const merchant = await Merchant.findOne({ merchantId });
      if (!merchant) {
        this.bot.sendMessage(msg.chat.id, `❌ 商户 ${merchantId} 不存在，请先在后台创建商户账号`);
        return;
      }

      // 绑定群组到商户
      const group = await TelegramGroup.bindGroup(
        msg.chat,
        merchantId,
        msg.from
      );

      const successMessage = `
🎉 **群组绑定成功！**

**群组信息:**
📱 群组名称: ${msg.chat.title}
🆔 群组ID: \`${msg.chat.id}\`
👥 群组类型: ${msg.chat.type}

**绑定商户:**
🏪 商户ID: \`${merchantId}\`
🏪 商户名称: ${merchant.name || '未设置'}

**操作信息:**
👤 操作人员: @${msg.from.username || msg.from.first_name}
⏰ 绑定时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

✅ **绑定成功后，群组成员可以使用以下命令：**
💰 \`/y@${this.bot.options.username}\` - 查询商户余额
📊 \`/t@${this.bot.options.username}\` - 查看订单统计
🔍 \`/s@${this.bot.options.username} 订单号\` - 查询代收订单
🔍 \`/f@${this.bot.options.username} 订单号\` - 查询代付订单

💡 使用 \`/help@${this.bot.options.username}\` 查看完整命令列表
      `;

      this.bot.sendMessage(msg.chat.id, successMessage, { parse_mode: 'Markdown' });

      // 发送群组帮助信息
      setTimeout(() => {
        this.sendGroupHelp(msg.chat.id, merchantId);
      }, 2000);

    } catch (error) {
      console.error('绑定群组失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 绑定群组失败，请稍后重试');
    }
  }

  // 管理员命令：解绑群组
  async handleUnbind(msg) {
    if (!isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, '❌ 只有管理员可以解绑群组');
      return;
    }

    if (msg.chat.type === 'private') {
      this.bot.sendMessage(msg.chat.id, '❌ 此命令只能在群组中使用');
      return;
    }

    try {
      const group = await TelegramGroup.findByChatId(msg.chat.id);
      if (!group) {
        this.bot.sendMessage(msg.chat.id, '❌ 当前群组未绑定任何商户');
        return;
      }

      group.status = 'INACTIVE';
      await group.save();

      this.bot.sendMessage(msg.chat.id, `
🔓 **群组解绑成功**

群组已与商户 \`${group.merchantId}\` 解除绑定
⏰ 解绑时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

❌ 群组成员将无法继续使用查询功能
      `, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('解绑群组失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 解绑群组失败，请稍后重试');
    }
  }

  // 管理员命令：查看群组信息
  async handleGroupInfo(msg) {
    if (!isAdmin(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, '❌ 只有管理员可以查看群组信息');
      return;
    }

    try {
      const binding = await this.checkGroupBinding(msg);
      
      if (!binding.bound) {
        this.bot.sendMessage(msg.chat.id, '❌ 当前群组未绑定任何商户');
        return;
      }

      const group = binding.group;
      const merchant = await Merchant.findOne({ merchantId: group.merchantId });

      const infoMessage = `
📋 **群组绑定信息**

**群组信息:**
📱 群组名称: ${group.chatTitle}
🆔 群组ID: \`${group.chatId}\`
👥 群组类型: ${group.chatType}
📊 状态: ${group.status}

**绑定商户:**
🏪 商户ID: \`${group.merchantId}\`
🏪 商户名称: ${merchant?.name || '未设置'}
🏪 商户状态: ${merchant?.status || '未知'}

**绑定信息:**
👤 绑定操作员: @${group.bindInfo.operatorUsername}
⏰ 绑定时间: ${group.bindInfo.bindTime.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

**使用统计:**
📈 总命令数: ${group.usage.totalCommands}
🕐 最后使用: ${group.usage.lastUsed ? group.usage.lastUsed.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' }) : '从未使用'}

**权限设置:**
👥 允许所有成员: ${group.settings.allowAllMembers ? '是' : '否'}
🔧 允许的命令: ${group.settings.allowedCommands.join(', ')}
      `;

      this.bot.sendMessage(msg.chat.id, infoMessage, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('查看群组信息失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查看群组信息失败，请稍后重试');
    }
  }

  // 发送群组帮助信息
  async sendGroupHelp(chatId, merchantId) {
    const helpMessage = `
🤖 **群组机器人使用指南**

欢迎使用印度支付平台监控机器人！
当前群组已绑定商户: \`${merchantId}\`

📋 **可用命令:**

**📊 数据查询:**
💰 \`/y@${this.bot.options.username}\` - 查询商户余额
📈 \`/t@${this.bot.options.username}\` - 查看今日/30分钟订单统计

**🔍 订单查询:**
🔍 \`/s@${this.bot.options.username} 订单号\` - 查询代收订单状态
🔍 \`/f@${this.bot.options.username} 订单号\` - 查询代付订单状态
📄 \`/p@${this.bot.options.username} 订单号\` - 获取代付凭证

**🇮🇳 印度特色功能:**
🏦 \`/i@${this.bot.options.username} UPI号码 订单号\` - UPI查询
🔗 \`/u@${this.bot.options.username} UTR号码 订单号\` - UTR查询
🔧 \`/b@${this.bot.options.username} UTR号码 订单号\` - UTR补单

**💡 使用示例:**
\`/y@${this.bot.options.username}\` - 查看余额
\`/s@${this.bot.options.username} ORDER123456\` - 查询订单
\`/t@${this.bot.options.username}\` - 查看统计

❓ 如需帮助，请使用 \`/help@${this.bot.options.username}\`
    `;

    this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  // 帮助命令
  async handleHelp(msg) {
    const isPrivateChat = msg.chat.type === 'private';
    
    if (isPrivateChat) {
      // 私聊中的帮助
      const adminHelp = isAdmin(msg.from.id) ? `
🔧 **管理员命令:**
\`/bind 商户ID\` - 绑定群组到商户 (仅群组)
\`/unbind\` - 解绑群组 (仅群组)
\`/groupinfo\` - 查看群组绑定信息 (仅群组)

` : '';

      const helpMessage = `
🤖 **印度支付平台机器人**

${adminHelp}📋 **查询命令:** (需在已绑定的群组中使用)
\`/y\` - 查询商户余额
\`/t\` - 查看订单统计
\`/s 订单号\` - 查询代收订单状态
\`/f 订单号\` - 查询代付订单状态
\`/p 订单号\` - 获取代付凭证
\`/i UPI号码 订单号\` - UPI查询
\`/u UTR号码 订单号\` - UTR查询
\`/b UTR号码 订单号\` - UTR补单

💡 **使用说明:**
- 查询功能需要在已绑定商户的群组中使用
- 管理员可以使用 /bind 命令绑定群组到商户
- 在群组中使用时请@机器人：\`/命令@bot用户名\`
      `;

      this.bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
    } else {
      // 群组中的帮助
      const binding = await this.checkGroupBinding(msg);
      
      if (!binding.bound) {
        const unboundMessage = `
❌ **群组未绑定**

当前群组尚未绑定到任何商户。

🔧 **管理员操作:**
请管理员使用 \`/bind 商户ID\` 命令绑定群组到商户

📋 **绑定后可使用的功能:**
💰 查询商户余额
📊 查看订单统计  
🔍 查询订单状态
🔧 UTR补单等功能
        `;

        this.bot.sendMessage(msg.chat.id, unboundMessage, { parse_mode: 'Markdown' });
        return;
      }

      // 发送群组帮助
      this.sendGroupHelp(msg.chat.id, binding.group.merchantId);
    }
  }

  // 余额查询
  async handleBalance(msg) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法查询余额');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'balance');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const merchantId = binding.group.merchantId;
      const balance = await this.calculateMerchantBalance(merchantId);
      
      const responseText = `
💰 **商户余额查询**

🏪 **商户ID:** \`${merchantId}\`
💰 **可用余额:** ₹${formatAmount(balance.availableAmount)}
🔒 **冻结金额:** ₹${formatAmount(balance.frozenAmount)}
📊 **总余额:** ₹${formatAmount(balance.totalBalance)}

⏰ **查询时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('balance');

    } catch (error) {
      console.error('查询余额失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询余额失败，请稍后重试');
    }
  }

  // 订单统计
  async handleStatistics(msg) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法查询统计');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'statistics');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const merchantId = binding.group.merchantId;
      
      // 获取今日和30分钟时间范围
      const todayRange = getTodayRange();
      const halfHourRange = getTimeRange(0.5);

      // 查询统计数据
      const todayDeposits = await this.getOrderStats(merchantId, 'DEPOSIT', todayRange.startTime, todayRange.endTime);
      const todayWithdrawals = await this.getOrderStats(merchantId, 'WITHDRAWAL', todayRange.startTime, todayRange.endTime);
      const halfHourDeposits = await this.getOrderStats(merchantId, 'DEPOSIT', halfHourRange.startTime, halfHourRange.endTime);

      const responseText = `
📊 **订单统计报告**

🏪 **商户ID:** \`${merchantId}\`

**今日入款汇总:** ${todayDeposits.successCount}/${todayDeposits.totalCount}
**30分钟成功率:** ${halfHourDeposits.successRate}%
**今日入款成功率:** ${todayDeposits.successRate}%
**今日入款笔均:** ₹${todayDeposits.averageAmount}

**今日出款汇总:** ${todayWithdrawals.successCount}/${todayWithdrawals.totalCount}
**今日出款成功率:** ${todayWithdrawals.successRate}%
**今日出款笔均:** ₹${todayWithdrawals.averageAmount}

**统计时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('statistics');

    } catch (error) {
      console.error('查询统计失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询统计失败，请稍后重试');
    }
  }

  // 代收订单查询
  async handleDepositQuery(msg, orderId) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法查询订单');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'deposit_query');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const merchantId = binding.group.merchantId;
      const order = await Order.findOne({ 
        orderId: orderId.trim(),
        merchantId: merchantId,
        type: 'DEPOSIT' 
      });

      if (!order) {
        this.bot.sendMessage(msg.chat.id, `❌ 未找到代收订单: ${orderId}`);
        return;
      }

      const statusEmoji = this.getStatusEmoji(order.status);
      const responseText = `
🔍 **代收订单查询**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**订单状态:** ${statusEmoji} ${order.status}
**订单金额:** ₹${formatAmount(order.amount)}
**支付提供商:** ${order.provider.name}
**创建时间:** ${order.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

${order.provider.transactionId ? `**交易ID:** \`${order.provider.transactionId}\`` : ''}
${order.provider.utrNumber ? `**UTR号码:** \`${order.provider.utrNumber}\`` : ''}
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('deposit_query');

    } catch (error) {
      console.error('查询代收订单失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询代收订单失败，请稍后重试');
    }
  }

  // 代付订单查询
  async handleWithdrawQuery(msg, orderId) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法查询订单');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'withdrawal_query');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const merchantId = binding.group.merchantId;
      const order = await Order.findOne({ 
        orderId: orderId.trim(),
        merchantId: merchantId,
        type: 'WITHDRAWAL' 
      });

      if (!order) {
        this.bot.sendMessage(msg.chat.id, `❌ 未找到代付订单: ${orderId}`);
        return;
      }

      const statusEmoji = this.getStatusEmoji(order.status);
      const responseText = `
🔍 **代付订单查询**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**订单状态:** ${statusEmoji} ${order.status}
**代付金额:** ₹${formatAmount(order.amount)}
**收款账户:** ${order.bankAccount?.accountNumber ? order.bankAccount.accountNumber.substr(-4).padStart(order.bankAccount.accountNumber.length, '*') : 'N/A'}
**收款人:** ${order.bankAccount?.accountHolderName || 'N/A'}
**支付提供商:** ${order.provider.name}
**创建时间:** ${order.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

${order.provider.transactionId ? `**交易ID:** \`${order.provider.transactionId}\`` : ''}
${order.provider.utrNumber ? `**UTR号码:** \`${order.provider.utrNumber}\`` : ''}
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('withdrawal_query');

    } catch (error) {
      console.error('查询代付订单失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询代付订单失败，请稍后重试');
    }
  }

  // 代付凭证查询
  async handlePayoutProof(msg, orderId) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法查询凭证');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'payout_proof');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const merchantId = binding.group.merchantId;
      const order = await Order.findOne({ 
        orderId: orderId.trim(),
        merchantId: merchantId,
        type: 'WITHDRAWAL',
        status: 'SUCCESS'
      });

      if (!order) {
        this.bot.sendMessage(msg.chat.id, `❌ 未找到已成功的代付订单: ${orderId}`);
        return;
      }

      const responseText = `
📄 **代付凭证**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**代付金额:** ₹${formatAmount(order.amount)}
**收款账户:** ${order.bankAccount?.accountNumber || 'N/A'}
**收款人:** ${order.bankAccount?.accountHolderName || 'N/A'}
**银行名称:** ${order.bankAccount?.bankName || 'N/A'}
**IFSC代码:** ${order.bankAccount?.ifscCode || 'N/A'}
**UTR号码:** \`${order.provider.utrNumber || 'N/A'}\`
**交易时间:** ${order.completedAt?.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' }) || '未知'}

✅ **状态:** 代付成功
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('payout_proof');

    } catch (error) {
      console.error('查询代付凭证失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询代付凭证失败，请稍后重试');
    }
  }

  // UPI查询
  async handleUpiQuery(msg, upiId, orderId) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法使用UPI查询');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'upi_query');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const responseText = `
🏦 **UPI查询结果**

**UPI ID:** ${upiId}
**关联订单:** ${orderId}
**商户:** ${binding.group.merchantId}
**查询时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

⚠️ **注意:** UPI查询功能需要对接实际的UPI服务提供商API
💡 **建议:** 请联系技术团队完善此功能
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('upi_query');

    } catch (error) {
      console.error('UPI查询失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ UPI查询失败，请稍后重试');
    }
  }

  // UTR查询
  async handleUtrQuery(msg, utrNumber, orderId) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法使用UTR查询');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'utr_query');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const merchantId = binding.group.merchantId;
      const orders = await Order.find({
        merchantId: merchantId,
        $or: [
          { 'provider.utrNumber': utrNumber },
          { orderId: orderId.trim() }
        ]
      });

      if (orders.length === 0) {
        this.bot.sendMessage(msg.chat.id, `❌ 未找到UTR相关订单: ${utrNumber}`);
        return;
      }

      let responseText = `
🔗 **UTR查询结果**

**UTR号码:** \`${utrNumber}\`
**商户:** ${merchantId}
**关联订单数量:** ${orders.length}

`;

      orders.forEach((order, index) => {
        const statusEmoji = this.getStatusEmoji(order.status);
        responseText += `
**订单 ${index + 1}:**
- **订单号:** \`${order.orderId}\`
- **类型:** ${order.type === 'DEPOSIT' ? '代收' : '代付'}
- **状态:** ${statusEmoji} ${order.status}
- **金额:** ₹${formatAmount(order.amount)}
- **时间:** ${order.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
`;
      });

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('utr_query');

    } catch (error) {
      console.error('UTR查询失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ UTR查询失败，请稍后重试');
    }
  }

  // UTR补单
  async handleUtrFix(msg, utrNumber, orderId) {
    const binding = await this.checkGroupBinding(msg);
    if (!binding.bound) {
      this.bot.sendMessage(msg.chat.id, '❌ 群组未绑定商户，无法使用UTR补单');
      return;
    }

    const permission = await this.checkUserPermission(msg, binding.group, 'utr_fix');
    if (!permission.authorized) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此功能');
      return;
    }

    try {
      const merchantId = binding.group.merchantId;
      const order = await Order.findOne({ 
        orderId: orderId.trim(),
        merchantId: merchantId
      });

      if (!order) {
        this.bot.sendMessage(msg.chat.id, `❌ 未找到订单: ${orderId}`);
        return;
      }

      if (order.status === 'SUCCESS') {
        this.bot.sendMessage(msg.chat.id, `✅ 订单 ${orderId} 已经是成功状态，无需补单`);
        return;
      }

      // 更新订单状态和UTR信息
      order.provider.utrNumber = utrNumber;
      order.status = 'SUCCESS';
      order.completedAt = new Date();
      order.statusHistory.push({
        status: 'SUCCESS',
        timestamp: new Date(),
        reason: `UTR补单: ${utrNumber}`,
        executedBy: `Telegram用户: ${msg.from.username || msg.from.id} (群组: ${msg.chat.title})`
      });

      await order.save();

      const responseText = `
🔧 **UTR补单成功**

**订单号:** \`${order.orderId}\`
**商户:** ${merchantId}
**UTR号码:** \`${utrNumber}\`
**订单状态:** ✅ SUCCESS
**补单金额:** ₹${formatAmount(order.amount)}
**补单时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
**操作人员:** @${msg.from.username || msg.from.first_name}

✅ **补单完成，订单状态已更新**
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });
      
      // 更新使用统计
      await binding.group.updateUsage('utr_fix');

    } catch (error) {
      console.error('UTR补单失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ UTR补单失败，请稍后重试');
    }
  }

  // 事件处理：新成员加入群组
  async handleNewMembers(msg) {
    // 检查是否有机器人被添加
    const botAdded = msg.new_chat_members.some(member => member.is_bot && member.id === this.bot.options.id);
    
    if (botAdded) {
      await this.handleBotAddedToGroup(msg);
    }
  }

  // 事件处理：机器人被添加到群组
  async handleBotAddedToGroup(msg) {
    const welcomeMessage = `
🎉 **欢迎使用印度支付平台监控机器人！**

我是您的专属支付数据查询助手 🤖

🔧 **下一步操作:**
1. 请管理员使用 \`/bind 商户ID\` 命令绑定群组到商户
2. 绑定成功后，群组成员即可查询支付数据

💡 **主要功能:**
💰 余额查询
📊 订单统计  
🔍 订单查询
🔧 UTR补单

❓ 需要帮助请使用 \`/help@${this.bot.options.username}\`
    `;

    this.bot.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
  }

  // 事件处理：群组标题变更
  async handleGroupTitleChange(msg) {
    try {
      const group = await TelegramGroup.findByChatId(msg.chat.id);
      if (group) {
        group.chatTitle = msg.new_chat_title;
        await group.save();
      }
    } catch (error) {
      console.error('更新群组标题失败:', error);
    }
  }

  // 工具方法：获取状态表情
  getStatusEmoji(status) {
    const emojiMap = {
      'SUCCESS': '✅',
      'PENDING': '⏳',
      'PROCESSING': '🔄',
      'FAILED': '❌',
      'CANCELLED': '🚫',
      'TIMEOUT': '⏰',
      'REFUNDED': '↩️'
    };
    return emojiMap[status] || '❓';
  }

  // 工具方法：计算商户余额
  async calculateMerchantBalance(merchantId) {
    try {
      const successfulDeposits = await Order.aggregate([
        { $match: { merchantId, type: 'DEPOSIT', status: 'SUCCESS' } },
        { $group: { _id: null, totalDeposits: { $sum: '$amount' } } }
      ]);

      const successfulWithdrawals = await Order.aggregate([
        { $match: { merchantId, type: 'WITHDRAWAL', status: 'SUCCESS' } },
        { $group: { _id: null, totalWithdrawals: { $sum: '$amount' } } }
      ]);

      const processingOrders = await Order.aggregate([
        { $match: { merchantId, status: { $in: ['PENDING', 'PROCESSING'] } } },
        { $group: { _id: null, frozenAmount: { $sum: '$amount' } } }
      ]);

      const totalDeposits = successfulDeposits[0]?.totalDeposits || 0;
      const totalWithdrawals = successfulWithdrawals[0]?.totalWithdrawals || 0;
      const frozenAmount = processingOrders[0]?.frozenAmount || 0;

      const totalBalance = totalDeposits - totalWithdrawals;
      const availableAmount = totalBalance - frozenAmount;

      return {
        totalBalance: Math.max(0, totalBalance),
        frozenAmount: Math.max(0, frozenAmount),
        availableAmount: Math.max(0, availableAmount)
      };

    } catch (error) {
      console.error('计算商户余额失败:', error);
      return { totalBalance: 0, frozenAmount: 0, availableAmount: 0 };
    }
  }

  // 工具方法：获取订单统计
  async getOrderStats(merchantId, type, startTime, endTime) {
    try {
      const totalOrders = await Order.countDocuments({
        merchantId,
        type,
        createdAt: { $gte: startTime, $lte: endTime }
      });

      const successfulOrders = await Order.countDocuments({
        merchantId,
        type,
        status: 'SUCCESS',
        createdAt: { $gte: startTime, $lte: endTime }
      });

      const totalAmount = await Order.aggregate([
        {
          $match: {
            merchantId,
            type,
            status: 'SUCCESS',
            createdAt: { $gte: startTime, $lte: endTime }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const successRate = totalOrders > 0 ? ((successfulOrders / totalOrders) * 100).toFixed(2) : '0';
      const averageAmount = successfulOrders > 0 ? 
        formatAmount((totalAmount[0]?.totalAmount || 0) / successfulOrders) : '0.00';

      return {
        totalCount: totalOrders,
        successCount: successfulOrders,
        successRate: successRate,
        averageAmount: averageAmount
      };

    } catch (error) {
      console.error('获取订单统计失败:', error);
      return {
        totalCount: 0,
        successCount: 0,
        successRate: '0',
        averageAmount: '0.00'
      };
    }
  }
}

// 启动机器人
const groupBot = new GroupMerchantBot(bot);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('🛑 正在关闭Telegram机器人...');
  mongoose.connection.close(() => {
    console.log('✅ 已断开数据库连接');
    process.exit(0);
  });
});

module.exports = bot;