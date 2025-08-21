const v8 = require('v8');

class GCOptimizer {
  constructor() {
    this.currentGCMode = 'balanced'; // balanced, aggressive, conservative
    this.gcStats = {
      totalCollections: 0,
      totalTime: 0,
      lastGCTime: 0,
      avgGCTime: 0,
      collectionsPerMinute: 0,
      lastCollectionTime: 0
    };
    this.optimizationInterval = 30000; // 30秒
    this.gcInterval = 10000; // 10秒
    
    this.startOptimization();
  }

  // 设置GC模式
  setGCMode(mode) {
    try {
      switch (mode) {
        case 'aggressive':
          this.setAggressiveGC();
          break;
        case 'balanced':
          this.setBalancedGC();
          break;
        case 'conservative':
          this.setConservativeGC();
          break;
        default:
          throw new Error(`未知的GC模式: ${mode}`);
      }
      
      this.currentGCMode = mode;
      console.log(`✅ GC模式已设置为: ${mode}`);
      return true;
      
    } catch (error) {
      console.error('❌ 设置GC模式失败:', error.message);
      return false;
    }
  }

  // 设置激进GC模式
  setAggressiveGC() {
    const flags = [
      '--gc-interval=50',           // 更频繁的GC
      '--max-semi-space-size=16',   // 减少新生代大小
      '--initial-heap-size=128',    // 较小的初始堆大小
      '--optimize-for-size',        // 优化内存大小
      '--gc-interval=25',           // 非常频繁的GC
      '--max-old-space-size=1024',  // 限制老生代大小
      '--gc-interval=10'            // 极频繁的GC
    ];

    this.applyGCFlags(flags);
  }

  // 设置平衡GC模式
  setBalancedGC() {
    const flags = [
      '--gc-interval=100',          // 适中的GC频率
      '--max-semi-space-size=32',   // 标准新生代大小
      '--initial-heap-size=256',    // 标准初始堆大小
      '--max-old-space-size=2048'   // 标准老生代大小
    ];

    this.applyGCFlags(flags);
  }

  // 设置保守GC模式
  setConservativeGC() {
    const flags = [
      '--gc-interval=500',          // 较低的GC频率
      '--max-semi-space-size=64',   // 较大的新生代大小
      '--initial-heap-size=512',    // 较大的初始堆大小
      '--max-old-space-size=4096'   // 较大的老生代大小
    ];

    this.applyGCFlags(flags);
  }

  // 应用GC标志
  applyGCFlags(flags) {
    for (const flag of flags) {
      try {
        v8.setFlagsFromString(flag);
      } catch (error) {
        console.warn(`⚠️ 无法设置GC标志 ${flag}:`, error.message);
      }
    }
  }

