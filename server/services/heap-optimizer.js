const v8 = require('v8');
const os = require('os');

class HeapOptimizer {
  constructor() {
    this.heapThreshold = 80; // 堆内存使用率阈值
    this.optimizationInterval = 60000; // 1分钟优化一次
    this.heapHistory = [];
    this.maxHistoryLength = 50;
    this.objectTracker = new Map(); // 跟踪对象创建
    this.leakPatterns = new Map(); // 跟踪泄漏模式
    this.optimizationStats = {
      totalOptimizations: 0,
      totalMemoryFreed: 0,
      lastOptimization: null
    };
    
    this.startOptimization();
  }

  // 获取详细的堆内存信息
  getDetailedHeapInfo() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const heapSpaceStats = v8.getHeapSpaceStatistics();
    
    return {
      basic: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      v8: {
        heapSizeLimit: heapStats.heap_size_limit,
        totalAvailableSize: heapStats.total_available_size,
        usedHeapSize: heapStats.used_heap_size,
        totalPhysicalSize: heapStats.total_physical_size,
        totalAvailableSize: heapStats.total_available_size,
        heapUsedPercent: Math.round((heapStats.used_heap_size / heapStats.heap_size_limit) * 10000) / 100
      },
      spaces: heapSpaceStats.map(space => ({
        name: space.space_name,
        size: space.space_size,
        used: space.space_used_size,
        available: space.space_available_size,
        physical: space.physical_space_size
      }))
    };
  }

  // 跟踪对象创建
  trackObjectCreation(objectId, type, size, stack) {
    const timestamp = Date.now();
    
    this.objectTracker.set(objectId, {
      type,
      size,
      stack: stack ? stack.slice(0, 3).join('\n') : 'unknown',
      createdAt: timestamp,
      lastAccess: timestamp,
      accessCount: 1
    });
  }

  // 跟踪对象访问
  trackObjectAccess(objectId) {
    const obj = this.objectTracker.get(objectId);
    if (obj) {
      obj.lastAccess = Date.now();
      obj.accessCount++;
    }
  }

  // 跟踪对象销毁
  trackObjectDestruction(objectId) {
    const obj = this.objectTracker.get(objectId);
    if (obj) {
      const lifetime = Date.now() - obj.createdAt;
      this.recordObjectLifetime(obj.type, lifetime, obj.size);
      this.objectTracker.delete(objectId);
    }
  }

  // 记录对象生命周期统计
  recordObjectLifetime(type, lifetime, size) {
    if (!this.leakPatterns.has(type)) {
      this.leakPatterns.set(type, {
        totalCount: 0,
        totalLifetime: 0,
        totalSize: 0,
        avgLifetime: 0,
        maxLifetime: 0,
        minLifetime: Infinity
      });
    }

    const pattern = this.leakPatterns.get(type);
    pattern.totalCount++;
    pattern.totalLifetime += lifetime;
    pattern.totalSize += size;
    pattern.avgLifetime = pattern.totalLifetime / pattern.totalCount;
    pattern.maxLifetime = Math.max(pattern.maxLifetime, lifetime);
    pattern.minLifetime = Math.min(pattern.minLifetime, lifetime);
  }

  // 检测堆内存泄漏模式
  detectHeapLeakPatterns() {
    const now = Date.now();
    const suspiciousObjects = [];
    const leakThreshold = 5 * 60 * 1000; // 5分钟

    for (const [id, obj] of this.objectTracker.entries()) {
      const age = now - obj.createdAt;
      const lastAccessAge = now - obj.lastAccess;
      
      // 检查长时间未访问的对象
      if (lastAccessAge > leakThreshold) {
        suspiciousObjects.push({
          id,
          type: obj.type,
          age: age,
          lastAccessAge: lastAccessAge,
          size: obj.size,
          stack: obj.stack
        });
      }
    }

    return suspiciousObjects;
  }

  // 分析堆内存使用趋势
  analyzeHeapTrends() {
    if (this.heapHistory.length < 3) return null;

    const recent = this.heapHistory.slice(-10);
    const trends = {
      growth: 0,
      volatility: 0,
      peakUsage: 0,
      avgUsage: 0
    };

    // 计算增长率
    if (recent.length >= 2) {
      const first = recent[0].heapUsed;
      const last = recent[recent.length - 1].heapUsed;
      trends.growth = ((last - first) / first) * 100;
    }

    // 计算波动性
    const usages = recent.map(h => h.heapUsed);
    const avg = usages.reduce((a, b) => a + b, 0) / usages.length;
    trends.avgUsage = avg;
    trends.peakUsage = Math.max(...usages);
    
    const variance = usages.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / usages.length;
    trends.volatility = Math.sqrt(variance);

    return trends;
  }

  // 执行堆内存优化
  async performHeapOptimization() {
    const startTime = Date.now();
    const startMem = this.getDetailedHeapInfo();
    const optimizations = [];

    try {
      // 1. 清理长时间未访问的对象
      const suspiciousObjects = this.detectHeapLeakPatterns();
      if (suspiciousObjects.length > 0) {
        const cleanedCount = await this.cleanupSuspiciousObjects(suspiciousObjects);
        optimizations.push(`清理了 ${cleanedCount} 个可疑对象`);
      }

      // 2. 优化V8堆内存
      const v8Optimized = this.optimizeV8Heap();
      if (v8Optimized) {
        optimizations.push('V8堆内存优化完成');
      }

      // 3. 清理对象跟踪器
      this.cleanupObjectTracker();

      // 4. 记录优化结果
      const endTime = Date.now();
      const endMem = this.getDetailedHeapInfo();
      const freedMemory = startMem.basic.heapUsed - endMem.basic.heapUsed;

      this.optimizationStats.totalOptimizations++;
      this.optimizationStats.totalMemoryFreed += freedMemory;
      this.optimizationStats.lastOptimization = new Date();

      return {
        success: true,
        optimizations,
        freedMemory,
        duration: endTime - startTime,
        before: startMem.basic.heapUsedPercent,
        after: endMem.basic.heapUsedPercent
      };

    } catch (error) {
      console.error('堆内存优化失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 清理可疑对象
  async cleanupSuspiciousObjects(suspiciousObjects) {
    let cleanedCount = 0;
    
    for (const obj of suspiciousObjects) {
      // 对于某些类型的对象，尝试强制清理
      if (obj.type === 'cache' || obj.type === 'buffer') {
        this.objectTracker.delete(obj.id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // 优化V8堆内存
  optimizeV8Heap() {
    try {
      // 设置更激进的GC参数
      v8.setFlagsFromString('--max-old-space-size=4096');
      v8.setFlagsFromString('--max-semi-space-size=64');
      v8.setFlagsFromString('--initial-heap-size=512');
      
      return true;
    } catch (error) {
      console.warn('V8堆内存优化失败:', error.message);
      return false;
    }
  }

  // 清理对象跟踪器
  cleanupObjectTracker() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30分钟

    for (const [id, obj] of this.objectTracker.entries()) {
      if (now - obj.createdAt > maxAge) {
        this.objectTracker.delete(id);
      }
    }
  }

  // 记录堆内存历史
  recordHeapHistory() {
    const heapInfo = this.getDetailedHeapInfo();
    const timestamp = new Date();

    this.heapHistory.push({
      timestamp,
      heapUsed: heapInfo.basic.heapUsed,
      heapTotal: heapInfo.basic.heapTotal,
      heapUsedPercent: heapInfo.basic.heapUsedPercent,
      external: heapInfo.basic.external
    });

    // 保持历史记录长度
    if (this.heapHistory.length > this.maxHistoryLength) {
      this.heapHistory.shift();
    }
  }

  // 获取优化建议
  getOptimizationSuggestions() {
    const heapInfo = this.getDetailedHeapInfo();
    const trends = this.analyzeHeapTrends();
    const suggestions = [];

    // 基于当前使用率
    if (heapInfo.basic.heapUsedPercent > 90) {
      suggestions.push({
        priority: 'HIGH',
        type: 'IMMEDIATE',
        message: '堆内存使用率过高，建议立即进行垃圾回收',
        action: 'force-gc'
      });
    } else if (heapInfo.basic.heapUsedPercent > 80) {
      suggestions.push({
        priority: 'MEDIUM',
        type: 'SCHEDULED',
        message: '堆内存使用率较高，建议定期优化',
        action: 'scheduled-optimization'
      });
    }

    // 基于趋势分析
    if (trends && trends.growth > 5) {
      suggestions.push({
        priority: 'HIGH',
        type: 'INVESTIGATION',
        message: `堆内存持续增长 ${trends.growth.toFixed(2)}%，可能存在内存泄漏`,
        action: 'leak-investigation'
      });
    }

    // 基于对象跟踪
    const suspiciousCount = this.detectHeapLeakPatterns().length;
    if (suspiciousCount > 10) {
      suggestions.push({
        priority: 'MEDIUM',
        type: 'CLEANUP',
        message: `发现 ${suspiciousCount} 个可疑对象，建议清理`,
        action: 'object-cleanup'
      });
    }

    return suggestions;
  }

  // 获取完整的堆内存报告
  getHeapReport() {
    const heapInfo = this.getDetailedHeapInfo();
    const trends = this.analyzeHeapTrends();
    const suggestions = this.getOptimizationSuggestions();
    const suspiciousObjects = this.detectHeapLeakPatterns();

    return {
      timestamp: new Date(),
      current: {
        heapUsed: this.formatBytes(heapInfo.basic.heapUsed),
        heapTotal: this.formatBytes(heapInfo.basic.heapTotal),
        heapUsedPercent: heapInfo.basic.heapUsedPercent,
        external: this.formatBytes(heapInfo.basic.external)
      },
      trends: trends ? {
        growth: `${trends.growth.toFixed(2)}%`,
        volatility: this.formatBytes(trends.volatility),
        peakUsage: this.formatBytes(trends.peakUsage),
        avgUsage: this.formatBytes(trends.avgUsage)
      } : null,
      objectTracking: {
        totalTracked: this.objectTracker.size,
        suspiciousCount: suspiciousObjects.length,
        leakPatterns: Object.fromEntries(
          Array.from(this.leakPatterns.entries()).map(([type, stats]) => [
            type,
            {
              count: stats.totalCount,
              avgLifetime: `${(stats.avgLifetime / 1000).toFixed(2)}s`,
              totalSize: this.formatBytes(stats.totalSize)
            }
          ])
        )
      },
      optimization: {
        suggestions,
        stats: this.optimizationStats
      }
    };
  }

  // 启动优化服务
  startOptimization() {
    setInterval(() => {
      this.recordHeapHistory();
      
      // 如果堆内存使用率超过阈值，自动优化
      const heapInfo = this.getDetailedHeapInfo();
      if (heapInfo.basic.heapUsedPercent > this.heapThreshold) {
        console.log(`🔄 堆内存使用率 ${heapInfo.basic.heapUsedPercent}% 超过阈值，开始自动优化...`);
        this.performHeapOptimization().then(result => {
          if (result.success) {
            console.log(`✅ 堆内存自动优化完成: ${result.optimizations.join(', ')}`);
          }
        });
      }
    }, this.optimizationInterval);

    console.log('🚀 堆内存优化服务已启动');
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

module.exports = HeapOptimizer;
