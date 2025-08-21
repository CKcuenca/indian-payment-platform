const v8 = require('v8');

class HeapMemoryAdjuster {
  constructor() {
    this.currentLimit = 512; // 当前限制（MB）
    this.maxLimit = 2048;   // 最大限制（MB）
    this.minLimit = 256;    // 最小限制（MB）
  }

  // 获取当前堆内存统计
  getCurrentHeapStats() {
    try {
      const heapStats = v8.getHeapStatistics();
      const memUsage = process.memoryUsage();
      
      return {
        heapSizeLimit: this.formatBytes(heapStats.heap_size_limit),
        totalAvailableSize: this.formatBytes(heapStats.total_available_size),
        usedHeapSize: this.formatBytes(heapStats.used_heap_size),
        heapUsedPercent: Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 10000) / 100,
        currentLimit: `${this.currentLimit}MB`,
        rss: this.formatBytes(memUsage.rss),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        heapUsed: this.formatBytes(memUsage.heapUsed)
      };
    } catch (error) {
      console.error('获取堆内存统计失败:', error);
      return null;
    }
  }

  // 调整堆内存限制
  adjustHeapLimit(newLimitMB) {
    try {
      // 验证限制范围
      if (newLimitMB < this.minLimit || newLimitMB > this.maxLimit) {
        throw new Error(`堆内存限制必须在 ${this.minLimit}MB 到 ${this.maxLimit}MB 之间`);
      }

      // 应用新的限制
      const flag = `--max-old-space-size=${newLimitMB}`;
      v8.setFlagsFromString(flag);
      
      // 更新当前限制
      this.currentLimit = newLimitMB;
      
      console.log(`✅ 堆内存限制已从 ${this.currentLimit}MB 调整为 ${newLimitMB}MB`);
      
      // 等待调整生效
      return new Promise(resolve => {
        setTimeout(() => {
          const newStats = this.getCurrentHeapStats();
          console.log('📊 调整后的堆内存状态:', newStats);
          resolve({
            success: true,
            oldLimit: this.currentLimit,
            newLimit: newLimitMB,
            newStats
          });
        }, 2000);
      });
      
    } catch (error) {
      console.error('❌ 调整堆内存限制失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 智能调整堆内存限制
  async smartAdjustHeapLimit() {
    try {
      const currentStats = this.getCurrentHeapStats();
      if (!currentStats) {
        throw new Error('无法获取当前堆内存统计');
      }

      console.log('📊 当前堆内存状态:', currentStats);

      // 分析当前使用情况
      const heapUsedPercent = currentStats.heapUsedPercent;
      let recommendedLimit = this.currentLimit;

      if (heapUsedPercent > 90) {
        // 使用率过高，增加限制
        recommendedLimit = Math.min(this.maxLimit, this.currentLimit * 1.5);
        console.log(`🚨 堆内存使用率过高 (${heapUsedPercent}%)，建议增加到 ${recommendedLimit}MB`);
      } else if (heapUsedPercent > 80) {
        // 使用率较高，适度增加
        recommendedLimit = Math.min(this.maxLimit, this.currentLimit * 1.25);
        console.log(`⚠️ 堆内存使用率较高 (${heapUsedPercent}%)，建议增加到 ${recommendedLimit}MB`);
      } else if (heapUsedPercent < 50 && this.currentLimit > this.minLimit) {
        // 使用率较低，可以减少限制
        recommendedLimit = Math.max(this.minLimit, this.currentLimit * 0.8);
        console.log(`✅ 堆内存使用率较低 (${heapUsedPercent}%)，可以减少到 ${recommendedLimit}MB`);
      } else {
        console.log(`✅ 堆内存使用率正常 (${heapUsedPercent}%)，当前限制合适`);
        return {
          success: true,
          message: '当前堆内存限制合适，无需调整',
          currentStats
        };
      }

      // 执行调整
      if (recommendedLimit !== this.currentLimit) {
        return await this.adjustHeapLimit(Math.round(recommendedLimit));
      }

      return {
        success: true,
        message: '无需调整堆内存限制',
        currentStats
      };

    } catch (error) {
      console.error('❌ 智能调整堆内存限制失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 逐步增加堆内存限制
  async gradualIncreaseHeapLimit(targetLimitMB) {
    try {
      const steps = [];
      let currentLimit = this.currentLimit;
      
      while (currentLimit < targetLimitMB) {
        const nextLimit = Math.min(targetLimitMB, currentLimit * 1.25);
        console.log(`🔄 步骤 ${steps.length + 1}: 从 ${currentLimit}MB 增加到 ${nextLimit}MB`);
        
        const result = await this.adjustHeapLimit(Math.round(nextLimit));
        if (!result.success) {
          throw new Error(`步骤 ${steps.length + 1} 失败: ${result.error}`);
        }
        
        steps.push(result);
        currentLimit = nextLimit;
        
        // 等待调整生效
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      console.log(`🎉 堆内存限制已成功增加到 ${targetLimitMB}MB`);
      return {
        success: true,
        steps: steps.length,
        finalLimit: targetLimitMB
      };
      
    } catch (error) {
      console.error('❌ 逐步增加堆内存限制失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
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

// 主函数
const main = async () => {
  try {
    console.log('🚀 开始调整堆内存限制...');
    
    const adjuster = new HeapMemoryAdjuster();
    
    // 1. 显示当前状态
    console.log('\n📊 当前堆内存状态:');
    const currentStats = adjuster.getCurrentHeapStats();
    console.log(currentStats);
    
    // 2. 智能调整
    console.log('\n🧠 执行智能调整...');
    const smartResult = await adjuster.smartAdjustHeapLimit();
    console.log('智能调整结果:', smartResult);
    
    // 3. 如果建议增加，则逐步增加到1GB
    if (smartResult.success && smartResult.newLimit > adjuster.currentLimit) {
      console.log('\n📈 开始逐步增加到1GB...');
      const increaseResult = await adjuster.gradualIncreaseHeapLimit(1024);
      console.log('逐步增加结果:', increaseResult);
    }
    
    // 4. 显示最终状态
    console.log('\n📊 最终堆内存状态:');
    const finalStats = adjuster.getCurrentHeapStats();
    console.log(finalStats);
    
    console.log('\n✅ 堆内存调整完成！');
    
  } catch (error) {
    console.error('❌ 主函数执行失败:', error);
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = HeapMemoryAdjuster;