  // 手动触发垃圾回收
  async forceGarbageCollection() {
    try {
      if (!global.gc) {
        throw new Error('垃圾回收不可用，请使用 --expose-gc 启动参数');
      }

      const startTime = Date.now();
      const startMem = process.memoryUsage();
      
      // 触发垃圾回收
      global.gc();
      
      // 等待GC完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = Date.now();
      const endMem = process.memoryUsage();
      
      // 计算GC结果
      const gcTime = endTime - startTime;
      const freedMemory = startMem.heapUsed - endMem.heapUsed;
      const freedPercent = (freedMemory / startMem.heapUsed) * 100;
      
      // 更新统计
      this.updateGCStats(gcTime);
      
      return {
        success: true,
        gcTime: gcTime,
        freedMemory: this.formatBytes(freedMemory),
        freedPercent: freedPercent.toFixed(2),
        before: {
          heapUsed: this.formatBytes(startMem.heapUsed),
          heapTotal: this.formatBytes(startMem.heapTotal),
          heapUsedPercent: Math.round((startMem.heapUsed / startMem.heapTotal) * 10000) / 100
        },
        after: {
          heapUsed: this.formatBytes(endMem.heapUsed),
          heapTotal: this.formatBytes(endMem.heapTotal),
          heapUsedPercent: Math.round((endMem.heapUsed / endMem.heapTotal) * 10000) / 100
        }
      };
      
    } catch (error) {
      console.error('❌ 强制垃圾回收失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 更新GC统计
  updateGCStats(gcTime) {
    this.gcStats.totalCollections++;
    this.gcStats.totalTime += gcTime;
    this.gcStats.lastGCTime = gcTime;
    this.gcStats.avgGCTime = this.gcStats.totalTime / this.gcStats.totalCollections;
    this.gcStats.lastCollectionTime = Date.now();
    
    // 计算每分钟的GC次数
    const now = Date.now();
    const timeDiff = now - this.gcStats.lastCollectionTime;
    if (timeDiff > 0) {
      this.gcStats.collectionsPerMinute = (60000 / timeDiff) * this.gcStats.totalCollections;
    }
  }

  // 智能GC触发
  async intelligentGC() {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      let shouldTriggerGC = false;
      let reason = '';
      
      // 基于内存使用率决定是否触发GC
      if (heapUsedPercent > 90) {
        shouldTriggerGC = true;
        reason = '堆内存使用率过高 (>90%)';
      } else if (heapUsedPercent > 80 && this.gcStats.lastCollectionTime < Date.now() - 60000) {
        shouldTriggerGC = true;
        reason = '堆内存使用率较高 (>80%) 且距离上次GC超过1分钟';
      } else if (this.gcStats.lastCollectionTime < Date.now() - 300000) {
        shouldTriggerGC = true;
        reason = '距离上次GC超过5分钟';
      }
      
      if (shouldTriggerGC) {
        console.log(`🧠 智能GC触发: ${reason}`);
        return await this.forceGarbageCollection();
      } else {
        return {
          success: true,
          message: '无需触发GC',
          reason: `当前堆内存使用率: ${heapUsedPercent.toFixed(2)}%`
        };
      }
      
    } catch (error) {
      console.error('❌ 智能GC失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取GC统计
  getGCStats() {
    return {
      mode: this.currentGCMode,
      stats: {
        ...this.gcStats,
        avgGCTime: Math.round(this.gcStats.avgGCTime * 100) / 100,
        collectionsPerMinute: Math.round(this.gcStats.collectionsPerMinute * 100) / 100
      },
      recommendations: this.getGCRecommendations()
    };
  }

  // 获取GC建议
  getGCRecommendations() {
    const recommendations = [];
    
    // 基于GC频率的建议
    if (this.gcStats.collectionsPerMinute > 10) {
      recommendations.push({
        priority: 'HIGH',
        type: 'GC_FREQUENCY',
        message: 'GC频率过高，可能存在内存泄漏',
        action: 'investigate-memory-leaks',
        current: `${this.gcStats.collectionsPerMinute.toFixed(2)} 次/分钟`
      });
    }
    
    // 基于GC时间的建议
    if (this.gcStats.avgGCTime > 100) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'GC_DURATION',
        message: 'GC耗时较长，考虑优化GC参数',
        action: 'optimize-gc-params',
        current: `${this.gcStats.avgGCTime.toFixed(2)}ms`
      });
    }
    
    // 基于当前模式的建议
    if (this.currentGCMode === 'conservative' && this.gcStats.lastCollectionTime < Date.now() - 600000) {
      recommendations.push({
        priority: 'LOW',
        type: 'GC_MODE',
        message: '当前为保守GC模式，可考虑切换到平衡模式',
        action: 'switch-to-balanced',
        current: this.currentGCMode
      });
    }
    
    return recommendations;
  }

  // 优化GC参数
  async optimizeGCParams() {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      let newMode = this.currentGCMode;
      
      // 基于内存使用情况选择最佳GC模式
      if (heapUsedPercent > 85) {
        newMode = 'aggressive';
      } else if (heapUsedPercent > 70) {
        newMode = 'balanced';
      } else {
        newMode = 'conservative';
      }
      
      if (newMode !== this.currentGCMode) {
        console.log(`🔄 自动调整GC模式: ${this.currentGCMode} -> ${newMode}`);
        this.setGCMode(newMode);
        
        // 等待模式切换生效
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          success: true,
          oldMode: this.currentGCMode,
          newMode: newMode,
          reason: `基于堆内存使用率 ${heapUsedPercent.toFixed(2)}% 自动调整`
        };
      } else {
        return {
          success: true,
          message: '当前GC模式已是最优',
          currentMode: this.currentGCMode
        };
      }
      
    } catch (error) {
      console.error('❌ 优化GC参数失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 启动优化服务
  startOptimization() {
    console.log('🚀 GC优化服务已启动');
    
    // 定期优化GC参数
    setInterval(async () => {
      await this.optimizeGCParams();
    }, this.optimizationInterval);
    
    // 定期智能GC
    setInterval(async () => {
      await this.intelligentGC();
    }, this.gcInterval);
  }

  // 停止优化服务
  stop() {
    console.log('🛑 GC优化服务已停止');
  }

  // 工具函数：格式化字节
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = GCOptimizer;
