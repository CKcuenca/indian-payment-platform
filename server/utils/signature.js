const crypto = require('crypto');

/**
 * CashGit支付平台签名工具类
 * 参考MG支付标准，为下游商户提供统一的签名算法
 */
class SignatureUtil {
  /**
   * 生成MD5签名
   * @param {Object} params - 请求参数对象
   * @param {string} secretKey - 商户密钥
   * @returns {string} MD5签名
   */
  static generateMD5Signature(params, secretKey) {
    try {
      // 1. 参数按ASCII码从小到大排序
      const sortedParams = this.sortParamsByASCII(params);
      
      // 2. 按 key=value&key=value... 格式拼接参数签名源串
      const sourceString = this.buildSourceString(sortedParams);
      
      // 3. 拼接好的源串最后拼接上 secret key
      const finalString = sourceString + secretKey;
      
      // 4. 计算最终拼接好签名源串的MD5散列值
      const signature = this.calculateMD5(finalString);
      
      return signature;
    } catch (error) {
      console.error('生成MD5签名失败:', error);
      throw new Error('签名生成失败');
    }
  }

  /**
   * 参数按ASCII码从小到大排序
   * @param {Object} params - 请求参数
   * @returns {Object} 排序后的参数
   */
  static sortParamsByASCII(params) {
    const sortedParams = {};
    const keys = Object.keys(params).sort();
    
    keys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        sortedParams[key] = params[key];
      }
    });
    
    return sortedParams;
  }

  /**
   * 构建签名源串
   * @param {Object} params - 排序后的参数
   * @returns {string} 签名源串
   */
  static buildSourceString(params) {
    const pairs = [];
    
    Object.keys(params).forEach(key => {
      // 跳过sign参数，避免循环签名
      if (key !== 'sign') {
        pairs.push(`${key}=${params[key]}`);
      }
    });
    
    // 按 key=value&key=value... 格式拼接，注意：源串最后没有"&"
    return pairs.join('&');
  }

  /**
   * 计算MD5散列值
   * @param {string} string - 待计算字符串
   * @returns {string} MD5散列值
   */
  static calculateMD5(string) {
    return crypto.createHash('md5').update(string, 'utf8').digest('hex');
  }

  /**
   * 验证签名
   * @param {Object} params - 请求参数
   * @param {string} secretKey - 商户密钥
   * @param {string} sign - 接收到的签名
   * @returns {boolean} 签名是否有效
   */
  static verifySignature(params, secretKey, sign) {
    try {
      const calculatedSignature = this.generateMD5Signature(params, secretKey);
      return calculatedSignature.toLowerCase() === sign.toLowerCase();
    } catch (error) {
      console.error('验证签名失败:', error);
      return false;
    }
  }

  /**
   * 生成签名示例（用于测试和文档）
   * @param {Object} params - 测试参数
   * @param {string} secretKey - 测试密钥
   * @returns {Object} 签名结果和过程
   */
  static generateSignatureExample(params, secretKey) {
    const sortedParams = this.sortParamsByASCII(params);
    const sourceString = this.buildSourceString(sortedParams);
    const finalString = sourceString + secretKey;
    const signature = this.calculateMD5(finalString);
    
    return {
      originalParams: params,
      sortedParams,
      sourceString,
      finalString,
      signature,
      signedParams: { ...params, sign: signature }
    };
  }
}

module.exports = SignatureUtil;
