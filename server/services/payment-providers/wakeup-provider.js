const BaseProvider = require('./base-provider');
const DhPayProvider = require('./dhpay-provider');

/**
 * 唤醒支付提供商
 * 玩家通过UPI转账到指定印度人的私人银行卡
 * 第三方支付公司通过网银查询转账是否完成
 */
class WakeupProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.providerName = 'wakeup';
    this.requiresManualVerification = true; // 需要手动验证
    
    // 初始化DhPay作为上游支付通道
    this.dhpayProvider = null;
    this.initializeDhPay();
  }

  /**
   * 初始化DhPay上游支付通道
   */
  initializeDhPay() {
    try {
      // 优先从PaymentConfig中查找DhPay配置
      const dhpayConfig = {
        baseUrl: process.env.DHPAY_BASE_URL || 'https://test-api.dhpay.com',
        mchId: '66', // 硬编码DhPay分配的商户ID
        secretKey: this.config?.provider?.secretKey || process.env.DHPAY_SECRET_KEY || 'CC3F988FCF248AA8C1007C5190D388AB',
        environment: process.env.DHPAY_ENVIRONMENT || 'test'
      };
      
      this.dhpayProvider = new DhPayProvider(dhpayConfig);
      console.log('✅ DhPay上游支付通道初始化成功', {
        mchId: dhpayConfig.mchId,
        environment: dhpayConfig.environment,
        baseUrl: dhpayConfig.baseUrl
      });
    } catch (error) {
      console.warn('⚠️ DhPay上游支付通道初始化失败:', error.message);
      this.dhpayProvider = null;
    }
  }

  /**
   * 创建代收订单
   * @param {Object} orderData 订单数据
   * @returns {Promise<Object>} 支付结果
   */
  async createCollectionOrder(orderData) {
    try {
      const { orderId, amount, currency = 'INR', customerPhone, description, useDhPay = false } = orderData;
      
      // 如果启用DhPay，则使用DhPay处理订单
      if (useDhPay && this.dhpayProvider) {
        return await this.createDhPayOrder(orderData);
      }
      
      // 生成UPI转账信息
      const upiTransferInfo = await this.generateUPITransferInfo(orderId, amount);
      
      // 创建待验证订单
      const paymentResult = {
        success: true,
        orderId: orderId,
        paymentUrl: null, // 不需要支付链接
        upiTransferInfo: {
          beneficiaryName: upiTransferInfo.beneficiaryName,
          beneficiaryUPI: upiTransferInfo.beneficiaryUPI,
          beneficiaryAccount: upiTransferInfo.beneficiaryAccount,
          ifscCode: upiTransferInfo.ifscCode,
          bankName: upiTransferInfo.bankName,
          amount: amount,
          currency: currency,
          transferNote: `Order: ${orderId} - ${description || 'Game payment'}`,
          expectedCompletionTime: '5-10 minutes'
        },
        status: 'PENDING_VERIFICATION',
        message: '请通过UPI转账到指定账户，转账完成后系统将自动验证',
        verificationRequired: true
      };

      // 记录订单到验证队列
      await this.addToVerificationQueue(orderId, upiTransferInfo);
      
      return paymentResult;
    } catch (error) {
      console.error('WakeupProvider createCollectionOrder error:', error);
      return {
        success: false,
        error: error.message || '创建唤醒支付订单失败'
      };
    }
  }

  /**
   * 创建DhPay订单
   * @param {Object} orderData 订单数据
   * @returns {Promise<Object>} 支付结果
   */
  async createDhPayOrder(orderData) {
    try {
      if (!this.dhpayProvider) {
        throw new Error('DhPay上游支付通道未初始化');
      }

      const dhpayResult = await this.dhpayProvider.createPayment(orderData);
      
      if (dhpayResult.success) {
        return {
          success: true,
          orderId: orderData.orderId,
          paymentUrl: dhpayResult.paymentUrl,
          status: 'PENDING',
          message: 'DhPay订单创建成功',
          dhpayOrderId: dhpayResult.orderId,
          provider: 'dhpay'
        };
      } else {
        throw new Error(dhpayResult.error || 'DhPay订单创建失败');
      }
    } catch (error) {
      console.error('创建DhPay订单失败:', error);
      return {
        success: false,
        error: error.message || '创建DhPay订单失败'
      };
    }
  }

  /**
   * 处理DhPay回调通知
   * @param {Object} callbackData 回调数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleDhPayCallback(callbackData) {
    try {
      const { orderId, amount, status, timestamp, sign } = callbackData;
      
      // 验证DhPay回调签名
      if (this.dhpayProvider) {
        const signatureValid = this.dhpayProvider.verifySignature(callbackData, sign);
        if (!signatureValid) {
          console.error('DhPay回调签名验证失败');
          return { success: false, error: '签名验证失败' };
        }
      } else {
        console.warn('DhPay提供者未初始化，跳过签名验证');
      }
      
      // 处理订单状态
      let orderStatus = 'PENDING';
      if (status === 'SUCCESS') {
        orderStatus = 'SUCCESS';
      } else if (status === 'FAILED') {
        orderStatus = 'FAILED';
      }
      
      // 更新订单状态
      await this.updateOrderStatus(orderId, orderStatus, {
        verificationMethod: 'dhpay_callback',
        callbackData: callbackData,
        upstreamProvider: 'dhpay'
      });
      
      return {
        success: true,
        message: 'DhPay回调处理成功',
        orderStatus: orderStatus
      };
    } catch (error) {
      console.error('处理DhPay回调失败:', error);
      return {
        success: false,
        error: error.message || '回调处理失败'
      };
    }
  }

  /**
   * 更新订单状态
   * @param {string} orderId 订单ID
   * @param {string} status 新状态
   * @param {Object} metadata 元数据
   * @returns {Promise<void>}
   */
  async updateOrderStatus(orderId, status, metadata = {}) {
    try {
      // 这里应该更新数据库中的订单状态
      // 暂时只记录日志
      console.log(`订单 ${orderId} 状态更新为: ${status}`, metadata);
      
      // TODO: 实现实际的订单状态更新逻辑
      // const Order = require('../../models/order');
      // await Order.findOneAndUpdate(
      //   { orderId: orderId },
      //   { 
      //     status: status,
      //     updatedAt: new Date(),
      //     metadata: metadata
      //   }
      // );
    } catch (error) {
      console.error('更新订单状态失败:', error);
    }
  }

  /**
   * 生成UPI转账信息
   * @param {string} orderId 订单ID
   * @param {number} amount 金额
   * @returns {Promise<Object>} UPI转账信息
   */
  async generateUPITransferInfo(orderId, amount) {
    // 从配置中获取可用的收款账户
    const availableAccounts = await this.getAvailableAccounts();
    const selectedAccount = this.selectAccount(availableAccounts, amount);
    
    return {
      beneficiaryName: selectedAccount.accountHolderName,
      beneficiaryUPI: selectedAccount.upiId,
      beneficiaryAccount: selectedAccount.accountNumber,
      ifscCode: selectedAccount.ifscCode,
      bankName: selectedAccount.bankName,
      transferAmount: amount,
      orderId: orderId
    };
  }

  /**
   * 获取可用的收款账户
   * @returns {Promise<Array>} 可用账户列表
   */
  async getAvailableAccounts() {
    // 这里应该从配置或数据库获取可用的收款账户
    // 暂时返回模拟数据
    return [
      {
        accountHolderName: 'RAHUL KUMAR',
        upiId: 'rahul.kumar@hdfc',
        accountNumber: '1234567890',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        dailyLimit: 100000,
        monthlyLimit: 2000000,
        isActive: true
      },
      {
        accountHolderName: 'PRIYA SHARMA',
        upiId: 'priya.sharma@icici',
        accountNumber: '0987654321',
        ifscCode: 'ICIC0000987',
        bankName: 'ICICI Bank',
        dailyLimit: 150000,
        monthlyLimit: 3000000,
        isActive: true
      }
    ];
  }

  /**
   * 选择收款账户
   * @param {Array} accounts 可用账户列表
   * @param {number} amount 转账金额
   * @returns {Object} 选中的账户
   */
  selectAccount(accounts, amount) {
    // 简单的账户选择逻辑：选择余额充足且活跃的账户
    const availableAccounts = accounts.filter(account => 
      account.isActive && 
      account.dailyLimit >= amount
    );
    
    if (availableAccounts.length === 0) {
      throw new Error('没有可用的收款账户');
    }
    
    // 随机选择一个账户（实际应用中应该有更智能的选择逻辑）
    return availableAccounts[Math.floor(Math.random() * availableAccounts.length)];
  }

  /**
   * 添加订单到验证队列
   * @param {string} orderId 订单ID
   * @param {Object} upiInfo UPI转账信息
   */
  async addToVerificationQueue(orderId, upiInfo) {
    // 这里应该将订单添加到验证队列
    // 可以存储在Redis或数据库中
    console.log(`订单 ${orderId} 已添加到唤醒支付验证队列`);
    
    // 设置定时任务，定期检查转账状态
    setTimeout(() => {
      this.checkTransferStatus(orderId);
    }, 300000); // 5分钟后开始检查
  }

  /**
   * 检查转账状态
   * @param {string} orderId 订单ID
   */
  async checkTransferStatus(orderId) {
    try {
      // 通过网银API查询转账状态
      const transferStatus = await this.queryBankTransferStatus(orderId);
      
      if (transferStatus.completed) {
        // 转账完成，更新订单状态
        await this.completeOrder(orderId, transferStatus);
      } else {
        // 继续等待，设置下次检查
        setTimeout(() => {
          this.checkTransferStatus(orderId);
        }, 60000); // 1分钟后再次检查
      }
    } catch (error) {
      console.error(`检查转账状态失败 ${orderId}:`, error);
    }
  }

  /**
   * 查询银行转账状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 转账状态
   */
  async queryBankTransferStatus(orderId) {
    // 这里应该调用银行的网银API查询转账状态
    // 暂时返回模拟数据
    return {
      completed: Math.random() > 0.7, // 70%概率完成
      amount: 1000,
      transactionId: `TXN${Date.now()}`,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * 完成订单
   * @param {string} orderId 订单ID
   * @param {Object} transferStatus 转账状态
   */
  async completeOrder(orderId, transferStatus) {
    try {
      // 这里应该调用订单服务更新订单状态
      console.log(`订单 ${orderId} 转账完成，金额: ${transferStatus.amount}`);
      
      // 发送支付成功通知
      await this.sendPaymentNotification(orderId, 'SUCCESS', transferStatus);
      
    } catch (error) {
      console.error(`完成订单失败 ${orderId}:`, error);
    }
  }

  /**
   * 发送支付通知
   * @param {string} orderId 订单ID
   * @param {string} status 支付状态
   * @param {Object} transferInfo 转账信息
   */
  async sendPaymentNotification(orderId, status, transferInfo) {
    // 这里应该调用webhook服务发送通知
    console.log(`发送支付通知: 订单 ${orderId}, 状态: ${status}`);
  }

  /**
   * 查询订单状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 订单状态
   */
  async queryOrderStatus(orderId) {
    try {
      // 查询订单的验证状态
      const verificationStatus = await this.getVerificationStatus(orderId);
      
      return {
        success: true,
        orderId: orderId,
        status: verificationStatus.status,
        message: verificationStatus.message,
        transferInfo: verificationStatus.transferInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '查询订单状态失败'
      };
    }
  }

  /**
   * 获取验证状态
   * @param {string} orderId 订单ID
   * @returns {Promise<Object>} 验证状态
   */
  async getVerificationStatus(orderId) {
    // 这里应该从验证队列中获取订单状态
    // 暂时返回模拟数据
    return {
      status: 'PENDING_VERIFICATION',
      message: '等待UPI转账完成',
      transferInfo: {
        beneficiaryName: 'RAHUL KUMAR',
        beneficiaryUPI: 'rahul.kumar@hdfc',
        amount: 1000
      }
    };
  }

  /**
   * 手动验证转账
   * @param {string} orderId 订单ID
   * @param {Object} verificationData 验证数据
   * @returns {Promise<Object>} 验证结果
   */
  async manualVerification(orderId, verificationData) {
    try {
      const { utrNumber, transferAmount, transferDate } = verificationData;
      
      // 验证UTR号码和转账信息
      const isValid = await this.validateTransferDetails(utrNumber, transferAmount, transferDate);
      
      if (isValid) {
        // 手动完成订单
        await this.completeOrder(orderId, {
          completed: true,
          amount: transferAmount,
          utrNumber: utrNumber,
          completedAt: transferDate
        });
        
        return {
          success: true,
          message: '手动验证成功，订单已完成'
        };
      } else {
        return {
          success: false,
          error: '验证信息不匹配，请检查后重试'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || '手动验证失败'
      };
    }
  }

  /**
   * 验证转账详情
   * @param {string} utrNumber UTR号码
   * @param {number} amount 转账金额
   * @param {string} date 转账日期
   * @returns {Promise<boolean>} 验证结果
   */
  async validateTransferDetails(utrNumber, amount, date) {
    // 这里应该调用银行API验证UTR号码和转账详情
    // 暂时返回模拟验证结果
    return utrNumber && utrNumber.length >= 10 && amount > 0;
  }
}

module.exports = WakeupProvider;
