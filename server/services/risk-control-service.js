const Order = require('../models/order');
const Transaction = require('../models/transaction');
const User = require('../models/user');

/**
 * 风控服务
 * 提供交易风险检测、异常行为识别、风险评估等功能
 */
class RiskControlService {
  constructor() {
    this.riskRules = new Map();
    this.riskScores = new Map();
    this.suspiciousActivities = [];
    this.riskThresholds = {
      high: 80,
      medium: 50,
      low: 20
    };
    this.initializeRiskRules();
  }

  /**
   * 初始化风控规则
   */
  initializeRiskRules() {
    this.riskRules.set('TRANSACTION_FREQUENCY', {
      name: '交易频率异常',
      weight: 30,
      description: '检测异常的交易频率模式',
      enabled: true
    });

    this.riskRules.set('AMOUNT_ANOMALY', {
      name: '金额异常',
      weight: 25,
      description: '检测异常的交易金额',
      enabled: true
    });

    this.riskRules.set('GEOGRAPHIC_RISK', {
      name: '地理位置风险',
      weight: 20,
      description: '检测地理位置相关的风险',
      enabled: true
    });

    this.riskRules.set('DEVICE_FINGERPRINT', {
      name: '设备指纹异常',
      weight: 15,
      description: '检测设备指纹异常',
      enabled: true
    });

    this.riskRules.set('BEHAVIOR_PATTERN', {
      name: '行为模式异常',
      weight: 10,
      description: '检测异常的用户行为模式',
      enabled: true
    });
  }

  /**
   * 风险评估
   */
  async assessRisk(transactionData, userData) {
    try {
      const riskFactors = [];
      let totalRiskScore = 0;
      let maxPossibleScore = 0;

      // 交易频率风险评估
      const frequencyRisk = await this.assessTransactionFrequency(transactionData, userData);
      if (frequencyRisk.score > 0) {
        riskFactors.push(frequencyRisk);
        totalRiskScore += frequencyRisk.score * this.riskRules.get('TRANSACTION_FREQUENCY').weight;
      }
      maxPossibleScore += 100 * this.riskRules.get('TRANSACTION_FREQUENCY').weight;

      // 金额异常风险评估
      const amountRisk = await this.assessAmountAnomaly(transactionData, userData);
      if (amountRisk.score > 0) {
        riskFactors.push(amountRisk);
        totalRiskScore += amountRisk.score * this.riskRules.get('AMOUNT_ANOMALY').weight;
      }
      maxPossibleScore += 100 * this.riskRules.get('AMOUNT_ANOMALY').weight;

      // 计算综合风险分数
      const normalizedRiskScore = maxPossibleScore > 0 ? (totalRiskScore / maxPossibleScore) * 100 : 0;
      
      // 确定风险等级
      const riskLevel = this.determineRiskLevel(normalizedRiskScore);
      
      // 生成风险评估结果
      const riskAssessment = {
        transactionId: transactionData.transactionId || 'N/A',
        userId: userData.userId || 'N/A',
        riskScore: Math.round(normalizedRiskScore * 100) / 100,
        riskLevel,
        riskFactors,
        recommendations: this.generateRecommendations(riskLevel, riskFactors),
        timestamp: new Date(),
        decision: this.makeRiskDecision(riskLevel, normalizedRiskScore)
      };

      // 存储风险评估结果
      this.riskScores.set(transactionData.transactionId || Date.now(), riskAssessment);

      return riskAssessment;

    } catch (error) {
      console.error('风险评估失败:', error);
      throw new Error('风险评估服务异常');
    }
  }

  /**
   * 评估交易频率风险
   */
  async assessTransactionFrequency(transactionData, userData) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 统计最近1小时和1天的交易次数
      const hourlyCount = await Transaction.countDocuments({
        userId: userData.userId,
        createdAt: { $gte: oneHourAgo }
      });

      const dailyCount = await Transaction.countDocuments({
        userId: userData.userId,
        createdAt: { $gte: oneDayAgo }
      });

      let score = 0;
      let details = { hourlyCount, dailyCount };

      // 1小时内交易超过10次
      if (hourlyCount > 10) {
        score += 40;
        details.hourlyRisk = 'HIGH';
      } else if (hourlyCount > 5) {
        score += 20;
        details.hourlyRisk = 'MEDIUM';
      }

      // 1天内交易超过50次
      if (dailyCount > 50) {
        score += 30;
        details.dailyRisk = 'HIGH';
      } else if (dailyCount > 20) {
        score += 15;
        details.dailyRisk = 'MEDIUM';
      }

