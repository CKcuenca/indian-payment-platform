const PaymentConfig = require('../models/PaymentConfig');
const PaymentStats = require('../models/PaymentStats');

/**
 * 支付配置控制器
 */
class PaymentConfigController {
  
  /**
   * 获取所有支付配置
   */
  async getAllConfigs(req, res) {
    try {
      const configs = await PaymentConfig.find()
        .select('-provider.apiKey -provider.secretKey')
        .sort({ priority: 1, createdAt: -1 });
      
      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      console.error('获取支付配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取支付配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取单个支付配置
   */
  async getConfigById(req, res) {
    try {
      const { id } = req.params;
      const config = await PaymentConfig.findById(id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '支付配置不存在'
        });
      }
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('获取支付配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取支付配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 创建支付配置
   */
  async createConfig(req, res) {
    try {
      const configData = req.body;
      
      // 检查账户名称是否已存在
      const existingConfig = await PaymentConfig.findOne({ 
        accountName: configData.accountName 
      });
      
      if (existingConfig) {
        return res.status(400).json({
          success: false,
          message: '账户名称已存在'
        });
      }
      
      // 在创建前进行自定义验证
      if (configData.provider) {
        const providerName = configData.provider.name;
        const apiKey = configData.provider.apiKey;
        
        console.log(`🔍 创建验证 - provider: ${providerName}, apiKey: "${apiKey}"`);
        
        // 对于除 dhpay/unispay/passpay 外的支付商，apiKey 必填
        if (providerName && !['dhpay', 'unispay', 'passpay'].includes(providerName)) {
          if (!apiKey || apiKey.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: '创建支付配置失败',
              error: `API Key is required for ${providerName} provider`
            });
          }
        }
        // 对于 passpay，要求 payId 必填
        if (providerName === 'passpay') {
          const payId = configData.provider.payId;
          if (!payId || payId.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: '创建支付配置失败',
              error: 'payId is required for PassPay provider'
            });
          }
        }
        
        // 对于unispay，mchNo必须有值
        if (providerName === 'unispay') {
          const mchNo = configData.provider.mchNo;
          if (!mchNo || mchNo.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: '创建支付配置失败',
              error: 'Merchant Number is required for UniSpay provider'
            });
          }
        }
      }
      
      const config = new PaymentConfig(configData);
      await config.save();
      
      res.status(201).json({
        success: true,
        message: '支付配置创建成功',
        data: config
      });
    } catch (error) {
      console.error('创建支付配置失败:', error);
      res.status(500).json({
        success: false,
        message: '创建支付配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 更新支付配置
   */
  async updateConfig(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // 在更新前进行自定义验证
      console.log('🔍 接收到的更新数据:', JSON.stringify(updateData, null, 2));
      
      if (updateData.provider) {
        const providerName = updateData.provider.name;
        const apiKey = updateData.provider.apiKey;
        
        console.log(`🔍 控制器验证 - provider: ${providerName}, apiKey: "${apiKey}"`);
        
        // 对于除 dhpay/unispay/passpay 外的支付商，apiKey 必填
        if (providerName && !['dhpay', 'unispay', 'passpay'].includes(providerName)) {
          if (!apiKey || apiKey.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: '更新支付配置失败',
              error: `API Key is required for ${providerName} provider`
            });
          }
        }
        // 对于 passpay，要求 payId 必填
        if (providerName === 'passpay') {
          const payId = updateData.provider.payId;
          if (!payId || payId.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: '更新支付配置失败',
              error: 'payId is required for PassPay provider'
            });
          }
        }
        
        // 对于unispay，mchNo必须有值
        if (providerName === 'unispay') {
          const mchNo = updateData.provider.mchNo;
          if (!mchNo || mchNo.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: '更新支付配置失败',
              error: 'Merchant Number is required for UniSpay provider'
            });
          }
        }
      }
      
      const config = await PaymentConfig.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '支付配置不存在'
        });
      }
      
      res.json({
        success: true,
        message: '支付配置更新成功',
        data: config
      });
    } catch (error) {
      console.error('更新支付配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新支付配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 删除支付配置
   */
  async deleteConfig(req, res) {
    try {
      const { id } = req.params;
      
      const config = await PaymentConfig.findByIdAndDelete(id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '支付配置不存在'
        });
      }
      
      res.json({
        success: true,
        message: '支付配置删除成功'
      });
    } catch (error) {
      console.error('删除支付配置失败:', error);
      res.status(500).json({
        success: false,
        message: '删除支付配置失败',
        error: error.message
      });
    }
  }
  
  /**
   * 更新额度使用情况
   */
  async updateUsage(req, res) {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      
      const config = await PaymentConfig.findById(id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: '支付配置不存在'
        });
      }
      
      // 检查额度
      const limitCheck = config.checkLimit(amount);
      if (!limitCheck.valid) {
        return res.status(400).json({
          success: false,
          message: '额度不足',
          reason: limitCheck.reason
        });
      }
      
      // 更新使用额度
      await config.updateUsage(amount);
      
      res.json({
        success: true,
        message: '额度使用更新成功',
        data: {
          remainingDailyLimit: config.remainingDailyLimit,
          remainingMonthlyLimit: config.remainingMonthlyLimit
        }
      });
    } catch (error) {
      console.error('更新额度使用失败:', error);
      res.status(500).json({
        success: false,
        message: '更新额度使用失败',
        error: error.message
      });
    }
  }
  
  /**
   * 重置额度
   */
  async resetLimits(req, res) {
    try {
      const { type } = req.params; // daily 或 monthly
      
      let result;
      if (type === 'daily') {
        result = await PaymentConfig.resetDailyLimits();
      } else if (type === 'monthly') {
        result = await PaymentConfig.resetMonthlyLimits();
      } else {
        return res.status(400).json({
          success: false,
          message: '无效的重置类型'
        });
      }
      
      res.json({
        success: true,
        message: `${type}额度重置成功`,
        data: result
      });
    } catch (error) {
      console.error('重置额度失败:', error);
      res.status(500).json({
        success: false,
        message: '重置额度失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取支付统计数据
   */
  async getPaymentStats(req, res) {
    try {
      const { 
        paymentAccountId, 
        startDate, 
        endDate, 
        timeDimension = 'daily' 
      } = req.query;
      
      if (!paymentAccountId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const stats = await PaymentStats.getStatsByDateRange(
        paymentAccountId,
        start,
        end,
        timeDimension
      );
      
      const aggregatedStats = await PaymentStats.getAggregatedStats(
        paymentAccountId,
        start,
        end,
        timeDimension
      );
      
      res.json({
        success: true,
        data: {
          detailed: stats,
          aggregated: aggregatedStats
        }
      });
    } catch (error) {
      console.error('获取支付统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取支付统计失败',
        error: error.message
      });
    }
  }
  
  /**
   * 更新支付统计
   */
  async updatePaymentStats(req, res) {
    try {
      const { paymentAccountId, orderData } = req.body;
      
      if (!paymentAccountId || !orderData) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
      }
      
      // 获取或创建今日统计
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let stats = await PaymentStats.findOne({
        paymentAccountId,
        date: today,
        timeDimension: 'daily'
      });
      
      if (!stats) {
        stats = new PaymentStats({
          paymentAccountId,
          date: today,
          timeDimension: 'daily'
        });
      }
      
      // 更新统计
      await stats.updateStats(orderData);
      
      res.json({
        success: true,
        message: '支付统计更新成功',
        data: stats
      });
    } catch (error) {
      console.error('更新支付统计失败:', error);
      res.status(500).json({
        success: false,
        message: '更新支付统计失败',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentConfigController();
