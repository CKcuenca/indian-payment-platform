const crypto = require('crypto');
const { promisify } = require('util');

/**
 * 签名验证服务 - 支持多种签名算法和安全验证
 */
class SignatureValidator {
  constructor() {
    this.supportedAlgorithms = ['md5', 'sha1', 'sha256', 'sha512', 'hmac-sha256'];
    this.timestampTolerance = 5 * 60 * 1000; // 5分钟时间戳容差
  }

  /**
   * 验证PassPay签名
   * @param {Object} params - 请求参数
   * @param {string} secretKey - 密钥
   * @param {string} receivedSignature - 接收到的签名
   * @returns {Object} 验证结果
   */
  async validatePassPaySignature(params, secretKey, receivedSignature) {
    try {
      // 1. 参数完整性检查
      const requiredFields = ['mchid', 'pay_id', 'out_trade_no', 'amount'];
      for (const field of requiredFields) {
        if (!params[field]) {
          return {
            valid: false,
            error: `缺少必需字段: ${field}`,
            code: 'MISSING_REQUIRED_FIELD'
          };
        }
      }

      // 2. 时间戳验证（如果有timestamp字段）
      if (params.timestamp) {
        const timestamp = parseInt(params.timestamp);
        const now = Date.now();
        if (Math.abs(now - timestamp) > this.timestampTolerance) {
          return {
            valid: false,
            error: '请求时间戳超出允许范围',
            code: 'TIMESTAMP_EXPIRED'
          };
        }
      }

      // 3. 生成签名
      const expectedSignature = this.generatePassPaySignature(params, secretKey);

      // 4. 签名对比
      if (expectedSignature.toLowerCase() !== receivedSignature.toLowerCase()) {
        return {
          valid: false,
          error: '签名验证失败',
          code: 'SIGNATURE_MISMATCH',
          details: {
            expected: expectedSignature,
            received: receivedSignature
          }
        };
      }

      // 5. 防重放攻击检查
      const replayCheck = await this.checkReplayAttack(params);
      if (!replayCheck.valid) {
        return replayCheck;
      }

      return {
        valid: true,
        message: '签名验证成功'
      };

    } catch (error) {
      return {
        valid: false,
        error: '签名验证过程出错',
        code: 'VALIDATION_ERROR',
        details: error.message
      };
    }
  }