      return {
        rule: 'TRANSACTION_FREQUENCY',
        score: Math.min(score, 100),
        details,
        description: `1小时内交易${hourlyCount}次，1天内交易${dailyCount}次`
      };

    } catch (error) {
      console.error('交易频率风险评估失败:', error);
      return { rule: 'TRANSACTION_FREQUENCY', score: 0, details: {}, description: '评估失败' };
    }
  }

  /**
   * 评估金额异常风险
   */
  async assessAmountAnomaly(transactionData, userData) {
    try {
      const amount = transactionData.amount || 0;
      let score = 0;
      let details = { amount };

      // 获取用户历史交易统计
      const userTransactions = await Transaction.find({
        userId: userData.userId,
        status: 'SUCCESS'
      }).sort({ createdAt: -1 }).limit(100);

      if (userTransactions.length > 0) {
        const amounts = userTransactions.map(t => t.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const maxAmount = Math.max(...amounts);

        details.avgAmount = avgAmount;
        details.maxAmount = maxAmount;

        // 金额超过历史平均值的3倍
        if (amount > avgAmount * 3) {
          score += 50;
          details.amountRisk = 'HIGH';
        } else if (amount > avgAmount * 2) {
          score += 30;
          details.amountRisk = 'MEDIUM';
        }

        // 金额超过历史最大值的80%
        if (amount > maxAmount * 0.8) {
          score += 30;
          details.maxAmountRisk = 'HIGH';
        }

        // 首次大额交易
        if (amount > 1000000 && userTransactions.length < 10) {
          score += 20;
          details.firstTimeLargeAmount = true;
        }
      }

      return {
        rule: 'AMOUNT_ANOMALY',
        score: Math.min(score, 100),
        details,
        description: `交易金额${amount}卢比，与历史模式对比`
      };

    } catch (error) {
      console.error('金额异常风险评估失败:', error);
      return { rule: 'AMOUNT_ANOMALY', score: 0, details: {}, description: '评估失败' };
    }
  }

  /**
   * 确定风险等级
   */
  determineRiskLevel(riskScore) {
    if (riskScore >= this.riskThresholds.high) {
      return 'HIGH';
    } else if (riskScore >= this.riskThresholds.medium) {
      return 'MEDIUM';
    } else if (riskScore >= this.riskThresholds.low) {
      return 'LOW';
    } else {
      return 'MINIMAL';
    }
  }

  /**
   * 生成风险建议
   */
  generateRecommendations(riskLevel, riskFactors) {
    const recommendations = [];

    if (riskLevel === 'HIGH') {
      recommendations.push({
        priority: 'IMMEDIATE',
        action: 'BLOCK_TRANSACTION',
        description: '立即阻止交易，需要人工审核'
      });
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push({
        priority: 'HIGH',
        action: 'REQUIRE_ADDITIONAL_VERIFICATION',
        description: '要求额外的身份验证'
      });
    }

    return recommendations;
  }

  /**
   * 做出风险决策
   */
  makeRiskDecision(riskLevel, riskScore) {
    if (riskLevel === 'HIGH') {
      return {
        action: 'BLOCK',
        reason: '高风险交易，需要人工审核',
        requiresApproval: true
      };
    } else if (riskLevel === 'MEDIUM') {
      return {
        action: 'REVIEW',
        reason: '中等风险，建议人工审核',
        requiresApproval: false
      };
    } else {
      return {
        action: 'ALLOW',
        reason: '低风险，可以自动通过',
        requiresApproval: false
      };
    }
  }

  /**
   * 记录可疑活动
   */
  recordSuspiciousActivity(activity) {
    this.suspiciousActivities.push({
      ...activity,
      timestamp: new Date()
    });

    // 限制记录数量
    if (this.suspiciousActivities.length > 1000) {
      this.suspiciousActivities = this.suspiciousActivities.slice(-1000);
    }
  }

  /**
   * 获取可疑活动列表
   */
  getSuspiciousActivities(limit = 100) {
    return this.suspiciousActivities.slice(-limit);
  }

  /**
   * 获取风险评估历史
   */
  getRiskAssessmentHistory(limit = 100) {
    const assessments = Array.from(this.riskScores.values());
    return assessments.slice(-limit);
  }

  /**
   * 获取风控统计信息
   */
  getRiskStatistics() {
    const assessments = Array.from(this.riskScores.values());
    
    const riskLevels = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      MINIMAL: 0
    };

    assessments.forEach(assessment => {
      riskLevels[assessment.riskLevel]++;
    });

    return {
      totalAssessments: assessments.length,
      riskLevels,
      averageRiskScore: assessments.length > 0 
        ? assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length 
        : 0,
      lastUpdated: new Date()
    };
  }
}

module.exports = RiskControlService;
