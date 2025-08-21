const v8 = require('v8');

class V8Optimizer {
  constructor() {
    this.originalFlags = process.execArgv.join(' ');
    this.optimizedFlags = [];
    this.heapSizeLimit = 512; // 默认512MB
    this.optimizationEnabled = false;
    
    this.initializeOptimization();
  }

  // 初始化优化
  initializeOptimization() {
    try {
      // 检查是否已经设置了V8标志
      if (process.execArgv.length > 0) {
        console.log('📋 当前V8标志:', this.originalFlags);
      }

      // 应用优化参数
      this.applyOptimizationFlags();
      
    } catch (error) {
      console.error('❌ V8优化初始化失败:', error.message);
    }
  }

  // 应用优化标志
  applyOptimizationFlags() {
    try {
      const flags = [
        // 限制堆内存大小
        `--max-old-space-size=${this.heapSizeLimit}`,
        
        // 优化垃圾回收
        '--max-semi-space-size=32',
        '--initial-heap-size=256',
        
        // 优化内存分配
        '--optimize-for-size',
        '--gc-interval=100',
        
        // 限制代码缓存
        '--max-code-cache-size=64',
        
        // 优化字符串处理
        '--string-slice-copy-cache-size=32',
        
        // 限制外部内存
        '--max-external-memory-size=128',
        
        // 优化数组缓冲区
        '--max-array-buffer-size=64'
      ];

      // 应用每个标志
      for (const flag of flags) {
        try {
          v8.setFlagsFromString(flag);
          this.optimizedFlags.push(flag);
        } catch (error) {
          console.warn(`⚠️ 无法设置标志 ${flag}:`, error.message);
        }
      }

      this.optimizationEnabled = true;
      console.log('✅ V8优化参数应用成功');
      console.log('📋 已应用的标志:', this.optimizedFlags.join(' '));

    } catch (error) {
      console.error('❌ 应用V8优化标志失败:', error.message);
    }
  }

  // 动态调整堆内存限制
  adjustHeapSizeLimit(newLimitMB) {
    try {
      const flag = `--max-old-space-size=${newLimitMB}`;
      v8.setFlagsFromString(flag);
      
      // 更新当前限制
      this.heapSizeLimit = newLimitMB;
      
      // 更新标志列表
      const existingIndex = this.optimizedFlags.findIndex(f => f.includes('--max-old-space-size'));
      if (existingIndex !== -1) {
        this.optimizedFlags[existingIndex] = flag;
      } else {
        this.optimizedFlags.push(flag);
      }
      
      console.log(`✅ 堆内存限制已调整为 ${newLimitMB}MB`);
      return true;
      
    } catch (error) {
      console.error('❌ 调整堆内存限制失败:', error.message);
      return false;
    }
  }

