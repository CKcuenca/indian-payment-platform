const os = require('os');
const v8 = require('v8');

class MemoryManager {
  constructor() {
    this.memoryThreshold = 85; // 内存使用率阈值
    this.leakDetectionInterval = 30000; // 30秒检测一次
    this.memoryHistory = [];
    this.maxHistoryLength = 100;
    this.leakThreshold = 0.1; // 10%的内存增长视为潜在泄漏
    this.largeObjects = new Map();
    this.gcStats = {
      totalCollections: 0,
      totalTime: 0,
      lastGCTime: 0
    };
    
    this.startMonitoring();
  }

  // 获取系统内存信息
  getSystemMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;

    return {
      total: this.formatBytes(totalMem),
      free: this.formatBytes(freeMem),
      used: this.formatBytes(usedMem),
      usagePercent: Math.round(usagePercent * 100) / 100
    };
  }

  // 获取Node.js进程内存信息
  getProcessMemoryInfo() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    return {
      rss: this.formatBytes(memUsage.rss),
      heapTotal: this.formatBytes(memUsage.heapTotal),
      heapUsed: this.formatBytes(memUsage.heapUsed),
      external: this.formatBytes(memUsage.external),
      arrayBuffers: this.formatBytes(memUsage.arrayBuffers),
      heapSizeLimit: this.formatBytes(heapStats.heap_size_limit),
      totalAvailableSize: this.formatBytes(heapStats.total_available_size),
      usedHeapSize: this.formatBytes(heapStats.used_heap_size),
      heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100
    };
  }

  // 检测内存泄漏
  detectMemoryLeak() {
    if (this.memoryHistory.length < 3) return null;

    const recent = this.memoryHistory.slice(-3);
    const growthRates = [];

    for (let i = 1; i < recent.length; i++) {
      const growth = (recent[i].heapUsed - recent[i - 1].heapUsed) / recent[i - 1].heapUsed;
      growthRates.push(growth);
    }

    const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    
    if (avgGrowth > this.leakThreshold) {
      return {
        type: 'MEMORY_LEAK',
        severity: 'HIGH',
        message: `检测到潜在内存泄漏，平均增长率: ${(avgGrowth * 100).toFixed(2)}%`,
        avgGrowth,
        threshold: this.leakThreshold
      };
    }

    return null;
  }

  // 记录内存使用历史
  recordMemoryUsage() {
    const memInfo = this.getProcessMemoryInfo();
    const timestamp = new Date();

    this.memoryHistory.push({
      timestamp,
      heapUsed: this.parseBytes(memInfo.heapUsed),
      heapTotal: this.parseBytes(memInfo.heapTotal),
      rss: this.parseBytes(memInfo.rss)
    });

    // 保持历史记录长度
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }

    // 检测内存泄漏
    const leak = this.detectMemoryLeak();
    if (leak) {
      console.warn('🚨 内存泄漏警告:', leak.message);
      this.triggerMemoryLeakAction();
    }
  }

  // 触发内存泄漏处理
  triggerMemoryLeakAction() {
    // 1. 强制垃圾回收
    if (global.gc) {
      console.log('🧹 触发强制垃圾回收...');
      global.gc();
    }

    // 2. 清理大对象缓存
    this.cleanupLargeObjects();

    // 3. 记录泄漏信息
    this.logMemoryLeakInfo();
  }

  // 清理大对象
  cleanupLargeObjects() {
    let cleanedSize = 0;
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分钟

    for (const [key, obj] of this.largeObjects.entries()) {
      if (now - obj.lastAccess > maxAge) {
        cleanedSize += obj.size;
        this.largeObjects.delete(key);
      }
    }

    if (cleanedSize > 0) {
      console.log(`🧹 清理了 ${this.formatBytes(cleanedSize)} 的大对象缓存`);
    }
  }

  // 记录大对象
  recordLargeObject(key, size, type = 'unknown') {
    this.largeObjects.set(key, {
      size,
      type,
      lastAccess: Date.now(),
      createdAt: Date.now()
    });
  }

  // 获取大对象统计
  getLargeObjectsStats() {
    let totalSize = 0;
    const typeStats = new Map();

    for (const obj of this.largeObjects.values()) {
      totalSize += obj.size;
      const type = obj.type;
      typeStats.set(type, (typeStats.get(type) || 0) + obj.size);
    }

    return {
      totalObjects: this.largeObjects.size,
      totalSize: this.formatBytes(totalSize),
      typeBreakdown: Object.fromEntries(
        Array.from(typeStats.entries()).map(([type, size]) => [
          type, 
          this.formatBytes(size)
        ])
      )
    };
  }

  // 优化垃圾回收
  optimizeGarbageCollection() {
    // 设置V8垃圾回收参数
    try {
      // 增加老生代内存限制
      v8.setFlagsFromString('--max-old-space-size=4096');
      
      // 优化GC参数
      v8.setFlagsFromString('--gc-interval=100');
      v8.setFlagsFromString('--gc-interval=1000');
      
      console.log('✅ V8垃圾回收参数优化完成');
    } catch (error) {
      console.warn('⚠️ V8参数优化失败:', error.message);
    }
  }

  // 手动触发垃圾回收
  forceGarbageCollection() {
    if (global.gc) {
      const startTime = Date.now();
      const startMem = process.memoryUsage();
      
      global.gc();
      
      const endTime = Date.now();
      const endMem = process.memoryUsage();
      
      const freedMemory = startMem.heapUsed - endMem.heapUsed;
      const gcTime = endTime - startTime;
      
      this.gcStats.totalCollections++;
      this.gcStats.totalTime += gcTime;
      this.gcStats.lastGCTime = gcTime;
      
      console.log(`🧹 垃圾回收完成: 释放 ${this.formatBytes(freedMemory)}, 耗时 ${gcTime}ms`);
      
      return {
        freedMemory: this.formatBytes(freedMemory),
        gcTime,
        totalCollections: this.gcStats.totalCollections
      };
    } else {
      console.warn('⚠️ 垃圾回收不可用，请使用 --expose-gc 启动参数');
      return null;
    }
  }

  // 获取内存优化建议
  getMemoryOptimizationSuggestions() {
    const suggestions = [];
    const memInfo = this.getProcessMemoryInfo();
    const sysInfo = this.getSystemMemoryInfo();
    
    // 检查堆内存使用率
    if (memInfo.heapUsedPercent > 80) {
      suggestions.push({
        type: 'HEAP_MEMORY',
        priority: 'HIGH',
        message: '堆内存使用率过高，建议优化对象创建和销毁',
        current: `${memInfo.heapUsedPercent}%`,
        recommendation: '检查是否有内存泄漏，优化大对象管理'
      });
    }
    
    // 检查RSS内存
    const rssGB = this.parseBytes(memInfo.rss) / (1024 * 1024 * 1024);
    if (rssGB > 2) {
      suggestions.push({
        type: 'RSS_MEMORY',
        priority: 'MEDIUM',
        message: 'RSS内存使用较高，建议检查外部内存使用',
        current: `${rssGB.toFixed(2)}GB`,
        recommendation: '检查Buffer、Stream等外部内存使用情况'
      });
    }
    
    // 检查系统内存
    if (sysInfo.usagePercent > 90) {
      suggestions.push({
        type: 'SYSTEM_MEMORY',
        priority: 'CRITICAL',
        message: '系统内存使用率过高，可能导致系统不稳定',
        current: `${sysInfo.usagePercent}%`,
        recommendation: '立即检查内存泄漏，考虑重启服务'
      });
    }
    
    return suggestions;
  }

  // 启动内存监控
  startMonitoring() {
    console.log('🚀 内存管理服务已启动');
    
    // 定期记录内存使用
    setInterval(() => {
      this.recordMemoryUsage();
    }, this.leakDetectionInterval);
    
    // 定期清理大对象
    setInterval(() => {
      this.cleanupLargeObjects();
    }, 60000); // 每分钟清理一次
    
    // 定期优化GC
    setInterval(() => {
      this.optimizeGarbageCollection();
    }, 300000); // 每5分钟优化一次
  }

  // 获取完整的内存报告
  getMemoryReport() {
    return {
      timestamp: new Date().toISOString(),
      system: this.getSystemMemoryInfo(),
      process: this.getProcessMemoryInfo(),
      largeObjects: this.getLargeObjectsStats(),
      gcStats: this.gcStats,
      suggestions: this.getMemoryOptimizationSuggestions(),
      history: {
        count: this.memoryHistory.length,
        recent: this.memoryHistory.slice(-5).map(h => ({
          timestamp: h.timestamp,
          heapUsed: this.formatBytes(h.heapUsed),
          heapUsedPercent: Math.round((h.heapUsed / h.heapTotal) * 10000) / 100
        }))
      }
    };
  }

  // 工具方法：格式化字节
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 工具方法：解析字节字符串
  parseBytes(bytesStr) {
    const match = bytesStr.match(/^([\d.]+)\s*(\w+)$/);
    if (!match) return 0;
    
    const [, value, unit] = match;
    const units = { 'B': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024 };
    return parseFloat(value) * (units[unit] || 1);
  }

  // 停止监控
  stop() {
    console.log('🛑 内存管理服务已停止');
  }
}

module.exports = MemoryManager;