  /**
   * 生成PassPay签名
   * @param {Object} params - 参数对象
   * @param {string} secretKey - 密钥
   * @returns {string} 生成的签名
   */
  generatePassPaySignature(params, secretKey) {
    // 过滤空值和null，按ASCII排序
    const filteredParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });

    // 按ASCII排序并拼接
    const sortedKeys = Object.keys(filteredParams).sort();
    let signStr = '';
    
    sortedKeys.forEach(key => {
      if (key !== 'sign') { // sign字段不参与加密
        signStr += `${key}=${filteredParams[key]}&`;
      }
    });

    // 末尾拼接密钥
    signStr += `key=${secretKey}`;

    // MD5加密并转小写
    return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase();
  }

  /**
   * 验证DhPay签名
   * @param {Object} params - 请求参数
   * @param {string} secretKey - 密钥
   * @param {string} receivedSignature - 接收到的签名
   * @returns {Object} 验证结果
   */
  async validateDhPaySignature(params, secretKey, receivedSignature) {
    try {
      // 生成DhPay签名
      const expectedSignature = this.generateDhPaySignature(params, secretKey);
      
      // 签名对比 (DhPay使用大写)
      if (expectedSignature.toUpperCase() !== receivedSignature.toUpperCase()) {
        return {
          valid: false,
          error: 'DhPay签名验证失败',
          code: 'DHPAY_SIGNATURE_MISMATCH',
          details: {
            expected: expectedSignature,
            received: receivedSignature
          }
        };
      }

      return {
        valid: true,
        message: 'DhPay签名验证成功'
      };
    } catch (error) {
      return {
        valid: false,
        error: `DhPay签名验证异常: ${error.message}`,
        code: 'DHPAY_SIGNATURE_ERROR'
      };
    }
  }

  /**
   * 生成DhPay签名
   * @param {Object} params - 参数对象
   * @param {string} secretKey - 密钥
   * @returns {string} 生成的签名
   */
  generateDhPaySignature(params, secretKey) {
    // 过滤空值参数
    const filteredParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '' && key !== 'sign') {
        filteredParams[key] = value;
      }
    }

    // 按参数名ASCII码从小到大排序
    const sortedKeys = Object.keys(filteredParams).sort();
    
    // 使用URL键值对格式拼接
    const stringA = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');
    
    // 拼接密钥
    const stringSignTemp = stringA + '&secretKey=' + secretKey;
    
    // MD5加密并转大写
    return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
  }

  /**
   * 验证UnisPay签名
   * @param {Object} params - 请求参数
   * @param {string} secretKey - 密钥
   * @param {string} receivedSignature - 接收到的签名
   * @returns {Object} 验证结果
   */
  async validateUnispaySignature(params, secretKey, receivedSignature) {
    try {
      // 生成UnisPay签名
      const expectedSignature = this.generateUnispaySignature(params, secretKey);
      
      // 签名对比 (UnisPay使用小写)
      if (expectedSignature.toLowerCase() !== receivedSignature.toLowerCase()) {
        return {
          valid: false,
          error: 'UnisPay签名验证失败',
          code: 'UNISPAY_SIGNATURE_MISMATCH',
          details: {
            expected: expectedSignature,
            received: receivedSignature
          }
        };
      }

      return {
        valid: true,
        message: 'UnisPay签名验证成功'
      };
    } catch (error) {
      return {
        valid: false,
        error: `UnisPay签名验证异常: ${error.message}`,
        code: 'UNISPAY_SIGNATURE_ERROR'
      };
    }
  }

  /**
   * 生成UnisPay签名
   * @param {Object} params - 参数对象
   * @param {string} secretKey - 密钥
   * @returns {string} 生成的签名
   */
  generateUnispaySignature(params, secretKey) {
    // 移除sign字段
    const { sign, ...signParams } = params;
    
    // 按字母顺序排序
    const sortedKeys = Object.keys(signParams).sort();
    
    // 构建签名字符串
    let signStr = '';
    sortedKeys.forEach(key => {
      if (signParams[key] !== undefined && signParams[key] !== null && signParams[key] !== '') {
        signStr += `${key}=${signParams[key]}&`;
      }
    });
    
    // 移除最后的&，然后添加密钥
    signStr = signStr.slice(0, -1) + `&key=${secretKey}`;
    
    // 生成SHA-256签名（16进制小写）
    return crypto.createHash('sha256').update(signStr).digest('hex');
  }

  /**
   * 生成更安全的HMAC-SHA256签名
   * @param {Object} params - 参数对象
   * @param {string} secretKey - 密钥
   * @returns {string} 生成的签名
   */
  generateHMACSHA256Signature(params, secretKey) {
    // 过滤空值和null，按ASCII排序
    const filteredParams = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        filteredParams[key] = params[key];
      }
    });

    // 按ASCII排序并拼接
    const sortedKeys = Object.keys(filteredParams).sort();
    let signStr = '';
    
    sortedKeys.forEach(key => {
      if (key !== 'sign') { // sign字段不参与加密
        signStr += `${key}=${filteredParams[key]}&`;
      }
    });

    // 末尾拼接密钥
    signStr += `key=${secretKey}`;

    // HMAC-SHA256加密
    return crypto.createHmac('sha256', secretKey).update(signStr).digest('hex');
  }

  /**
   * 防重放攻击检查
   * @param {Object} params - 请求参数
   * @returns {Object} 检查结果
   */
  async checkReplayAttack(params) {
    try {
      // 这里可以实现更复杂的重放攻击检测
      // 例如：检查nonce、时间戳、IP地址等
      
      // 简单的实现：检查是否有重复的请求标识
      if (params.nonce) {
        // 可以在这里添加Redis缓存检查nonce是否已被使用
        // 暂时返回通过
        return { valid: true };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: '重放攻击检查失败',
        code: 'REPLAY_CHECK_ERROR'
      };
    }
  }

  /**
   * 验证通用签名
   * @param {Object} params - 请求参数
   * @param {string} secretKey - 密钥
   * @param {string} receivedSignature - 接收到的签名
   * @param {string} algorithm - 签名算法
   * @returns {Object} 验证结果
   */
  async validateSignature(params, secretKey, receivedSignature, algorithm = 'sha256') {
    if (!this.supportedAlgorithms.includes(algorithm)) {
      return {
        valid: false,
        error: `不支持的签名算法: ${algorithm}`,
        code: 'UNSUPPORTED_ALGORITHM'
      };
    }

    try {
      let expectedSignature;
      
      switch (algorithm) {
        case 'md5':
          expectedSignature = this.generatePassPaySignature(params, secretKey);
          break;
        case 'sha1':
          expectedSignature = crypto.createHash('sha1').update(JSON.stringify(params)).digest('hex');
          break;
        case 'sha256':
          expectedSignature = crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex');
          break;
        case 'sha512':
          expectedSignature = crypto.createHash('sha512').update(JSON.stringify(params)).digest('hex');
          break;
        case 'hmac-sha256':
          expectedSignature = this.generateHMACSHA256Signature(params, secretKey);
          break;
        default:
          expectedSignature = this.generatePassPaySignature(params, secretKey);
      }

      if (expectedSignature.toLowerCase() !== receivedSignature.toLowerCase()) {
        return {
          valid: false,
          error: '签名验证失败',
          code: 'SIGNATURE_MISMATCH',
          details: {
            algorithm,
            expected: expectedSignature,
            received: receivedSignature
          }
        };
      }

      return {
        valid: true,
        message: '签名验证成功',
        algorithm
      };

    } catch (error) {
      return {
        valid: false,
        error: '签名验证过程出错',
        code: 'VALIDATION_ERROR',
        details: error.message
      };
    }
  }

  /**
   * 生成随机nonce
   * @param {number} length - nonce长度
   * @returns {string} 生成的nonce
   */
  generateNonce(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成时间戳
   * @returns {number} 当前时间戳
   */
  generateTimestamp() {
    return Date.now();
  }

  /**
   * 验证时间戳
   * @param {number} timestamp - 时间戳
   * @param {number} tolerance - 容差时间（毫秒）
   * @returns {boolean} 是否有效
   */
  validateTimestamp(timestamp, tolerance = this.timestampTolerance) {
    const now = Date.now();
    return Math.abs(now - timestamp) <= tolerance;
  }
}

module.exports = SignatureValidator;