  // 获取当前V8统计信息
  getV8Stats() {
    try {
      const heapStats = v8.getHeapStatistics();
      const heapSpaceStats = v8.getHeapSpaceStatistics();
      
      return {
        heap: {
          heapSizeLimit: this.formatBytes(heapStats.heap_size_limit),
          totalAvailableSize: this.formatBytes(heapStats.total_available_size),
          usedHeapSize: this.formatBytes(heapStats.used_heap_size),
          totalPhysicalSize: this.formatBytes(heapStats.total_physical_size),
          heapUsedPercent: Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 10000) / 100
        },
        spaces: heapSpaceStats.map(space => ({
          name: space.space_name,
          size: this.formatBytes(space.space_size),
          used: this.formatBytes(space.space_used_size),
          available: this.formatBytes(space.space_available_size),
          physical: this.formatBytes(space.physical_space_size),
          usagePercent: Math.round((space.space_used_size / space.space_size) * 10000) / 100
        })),
        optimization: {
          enabled: this.optimizationEnabled,
          currentHeapLimit: `${this.heapSizeLimit}MB`,
          appliedFlags: this.optimizedFlags.length
        }
      };
    } catch (error) {
      console.error('❌ 获取V8统计信息失败:', error.message);
      return null;
    }
  }

  // 获取内存使用建议
  getMemoryAdvice() {
    try {
      const stats = this.getV8Stats();
      if (!stats) return [];

      const advice = [];
      
      // 检查堆内存使用率
      if (stats.heap.heapUsedPercent > 90) {
        advice.push({
          priority: 'CRITICAL',
          type: 'HEAP_USAGE',
          message: '堆内存使用率过高',
          current: `${stats.heap.heapUsedPercent}%`,
          recommendation: '立即进行垃圾回收或增加堆内存限制',
          action: 'increase-heap-limit'
        });
      } else if (stats.heap.heapUsedPercent > 80) {
        advice.push({
          priority: 'HIGH',
          type: 'HEAP_USAGE',
          message: '堆内存使用率较高',
          current: `${stats.heap.heapUsedPercent}%`,
          recommendation: '监控内存使用，考虑优化代码',
          action: 'monitor-usage'
        });
      }

      // 检查各个空间的使用情况
      for (const space of stats.spaces) {
        if (space.usagePercent > 95) {
          advice.push({
            priority: 'HIGH',
            type: 'SPACE_USAGE',
            message: `${space.name} 空间使用率过高`,
            current: `${space.usagePercent}%`,
            recommendation: `优化 ${space.name} 空间的使用`,
            action: 'optimize-space-usage'
          });
        }
      }

      // 检查堆内存限制是否合理
      const currentLimitMB = parseInt(stats.heap.heapSizeLimit);
      if (currentLimitMB < 256) {
        advice.push({
          priority: 'MEDIUM',
          type: 'HEAP_LIMIT',
          message: '堆内存限制可能过低',
          current: `${currentLimitMB}MB`,
          recommendation: '考虑增加堆内存限制以提高性能',
          action: 'increase-heap-limit'
        });
      } else if (currentLimitMB > 2048) {
        advice.push({
          priority: 'MEDIUM',
          type: 'HEAP_LIMIT',
          message: '堆内存限制可能过高',
          current: `${currentLimitMB}MB`,
          recommendation: '考虑减少堆内存限制以节省系统资源',
          action: 'decrease-heap-limit'
        });
      }

      return advice;
      
    } catch (error) {
      console.error('❌ 获取内存建议失败:', error.message);
      return [];
    }
  }

  // 执行V8优化
  async performV8Optimization() {
    try {
      const startTime = Date.now();
      const startStats = this.getV8Stats();
      
      if (!startStats) {
        throw new Error('无法获取初始V8统计信息');
      }

      // 1. 调整堆内存限制（如果需要）
      const advice = this.getMemoryAdvice();
      const heapAdvice = advice.find(a => a.action === 'increase-heap-limit');
      
      if (heapAdvice && startStats.heap.heapUsedPercent > 85) {
        const newLimit = Math.min(1024, this.heapSizeLimit * 1.5); // 增加50%，最大1GB
        this.adjustHeapSizeLimit(Math.round(newLimit));
      }

      // 2. 应用额外的优化标志
      const additionalFlags = [
        '--optimize-for-size',
        '--gc-interval=50'
      ];

      for (const flag of additionalFlags) {
        try {
          v8.setFlagsFromString(flag);
          if (!this.optimizedFlags.includes(flag)) {
            this.optimizedFlags.push(flag);
          }
        } catch (error) {
          // 忽略无法设置的标志
        }
      }

      // 3. 等待优化生效
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. 获取优化后的统计信息
      const endTime = Date.now();
      const endStats = this.getV8Stats();

      return {
        success: true,
        duration: endTime - startTime,
        before: startStats,
        after: endStats,
        optimizations: this.optimizedFlags,
        advice: this.getMemoryAdvice()
      };

    } catch (error) {
      console.error('❌ V8优化执行失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 重置V8参数
  resetV8Flags() {
    try {
      // 注意：Node.js不允许在运行时完全重置V8标志
      // 但我们可以恢复到一些基本设置
      const basicFlags = [
        '--max-old-space-size=512',
        '--max-semi-space-size=32'
      ];

      this.optimizedFlags = basicFlags;
      
      for (const flag of basicFlags) {
        try {
          v8.setFlagsFromString(flag);
        } catch (error) {
          console.warn(`⚠️ 无法重置标志 ${flag}:`, error.message);
        }
      }

      console.log('✅ V8参数已重置为基本设置');
      return true;
      
    } catch (error) {
      console.error('❌ 重置V8参数失败:', error.message);
      return false;
    }
  }

  // 获取优化报告
  getOptimizationReport() {
    const stats = this.getV8Stats();
    const advice = this.getMemoryAdvice();
    
    return {
      timestamp: new Date(),
      v8Stats: stats,
      optimization: {
        enabled: this.optimizationEnabled,
        appliedFlags: this.optimizedFlags,
        currentHeapLimit: `${this.heapSizeLimit}MB`,
        originalFlags: this.originalFlags
      },
      advice: advice,
      summary: {
        totalAdvice: advice.length,
        criticalAdvice: advice.filter(a => a.priority === 'CRITICAL').length,
        highPriorityAdvice: advice.filter(a => a.priority === 'HIGH').length
      }
    };
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

module.exports = V8Optimizer;
