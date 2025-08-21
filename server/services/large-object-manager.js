const v8 = require('v8');

class LargeObjectManager {
  constructor() {
    this.largeObjects = new Map();
    this.objectTypes = new Map();
    this.cleanupThreshold = 5 * 60 * 1000; // 5分钟
    this.maxObjectSize = 10 * 1024 * 1024; // 10MB
    this.cleanupInterval = 60000; // 1分钟
    this.analysisInterval = 300000; // 5分钟
    
    this.startManagement();
  }

  // 注册大对象
  registerLargeObject(id, type, size, metadata = {}) {
    const timestamp = Date.now();
    
    this.largeObjects.set(id, {
      type,
      size,
      metadata,
      createdAt: timestamp,
      lastAccess: timestamp,
      accessCount: 1,
      memoryAddress: this.getMemoryAddress(id)
    });

    // 更新类型统计
    if (!this.objectTypes.has(type)) {
      this.objectTypes.set(type, {
        count: 0,
        totalSize: 0,
        avgSize: 0,
        maxSize: 0,
        minSize: Infinity
      });
    }

    const typeStats = this.objectTypes.get(type);
    typeStats.count++;
    typeStats.totalSize += size;
    typeStats.avgSize = typeStats.totalSize / typeStats.count;
    typeStats.maxSize = Math.max(typeStats.maxSize, size);
    typeStats.minSize = Math.min(typeStats.minSize, size);

    console.log(`📝 注册大对象: ${id} (${type}) - ${this.formatBytes(size)}`);
  }

  // 访问大对象
  accessLargeObject(id) {
    const obj = this.largeObjects.get(id);
    if (obj) {
      obj.lastAccess = Date.now();
      obj.accessCount++;
      return true;
    }
    return false;
  }

  // 释放大对象
  releaseLargeObject(id) {
    const obj = this.largeObjects.get(id);
    if (obj) {
      const lifetime = Date.now() - obj.createdAt;
      const type = obj.type;
      
      // 更新类型统计
      if (this.objectTypes.has(type)) {
        const typeStats = this.objectTypes.get(type);
        typeStats.count--;
        typeStats.totalSize -= obj.size;
        
        if (typeStats.count > 0) {
          typeStats.avgSize = typeStats.totalSize / typeStats.count;
        } else {
          this.objectTypes.delete(type);
        }
      }

      this.largeObjects.delete(id);
      console.log(`🗑️ 释放大对象: ${id} (${type}) - 生命周期: ${(lifetime / 1000).toFixed(2)}s`);
      
      return {
        success: true,
        releasedSize: obj.size,
        lifetime: lifetime
      };
    }
    return { success: false, error: '对象不存在' };
  }

  // 分析大对象使用模式
  analyzeLargeObjectPatterns() {
    const patterns = {
      byType: {},
      bySize: {
        small: [], // < 1MB
        medium: [], // 1MB - 10MB
        large: [] // > 10MB
      },
      byAccess: {
        frequent: [], // 访问次数 > 10
        moderate: [], // 访问次数 5-10
        rare: [] // 访问次数 < 5
      },
      byAge: {
        new: [], // < 1分钟
        recent: [], // 1-5分钟
        old: [], // > 5分钟
        stale: [] // > 10分钟
      }
    };

    const now = Date.now();

    for (const [id, obj] of this.largeObjects.entries()) {
      const age = now - obj.createdAt;
      const accessCount = obj.accessCount;

      // 按类型分类
      if (!patterns.byType[obj.type]) {
        patterns.byType[obj.type] = [];
      }
      patterns.byType[obj.type].push({ id, ...obj });

      // 按大小分类
      if (obj.size < 1024 * 1024) {
        patterns.bySize.small.push({ id, ...obj });
      } else if (obj.size < 10 * 1024 * 1024) {
        patterns.bySize.medium.push({ id, ...obj });
      } else {
        patterns.bySize.large.push({ id, ...obj });
      }

      // 按访问频率分类
      if (accessCount > 10) {
        patterns.byAccess.frequent.push({ id, ...obj });
      } else if (accessCount > 5) {
        patterns.byAccess.moderate.push({ id, ...obj });
      } else {
        patterns.byAccess.rare.push({ id, ...obj });
      }

      // 按年龄分类
      if (age < 60000) {
        patterns.byAge.new.push({ id, ...obj });
      } else if (age < 300000) {
        patterns.byAge.recent.push({ id, ...obj });
      } else if (age < 600000) {
        patterns.byAge.old.push({ id, ...obj });
      } else {
        patterns.byAge.stale.push({ id, ...obj });
      }
    }

    return patterns;
  }

