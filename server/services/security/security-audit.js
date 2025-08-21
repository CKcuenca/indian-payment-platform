const fs = require('fs').promises;
const path = require('path');

/**
 * 安全审计日志服务
 */
class SecurityAudit {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs/security');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    this.initLogDirectory();
  }

  /**
   * 初始化日志目录
   */
  async initLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('创建安全日志目录失败:', error);
    }
  }

  /**
   * 记录安全事件
   * @param {string} eventType - 事件类型
   * @param {Object} details - 事件详情
   * @param {string} level - 日志级别 (INFO, WARN, ERROR, CRITICAL)
   */
  async logSecurityEvent(eventType, details, level = 'INFO') {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        eventType,
        details,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown',
        userId: details.userId || 'anonymous',
        sessionId: details.sessionId || 'unknown'
      };

      const logFile = path.join(this.logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';

      await fs.appendFile(logFile, logLine);

      // 检查日志文件大小
      await this.rotateLogFiles(logFile);

      // 控制台输出重要事件
      if (level === 'ERROR' || level === 'CRITICAL') {
        console.error(`[SECURITY ${level}] ${eventType}:`, details);
      } else if (level === 'WARN') {
        console.warn(`[SECURITY ${level}] ${eventType}:`, details);
      }

    } catch (error) {
      console.error('记录安全审计日志失败:', error);
    }
  }

  /**
   * 记录签名验证事件
   * @param {Object} params - 验证参数
   * @param {boolean} success - 验证是否成功
   * @param {string} error - 错误信息
   * @param {Object} request - 请求对象
   */
  async logSignatureValidation(params, success, error = null, request = {}) {
    const eventType = success ? 'SIGNATURE_VALIDATION_SUCCESS' : 'SIGNATURE_VALIDATION_FAILED';
    const level = success ? 'INFO' : 'WARN';

    await this.logSecurityEvent(eventType, {
      success,
      error,
      params: this.sanitizeParams(params),
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers?.['user-agent'],
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    }, level);
  }

  /**
   * 记录认证失败事件
   * @param {Object} request - 请求对象
   * @param {string} reason - 失败原因
   */
  async logAuthenticationFailure(request, reason) {
    await this.logSecurityEvent('AUTHENTICATION_FAILED', {
      reason,
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers?.['user-agent'],
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    }, 'WARN');
  }

  /**
   * 记录可疑活动
   * @param {Object} request - 请求对象
   * @param {string} activity - 可疑活动描述
   * @param {Object} details - 详细信息
   */
  async logSuspiciousActivity(request, activity, details = {}) {
    await this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      activity,
      details,
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers?.['user-agent'],
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    }, 'WARN');
  }

  /**
   * 记录API限流事件
   * @param {Object} request - 请求对象
   * @param {string} reason - 限流原因
   */
  async logRateLimitExceeded(request, reason) {
    await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      reason,
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.headers?.['user-agent'],
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    }, 'WARN');
  }

  /**
   * 记录系统安全事件
   * @param {string} event - 事件描述
   * @param {Object} details - 事件详情
   * @param {string} level - 日志级别
   */
  async logSystemSecurityEvent(event, details = {}, level = 'INFO') {
    await this.logSecurityEvent('SYSTEM_SECURITY_EVENT', {
      event,
      details,
      timestamp: new Date().toISOString()
    }, level);
  }

  /**
   * 清理敏感参数
   * @param {Object} params - 原始参数
   * @returns {Object} 清理后的参数
   */
  sanitizeParams(params) {
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'sign'];
    const sanitized = { ...params };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * 轮转日志文件
   * @param {string} currentLogFile - 当前日志文件路径
   */
  async rotateLogFiles(currentLogFile) {
    try {
      const stats = await fs.stat(currentLogFile);
      
      if (stats.size > this.maxLogSize) {
        // 重命名当前日志文件
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = currentLogFile.replace('.log', `-${timestamp}.log`);
        await fs.rename(currentLogFile, backupFile);

        // 清理旧的日志文件
        await this.cleanupOldLogFiles();
      }
    } catch (error) {
      console.error('轮转日志文件失败:', error);
    }
  }

  /**
   * 清理旧的日志文件
   */
  async cleanupOldLogFiles() {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(file => file.startsWith('security-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          mtime: fs.stat(path.join(this.logDir, file)).then(stat => stat.mtime)
        }));

      // 按修改时间排序
      const sortedFiles = await Promise.all(logFiles.map(async file => ({
        ...file,
        mtime: await file.mtime
      })));

      sortedFiles.sort((a, b) => b.mtime - a.mtime);

      // 删除超过最大文件数的旧文件
      if (sortedFiles.length > this.maxLogFiles) {
        const filesToDelete = sortedFiles.slice(this.maxLogFiles);
        
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
            console.log(`已删除旧的安全日志文件: ${file.name}`);
          } catch (error) {
            console.error(`删除安全日志文件失败: ${file.name}`, error);
          }
        }
      }
    } catch (error) {
      console.error('清理旧日志文件失败:', error);
    }
  }

  /**
   * 获取安全统计信息
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @returns {Object} 统计信息
   */
  async getSecurityStats(date = new Date().toISOString().split('T')[0]) {
    try {
      const logFile = path.join(this.logDir, `security-${date}.log`);
      
      try {
        const content = await fs.readFile(logFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line);
        
        const stats = {
          total: lines.length,
          byLevel: {},
          byEventType: {},
          byIP: {}
        };

        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            
            // 按级别统计
            stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
            
            // 按事件类型统计
            stats.byEventType[entry.eventType] = (stats.byEventType[entry.eventType] || 0) + 1;
            
            // 按IP统计
            stats.byIP[entry.ip] = (stats.byIP[entry.ip] || 0) + 1;
          } catch (parseError) {
            // 忽略解析错误的行
          }
        });

        return stats;
      } catch (error) {
        // 文件不存在或读取失败
        return {
          total: 0,
          byLevel: {},
          byEventType: {},
          byIP: {}
        };
      }
    } catch (error) {
      console.error('获取安全统计信息失败:', error);
      return null;
    }
  }
}

module.exports = SecurityAudit;
