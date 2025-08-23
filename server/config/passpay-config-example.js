/**
 * PassPay配置示例
 * 请根据实际情况修改配置信息
 */

module.exports = {
  // 支付提供者配置
  provider: {
    name: 'passpay',
    accountId: 'your_mchid_here',        // PassPay商户ID
    payId: 'your_pay_id_here',           // PassPay支付ID
    secretKey: 'your_secret_key_here'    // PassPay密钥
  },
  
  // API配置
  api: {
    baseUrl: 'https://api.merchant.passpay.cc',
    timeout: 10000,
    retries: 3
  },
  
  // 回调配置
  callback: {
    // 代收回调地址
    collectionNotifyUrl: 'https://yourdomain.com/api/callback/collection',
    // 代付回调地址
    payoutNotifyUrl: 'https://yourdomain.com/api/callback/payout'
  },
  
  // 状态映射配置
  statusMapping: {
    // 代收状态映射
    collection: {
      '0': 'PENDING',      // 待处理
      '1': 'PROCESSING',   // 处理中
      '2': 'SUCCESS',      // 成功
      '3': 'FAILED',       // 失败
      '4': 'CANCELLED',    // 取消
      '5': 'EXPIRED'       // 过期
    },
    
    // 代付状态映射
    payout: {
      '0': 'PENDING',      // 待处理
      '1': 'PROCESSING',   // 处理中
      '2': 'SUCCESS',      // 成功
      '3': 'FAILED',       // 失败
      '4': 'CANCELLED',    // 取消
      '5': 'REJECTED'      // 拒绝
    },
    
    // UTR状态映射
    utr: {
      '0': 'PENDING',      // 待验证
      '1': 'VERIFIED',     // 已验证
      '2': 'REJECTED',     // 拒绝
      '3': 'EXPIRED'       // 过期
    },
    
    // UPI状态映射
    upi: {
      '0': 'INACTIVE',     // 非活跃
      '1': 'ACTIVE'        // 活跃
    }
  }
};

/**
 * 使用说明：
 * 
 * 1. 复制此文件为 passpay-config.js
 * 2. 修改配置信息：
 *    - accountId: 您的PassPay商户ID
 *    - payId: 您的PassPay支付ID
 *    - secretKey: 您的PassPay密钥
 *    - 回调地址: 根据您的域名修改
 * 
 * 3. 在数据库中添加配置：
 *    db.paymentconfigs.insertOne({
 *      "provider": {
 *        "name": "passpay",
 *        "accountId": "your_mchid_here",
 *        "payId": "your_pay_id_here",
 *        "secretKey": "your_secret_key_here"
 *      },
 *      "enabled": true,
 *      "createdAt": new Date(),
 *      "updatedAt": new Date()
 *    })
 * 
 * 4. 重启服务器使配置生效
 */
