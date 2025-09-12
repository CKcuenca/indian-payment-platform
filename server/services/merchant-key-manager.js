const crypto = require('crypto');
const Merchant = require('../models/merchant');

/**
 * 商户密钥管理服务
 * 为下游商户提供密钥生成、管理、验证功能
 */
class MerchantKeyManager {
  
  /**
   * 生成新的API密钥对
   * @param {string} merchantId - 商户ID
   * @returns {Object} 密钥对
   */
  static generateKeyPair(merchantId) {
    // 生成随机字符串
    const randomStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString(36);
    
    // API Key (公钥) - 可以在日志中显示
    const apiKey = `pk_${randomStr.substring(0, 8)}${merchantId.substring(-4)}${timestamp.substring(-4)}`;
    
    // Secret Key (私钥) - 用于签名验证，绝对保密
    const secretKey = `sk_${crypto.randomBytes(20).toString('hex')}`;
    
    return {
      apiKey,
      secretKey,
      createdAt: new Date(),
      status: 'ACTIVE'
    };
  }
  
  /**
   * 为商户重新生成密钥
   * @param {string} merchantId - 商户ID
   * @param {string} operatorId - 操作者ID (用于审计)
   * @returns {Object} 新的密钥对
   */
  static async regenerateKeys(merchantId, operatorId) {
    try {
      // 生成新密钥
      const newKeys = this.generateKeyPair(merchantId);
      
      // 备份旧密钥到历史记录
      const merchant = await Merchant.findOne({ merchantId });
      if (!merchant) {
        throw new Error('商户不存在');
      }
      
      const oldKeys = {
        apiKey: merchant.apiKey,
        secretKey: merchant.secretKey,
        deprecatedAt: new Date(),
        reason: 'KEY_REGENERATION'
      };
      
      // 更新商户密钥
      await Merchant.updateOne(
        { merchantId },
        {
          $set: {
            apiKey: newKeys.apiKey,
            secretKey: newKeys.secretKey,
            'security.lastKeyUpdate': new Date(),
            'security.keyUpdateBy': operatorId
          },
          $push: {
            'security.keyHistory': oldKeys
          }
        }
      );
      
      // 记录操作日志
      console.log(`🔑 商户 ${merchantId} 的密钥已重新生成 by ${operatorId}`);
      
      return {
        success: true,
        data: {
          apiKey: newKeys.apiKey,
          secretKey: newKeys.secretKey,
          merchantId,
          generatedAt: newKeys.createdAt
        }
      };
      
    } catch (error) {
      console.error('重新生成密钥失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 验证API密钥
   * @param {string} apiKey - API密钥
   * @returns {Object} 验证结果
   */
  static async validateApiKey(apiKey) {
    try {
      const merchant = await Merchant.findOne({ 
        apiKey, 
        status: 'ACTIVE' 
      });
      
      if (!merchant) {
        return {
          valid: false,
          error: 'API密钥无效或商户未激活'
        };
      }
      
      return {
        valid: true,
        merchant: {
          merchantId: merchant.merchantId,
          name: merchant.name,
          status: merchant.status
        }
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * 获取商户密钥信息（脱敏）
   * @param {string} merchantId - 商户ID
   * @returns {Object} 密钥信息
   */
  static async getMerchantKeyInfo(merchantId) {
    try {
      let merchant = await Merchant.findOne({ merchantId });
      if (!merchant) {
        console.log(`🔍 商户不存在，为merchantId ${merchantId} 创建默认商户记录`);
        
        // 自动创建商户记录
        const keyPair = this.generateKeyPair(merchantId);
        merchant = new Merchant({
          merchantId: merchantId,
          name: `商户_${merchantId}`,
          email: `${merchantId}@example.com`,
          status: 'ACTIVE',
          apiKey: keyPair.apiKey,
          secretKey: keyPair.secretKey,
          balance: 0,
          deposit: {
            fee: { percentage: 2, fixedAmount: 0 },
            limits: {
              minAmount: 100,
              maxAmount: 50000,
              dailyLimit: 100000,
              monthlyLimit: 1000000,
              singleTransactionLimit: 50000
            },
            usage: { dailyUsed: 0, monthlyUsed: 0, lastResetDate: new Date() }
          },
          withdrawal: {
            fee: { percentage: 3, fixedAmount: 5 },
            limits: {
              minAmount: 100,
              maxAmount: 50000,
              dailyLimit: 100000,
              monthlyLimit: 1000000,
              singleTransactionLimit: 50000
            },
            usage: { dailyUsed: 0, monthlyUsed: 0, lastResetDate: new Date() }
          },
          security: {
            lastKeyUpdate: new Date(),
            keyHistory: []
          }
        });
        
        await merchant.save();
        console.log(`✅ 已创建商户记录: ${merchantId}`);
      }
      
      return {
        merchantId: merchant.merchantId,
        merchantName: merchant.name,
        apiKey: merchant.apiKey,
        secretKey: this.maskSecretKey(merchant.secretKey),
        keyStatus: 'ACTIVE',
        lastUpdated: merchant.security?.lastKeyUpdate || merchant.updatedAt,
        keyHistory: merchant.security?.keyHistory?.length || 0
      };
      
    } catch (error) {
      console.error('获取密钥信息失败:', error);
      throw new Error(`获取密钥信息失败: ${error.message}`);
    }
  }
  
  /**
   * 脱敏处理私钥显示
   * @param {string} secretKey - 完整私钥
   * @returns {string} 脱敏后的私钥
   */
  static maskSecretKey(secretKey) {
    if (!secretKey || secretKey.length < 10) {
      return '***';
    }
    
    const start = secretKey.substring(0, 6);
    const end = secretKey.substring(secretKey.length - 4);
    const middle = '*'.repeat(secretKey.length - 10);
    
    return `${start}${middle}${end}`;
  }
  
  /**
   * 禁用商户密钥
   * @param {string} merchantId - 商户ID
   * @param {string} reason - 禁用原因
   * @param {string} operatorId - 操作者ID
   */
  static async disableMerchantKeys(merchantId, reason, operatorId) {
    try {
      await Merchant.updateOne(
        { merchantId },
        {
          $set: {
            'security.keyStatus': 'DISABLED',
            'security.disabledAt': new Date(),
            'security.disabledBy': operatorId,
            'security.disabledReason': reason
          }
        }
      );
      
      console.log(`🚫 商户 ${merchantId} 的密钥已被禁用: ${reason}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('禁用密钥失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 生成密钥下载格式
   * @param {string} merchantId - 商户ID
   * @returns {Object} 下载数据
   */
  static async generateKeyDownload(merchantId) {
    try {
      const merchant = await Merchant.findOne({ merchantId });
      if (!merchant) {
        throw new Error('商户不存在');
      }
      
      const downloadData = {
        merchantInfo: {
          merchantId: merchant.merchantId,
          merchantName: merchant.name,
          status: merchant.status
        },
        apiCredentials: {
          apiKey: merchant.apiKey,
          secretKey: merchant.secretKey,
          baseUrl: process.env.API_BASE_URL || 'https://cashgit.com',
          signatureAlgorithm: 'MD5'
        },
        endpoints: {
          payment: '/api/pay',
          payout: '/api/payout/create',
          query: '/api/query',
          balance: '/api/balance/query'
        },
        signatureExample: {
          note: '签名算法: 参数按ASCII排序后拼接&key=secretKey，然后MD5小写',
          example: 'amount=100.00&appid=MERCHANT_123&timestamp=1234567890&key=sk_your_secret_key'
        },
        generatedAt: new Date().toISOString(),
        downloadedBy: merchantId,
        securityNote: '请妥善保管您的密钥，不要泄露给任何第三方！'
      };
      
      return downloadData;
      
    } catch (error) {
      throw new Error(`生成下载数据失败: ${error.message}`);
    }
  }
}

module.exports = MerchantKeyManager;