const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// 导入模型
const Order = require('../server/models/order');
const Merchant = require('../server/models/merchant');

// Bot配置
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-platform';
const AUTHORIZED_USERS = (process.env.AUTHORIZED_TELEGRAM_USERS || '').split(',').filter(id => id);

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

// 权限验证中间件
function isAuthorizedUser(userId) {
  if (AUTHORIZED_USERS.length === 0) {
    console.warn('⚠️  警告: 未设置授权用户列表，所有用户都可以使用');
    return true;
  }
  return AUTHORIZED_USERS.includes(userId.toString());
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

// 命令处理器类
class TelegramBotCommands {
  constructor(bot) {
    this.bot = bot;
    this.setupCommands();
  }

  setupCommands() {
    // 帮助命令
    this.bot.onText(/^\/h(@\w+)?(\s|$)/, (msg) => this.handleHelp(msg));
    
    // 余额查询
    this.bot.onText(/^\/y(@\w+)?(\s|$)/, (msg) => this.handleBalance(msg));
    
    // 订单统计
    this.bot.onText(/^\/t(@\w+)?(\s|$)/, (msg) => this.handleStatistics(msg));
    
    // 代收订单查询
    this.bot.onText(/^\/s(@\w+)?\s+(.+)/, (msg, match) => this.handleDepositQuery(msg, match[2]));
    
    // 代付订单查询
    this.bot.onText(/^\/f(@\w+)?\s+(.+)/, (msg, match) => this.handleWithdrawQuery(msg, match[2]));
    
    // 代付凭证查询
    this.bot.onText(/^\/p(@\w+)?\s+(.+)/, (msg, match) => this.handlePayoutProof(msg, match[2]));
    
    // UPI查询
    this.bot.onText(/^\/i(@\w+)?\s+(\S+)\s+(.+)/, (msg, match) => this.handleUpiQuery(msg, match[2], match[3]));
    
    // UTR查询
    this.bot.onText(/^\/u(@\w+)?\s+(\S+)\s+(.+)/, (msg, match) => this.handleUtrQuery(msg, match[2], match[3]));
    
    // UTR补单
    this.bot.onText(/^\/b(@\w+)?\s+(\S+)\s+(.+)/, (msg, match) => this.handleUtrFix(msg, match[2], match[3]));

    // 错误处理
    this.bot.on('polling_error', (error) => {
      console.error('❌ Polling错误:', error);
    });

    console.log('✅ Telegram机器人已启动，支持以下命令:');
    console.log('📋 /h - 查看帮助');
    console.log('💰 /y - 查询余额');
    console.log('📊 /t - 查看订单统计');
    console.log('🔍 /s 商户单号 - 查询代收订单状态');
    console.log('🔍 /f 商户单号 - 查询代付订单状态');
    console.log('📄 /p 商户单号 - 获取代付凭证');
    console.log('🏦 /i UPI号码 商户单号 - UPI查询收款户');
    console.log('🔗 /u UTR号码 商户单号 - 使用UTR查询相关订单');
    console.log('🔧 /b UTR号码 商户单号 - 使用UTR补单');
  }

  // 权限检查
  checkAuth(msg) {
    if (!isAuthorizedUser(msg.from.id)) {
      this.bot.sendMessage(msg.chat.id, '❌ 您没有权限使用此机器人');
      return false;
    }
    return true;
  }

  // 帮助命令
  async handleHelp(msg) {
    if (!this.checkAuth(msg)) return;

    const helpText = `
🤖 **印度支付平台机器人** 

📋 **基础查询命令:**
/h - 查看机器人可以帮助您做什么
/y - 查询余额
/t - 查看近半小时/今日订单统计

🔍 **订单查询命令:**
/s 商户单号 - 查询代收订单状态
/f 商户单号 - 查询代付订单状态  
/p 商户单号 - 获取代付凭证

🇮🇳 **印度机器人额外功能:**
/i UPI号码 商户单号 - UPI查询收款户
/u UTR号码 商户单号 - 使用UTR查询相关订单
/b UTR号码 商户单号 - 使用UTR补单

⚡ **使用示例:**
\`/s ORDER123456\` - 查询订单状态
\`/i 9876543210@paytm ORDER123456\` - UPI查询
\`/u UTR1234567890 ORDER123456\` - UTR查询

💡 **提示:** 在群组中使用时，可以@机器人用户名
    `;

    this.bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  }

  // 余额查询
  async handleBalance(msg) {
    if (!this.checkAuth(msg)) return;

    try {
      this.bot.sendMessage(msg.chat.id, '🔍 正在查询平台总余额...');

      // 获取所有商户余额汇总
      const merchants = await Merchant.find({ status: 'ACTIVE' });
      let totalBalance = 0;
      let merchantCount = 0;

      for (const merchant of merchants) {
        const balance = await this.calculateMerchantBalance(merchant.merchantId);
        totalBalance += balance.availableAmount;
        merchantCount++;
      }

      const responseText = `
💰 **平台余额查询结果**

**活跃商户数量:** ${merchantCount}
**平台总可用余额:** ₹${formatAmount(totalBalance)}
**查询时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

💡 使用 /t 查看订单统计信息
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('查询余额失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询余额失败，请稍后重试');
    }
  }

  // 订单统计
  async handleStatistics(msg) {
    if (!this.checkAuth(msg)) return;

    try {
      this.bot.sendMessage(msg.chat.id, '📊 正在统计订单数据...');

      // 获取今日和30分钟时间范围
      const todayRange = getTodayRange();
      const halfHourRange = getTimeRange(0.5);

      // 今日入款统计
      const todayDeposits = await this.getOrderStats('DEPOSIT', todayRange.startTime, todayRange.endTime);
      
      // 今日出款统计
      const todayWithdrawals = await this.getOrderStats('WITHDRAWAL', todayRange.startTime, todayRange.endTime);
      
      // 30分钟入款成功率
      const halfHourDeposits = await this.getOrderStats('DEPOSIT', halfHourRange.startTime, halfHourRange.endTime);

      const responseText = `
📊 **订单统计报告**

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

    } catch (error) {
      console.error('查询统计失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询统计失败，请稍后重试');
    }
  }

  // 代收订单查询
  async handleDepositQuery(msg, orderId) {
    if (!this.checkAuth(msg)) return;

    try {
      const order = await Order.findOne({ 
        orderId: orderId.trim(),
        type: 'DEPOSIT' 
      });

      if (!order) {
        this.bot.sendMessage(msg.chat.id, `❌ 未找到代收订单: ${orderId}`);
        return;
      }

      const statusEmoji = this.getStatusEmoji(order.status);
      const responseText = `
🔍 **代收订单查询结果**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**订单状态:** ${statusEmoji} ${order.status}
**订单金额:** ₹${formatAmount(order.amount)}
**支付提供商:** ${order.provider.name}
**创建时间:** ${order.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
**更新时间:** ${order.updatedAt.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

${order.provider.transactionId ? `**交易ID:** \`${order.provider.transactionId}\`` : ''}
${order.provider.utrNumber ? `**UTR号码:** \`${order.provider.utrNumber}\`` : ''}
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('查询代收订单失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询代收订单失败，请稍后重试');
    }
  }

  // 代付订单查询
  async handleWithdrawQuery(msg, orderId) {
    if (!this.checkAuth(msg)) return;

    try {
      const order = await Order.findOne({ 
        orderId: orderId.trim(),
        type: 'WITHDRAWAL' 
      });

      if (!order) {
        this.bot.sendMessage(msg.chat.id, `❌ 未找到代付订单: ${orderId}`);
        return;
      }

      const statusEmoji = this.getStatusEmoji(order.status);
      const responseText = `
🔍 **代付订单查询结果**

**订单号:** \`${order.orderId}\`
**商户号:** ${order.merchantId}
**订单状态:** ${statusEmoji} ${order.status}
**代付金额:** ₹${formatAmount(order.amount)}
**收款账户:** ${order.bankAccount?.accountNumber || 'N/A'}
**收款人:** ${order.bankAccount?.accountHolderName || 'N/A'}
**支付提供商:** ${order.provider.name}
**创建时间:** ${order.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

${order.provider.transactionId ? `**交易ID:** \`${order.provider.transactionId}\`` : ''}
${order.provider.utrNumber ? `**UTR号码:** \`${order.provider.utrNumber}\`` : ''}
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('查询代付订单失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询代付订单失败，请稍后重试');
    }
  }

  // 代付凭证查询
  async handlePayoutProof(msg, orderId) {
    if (!this.checkAuth(msg)) return;

    try {
      const order = await Order.findOne({ 
        orderId: orderId.trim(),
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

    } catch (error) {
      console.error('查询代付凭证失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ 查询代付凭证失败，请稍后重试');
    }
  }

  // UPI查询
  async handleUpiQuery(msg, upiId, orderId) {
    if (!this.checkAuth(msg)) return;

    try {
      // 这里应该调用实际的UPI查询API
      // 现在先返回模拟数据
      const responseText = `
🏦 **UPI查询结果**

**UPI ID:** ${upiId}
**关联订单:** ${orderId}
**查询时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}

⚠️ **注意:** UPI查询功能需要对接实际的UPI服务提供商API
💡 **建议:** 请联系技术团队完善此功能
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('UPI查询失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ UPI查询失败，请稍后重试');
    }
  }

  // UTR查询
  async handleUtrQuery(msg, utrNumber, orderId) {
    if (!this.checkAuth(msg)) return;

    try {
      const orders = await Order.find({
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

    } catch (error) {
      console.error('UTR查询失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ UTR查询失败，请稍后重试');
    }
  }

  // UTR补单
  async handleUtrFix(msg, utrNumber, orderId) {
    if (!this.checkAuth(msg)) return;

    try {
      const order = await Order.findOne({ orderId: orderId.trim() });

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
        executedBy: `Telegram用户: ${msg.from.username || msg.from.id}`
      });

      await order.save();

      const responseText = `
🔧 **UTR补单成功**

**订单号:** \`${order.orderId}\`
**UTR号码:** \`${utrNumber}\`
**订单状态:** ✅ SUCCESS
**补单金额:** ₹${formatAmount(order.amount)}
**补单时间:** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kolkata' })}
**操作人员:** ${msg.from.username || msg.from.first_name}

✅ **补单完成，订单状态已更新**
      `;

      this.bot.sendMessage(msg.chat.id, responseText, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('UTR补单失败:', error);
      this.bot.sendMessage(msg.chat.id, '❌ UTR补单失败，请稍后重试');
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
  async getOrderStats(type, startTime, endTime) {
    try {
      const totalOrders = await Order.countDocuments({
        type,
        createdAt: { $gte: startTime, $lte: endTime }
      });

      const successfulOrders = await Order.countDocuments({
        type,
        status: 'SUCCESS',
        createdAt: { $gte: startTime, $lte: endTime }
      });

      const totalAmount = await Order.aggregate([
        {
          $match: {
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
const botCommands = new TelegramBotCommands(bot);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('🛑 正在关闭Telegram机器人...');
  mongoose.connection.close(() => {
    console.log('✅ 已断开数据库连接');
    process.exit(0);
  });
});

module.exports = bot;