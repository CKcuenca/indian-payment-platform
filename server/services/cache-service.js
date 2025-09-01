const { getIndianTimeISO } = require('../utils/timeUtils');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time To Live
    this.defaultTTL = 5 * 60 * 1000; // 5分钟默认TTL
  }

  /**
   * 设置缓存
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, value);
    this.ttl.set(key, expiry);
    
    // 设置自动清理
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  /**
   * 获取缓存
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.ttl.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * 删除缓存
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const now = Date.now();
    const expiredKeys = [];
    
    // 检查过期键
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        expiredKeys.push(key);
      }
    }
    
    // 清理过期键
    expiredKeys.forEach(key => this.delete(key));
    
    return {
      size: this.cache.size,
      expiredKeys: expiredKeys.length,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache.entries()) {
      totalSize += this.getObjectSize(key) + this.getObjectSize(value);
    }
    return totalSize;
  }

  /**
   * 估算对象大小（字节）
   */
  getObjectSize(obj) {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }

  /**
   * 缓存商户信息
   */
  async cacheMerchant(merchantId, merchantData, ttl = 10 * 60 * 1000) {
    const key = `merchant:${merchantId}`;
    this.set(key, merchantData, ttl);
  }

  /**
   * 获取缓存的商户信息
   */
  async getCachedMerchant(merchantId) {
    const key = `merchant:${merchantId}`;
    return this.get(key);
  }

  /**
   * 缓存订单信息
   */
  async cacheOrder(orderId, orderData, ttl = 5 * 60 * 1000) {
    const key = `order:${orderId}`;
    this.set(key, orderData, ttl);
  }

  /**
   * 获取缓存的订单信息
   */
  async getCachedOrder(orderId) {
    const key = `order:${orderId}`;
    return this.get(key);
  }

  /**
   * 缓存交易信息
   */
  async cacheTransaction(transactionId, transactionData, ttl = 5 * 60 * 1000) {
    const key = `transaction:${transactionId}`;
    this.set(key, transactionData, ttl);
  }

  /**
   * 获取缓存的交易信息
   */
  async getCachedTransaction(transactionId) {
    const key = `transaction:${transactionId}`;
    return this.get(key);
  }

  /**
   * 缓存API响应
   */
  async cacheApiResponse(endpoint, params, response, ttl = 2 * 60 * 1000) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    this.set(key, response, ttl);
  }

  /**
   * 获取缓存的API响应
   */
  async getCachedApiResponse(endpoint, params) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return this.get(key);
  }

  /**
   * 缓存用户会话
   */
  async cacheUserSession(sessionId, userData, ttl = 30 * 60 * 1000) {
    const key = `session:${sessionId}`;
    this.set(key, userData, ttl);
  }

  /**
   * 获取缓存的用户会话
   */
  async getCachedUserSession(sessionId) {
    const key = `session:${sessionId}`;
    return this.get(key);
  }

  /**
   * 删除用户会话
   */
  async deleteUserSession(sessionId) {
    const key = `session:${sessionId}`;
    this.delete(key);
  }

  /**
   * 缓存支付配置
   */
  async cachePaymentConfig(merchantId, provider, config, ttl = 15 * 60 * 1000) {
    const key = `payment_config:${merchantId}:${provider}`;
    this.set(key, config, ttl);
  }

  /**
   * 获取缓存的支付配置
   */
  async getCachedPaymentConfig(merchantId, provider) {
    const key = `payment_config:${merchantId}:${provider}`;
    return this.get(key);
  }

  /**
   * 批量缓存操作
   */
  async mset(items, ttl = this.defaultTTL) {
    for (const [key, value] of Object.entries(items)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * 批量获取操作
   */
  async mget(keys) {
    const results = {};
    for (const key of keys) {
      results[key] = this.get(key);
    }
    return results;
  }

  /**
   * 缓存中间件
   */
  middleware(ttl = this.defaultTTL) {
    return (req, res, next) => {
      // 只缓存GET请求
      if (req.method !== 'GET') {
        return next();
      }

      const key = `api:${req.originalUrl}`;
      const cachedResponse = this.get(key);

      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // 重写res.json方法来缓存响应
      const originalJson = res.json;
      res.json = function(data) {
        this.set(key, data, ttl);
        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }
}

// 创建单例实例
const cacheService = new CacheService();

// 定期清理过期缓存
setInterval(() => {
  cacheService.getStats();
}, 60 * 1000); // 每分钟清理一次

module.exports = cacheService;