  // 智能清理大对象
  async intelligentCleanup() {
    const patterns = this.analyzeLargeObjectPatterns();
    const cleanupResults = {
      totalCleaned: 0,
      totalSizeFreed: 0,
      byType: {},
      byReason: {
        stale: 0,
        rarelyAccessed: 0,
        oversized: 0
      }
    };

    const now = Date.now();

    // 1. 清理过期对象
    for (const obj of patterns.byAge.stale) {
      if (now - obj.lastAccess > this.cleanupThreshold) {
        const result = this.releaseLargeObject(obj.id);
        if (result.success) {
          cleanupResults.totalCleaned++;
          cleanupResults.totalSizeFreed += result.releasedSize;
          cleanupResults.byReason.stale++;
          
          if (!cleanupResults.byType[obj.type]) {
            cleanupResults.byType[obj.type] = 0;
          }
          cleanupResults.byType[obj.type]++;
        }
      }
    }

    // 2. 清理很少访问的对象
    for (const obj of patterns.byAccess.rare) {
      if (obj.accessCount <= 2 && now - obj.createdAt > 300000) { // 5分钟且访问次数≤2
        const result = this.releaseLargeObject(obj.id);
        if (result.success) {
          cleanupResults.totalCleaned++;
          cleanupResults.totalSizeFreed += result.releasedSize;
          cleanupResults.byReason.rarelyAccessed++;
          
          if (!cleanupResults.byType[obj.type]) {
            cleanupResults.byType[obj.type] = 0;
          }
          cleanupResults.byType[obj.type]++;
        }
      }
    }

    // 3. 清理超大对象
    for (const obj of patterns.bySize.large) {
      if (obj.size > this.maxObjectSize) {
        const result = this.releaseLargeObject(obj.id);
        if (result.success) {
          cleanupResults.totalCleaned++;
          cleanupResults.totalSizeFreed += result.releasedSize;
          cleanupResults.byReason.oversized++;
          
          if (!cleanupResults.byType[obj.type]) {
            cleanupResults.byType[obj.type] = 0;
          }
          cleanupResults.byType[obj.type]++;
        }
      }
    }

    return cleanupResults;
  }

  // 获取大对象统计
  getLargeObjectStats() {
    const totalSize = Array.from(this.largeObjects.values())
      .reduce((sum, obj) => sum + obj.size, 0);

    return {
      totalObjects: this.largeObjects.size,
      totalSize: this.formatBytes(totalSize),
      byType: Object.fromEntries(
        Array.from(this.objectTypes.entries()).map(([type, stats]) => [
          type,
          {
            count: stats.count,
            totalSize: this.formatBytes(stats.totalSize),
            avgSize: this.formatBytes(stats.avgSize),
            maxSize: this.formatBytes(stats.maxSize),
            minSize: this.formatBytes(stats.minSize)
          }
        ])
      ),
      patterns: this.analyzeLargeObjectPatterns()
    };
  }

  // 获取清理建议
  getCleanupRecommendations() {
    const patterns = this.analyzeLargeObjectPatterns();
    const recommendations = [];

    // 检查过期对象
    if (patterns.byAge.stale.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'STALE_OBJECTS',
        message: `发现 ${patterns.byAge.stale.length} 个过期对象`,
        action: 'cleanup-stale',
        potentialSavings: this.calculatePotentialSavings(patterns.byAge.stale)
      });
    }

    // 检查很少访问的对象
    if (patterns.byAccess.rare.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'RARELY_ACCESSED',
        message: `发现 ${patterns.byAccess.rare.length} 个很少访问的对象`,
        action: 'cleanup-rare',
        potentialSavings: this.calculatePotentialSavings(patterns.byAccess.rare)
      });
    }

    // 检查超大对象
    if (patterns.bySize.large.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'OVERSIZED_OBJECTS',
        message: `发现 ${patterns.bySize.large.length} 个超大对象`,
        action: 'cleanup-oversized',
        potentialSavings: this.calculatePotentialSavings(patterns.bySize.large)
      });
    }

    return recommendations;
  }

  // 计算潜在节省
  calculatePotentialSavings(objects) {
    const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);
    return this.formatBytes(totalSize);
  }

  // 获取内存地址（模拟）
  getMemoryAddress(id) {
    return `0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`;
  }

  // 启动管理服务
  startManagement() {
    console.log('🚀 大对象管理服务已启动');
    
    // 定期清理
    setInterval(async () => {
      const cleanupResults = await this.intelligentCleanup();
      if (cleanupResults.totalCleaned > 0) {
        console.log(`🧹 自动清理完成: 清理了 ${cleanupResults.totalCleaned} 个对象，释放 ${this.formatBytes(cleanupResults.totalSizeFreed)}`);
      }
    }, this.cleanupInterval);

    // 定期分析
    setInterval(() => {
      const stats = this.getLargeObjectStats();
      const recommendations = this.getCleanupRecommendations();
      
      if (recommendations.length > 0) {
        console.log(`💡 大对象管理建议: ${recommendations.length} 个建议`);
        recommendations.forEach(rec => {
          console.log(`  - [${rec.priority}] ${rec.message} (潜在节省: ${rec.potentialSavings})`);
        });
      }
    }, this.analysisInterval);
  }

  // 停止管理服务
  stop() {
    console.log('🛑 大对象管理服务已停止');
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

module.exports = LargeObjectManager;
