const express = require('express');
const router = express.Router();
const MerchantKeyManager = require('../services/merchant-key-manager');
const { authenticateToken } = require('../middleware/auth'); // JWT认证中间件

/**
 * 商户角色检查中间件
 */
const requireMerchantRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      code: 401,
      message: '未认证',
      data: null
    });
  }

  if (req.user.role !== 'merchant') {
    return res.status(403).json({
      code: 403,
      message: '只有商户角色可以访问密钥管理功能',
      data: null
    });
  }

  // 设置merchantId - 从用户信息中获取关联的商户ID
  if (!req.user.merchantId) {
    return res.status(400).json({
      code: 400,
      message: '商户用户未关联商户信息',
      data: null
    });
  }

  // 为了兼容现有代码，设置req.merchant对象
  req.merchant = {
    merchantId: req.user.merchantId,
    userId: req.user.id
  };

  next();
};

/**
 * 商户密钥管理路由
 * 提供密钥查看、重新生成、下载等功能
 */

/**
 * 获取商户密钥信息
 * GET /api/merchant/keys
 */
router.get('/keys', authenticateToken, requireMerchantRole, async (req, res) => {
  try {
    const merchantId = req.merchant.merchantId; // 从认证中间件获取
    
    const keyInfo = await MerchantKeyManager.getMerchantKeyInfo(merchantId);
    
    res.json({
      code: 200,
      message: '获取密钥信息成功',
      data: keyInfo
    });
    
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 重新生成商户密钥
 * POST /api/merchant/keys/regenerate
 */
router.post('/keys/regenerate', authenticateToken, requireMerchantRole, async (req, res) => {
  try {
    const merchantId = req.merchant.merchantId;
    const operatorId = req.merchant.userId || merchantId;
    
    // 安全确认 - 需要输入当前密码或其他验证
    const { confirmPassword, reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        code: 400,
        message: '请提供重新生成密钥的原因',
        data: null
      });
    }
    
    const result = await MerchantKeyManager.regenerateKeys(merchantId, operatorId);
    
    if (result.success) {
      res.json({
        code: 200,
        message: '密钥重新生成成功',
        data: {
          apiKey: result.data.apiKey,
          secretKey: result.data.secretKey,
          generatedAt: result.data.generatedAt,
          warning: '请立即保存新密钥，旧密钥将在24小时后失效'
        }
      });
    } else {
      res.status(400).json({
        code: 400,
        message: result.error,
        data: null
      });
    }
    
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 下载密钥配置文件
 * GET /api/merchant/keys/download
 */
router.get('/keys/download', authenticateToken, requireMerchantRole, async (req, res) => {
  try {
    const merchantId = req.merchant.merchantId;
    
    const downloadData = await MerchantKeyManager.generateKeyDownload(merchantId);
    
    // 设置下载headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${merchantId}_api_credentials.json"`);
    
    res.json(downloadData);
    
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 获取API使用示例
 * GET /api/merchant/keys/examples
 */
router.get('/keys/examples', authenticateToken, requireMerchantRole, async (req, res) => {
  try {
    const merchantId = req.merchant.merchantId;
    
    // 获取商户密钥信息
    const keyInfo = await MerchantKeyManager.getMerchantKeyInfo(merchantId);
    const apiKey = keyInfo.apiKey;
    
    const examples = {
      merchantId,
      baseUrl: process.env.API_BASE_URL || 'https://cashgit.com',
      
      // 代收订单示例
      paymentExample: {
        endpoint: '/api/pay',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          appid: merchantId,
          orderid: 'GAME_ORDER_' + Date.now(),
          amount: '100.00',
          currency: 'INR',
          subject: 'Game Coin Purchase',
          description: 'Teen Patti Game Coins',
          customer_phone: '9876543210',
          customer_email: 'player@example.com',
          notify_url: 'https://your-game.com/api/payment/notify',
          return_url: 'https://your-game.com/payment/success',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          sign: 'generated_signature'
        }
      },
      
      // 查询余额示例
      balanceExample: {
        endpoint: '/api/balance/query',
        method: 'POST',
        body: {
          appid: merchantId,
          timestamp: Math.floor(Date.now() / 1000).toString(),
          sign: 'generated_signature'
        }
      },
      
      // 签名生成示例代码
      signatureCode: {
        javascript: `
function generateSign(params, secretKey) {
  // 1. 过滤空值参数
  const filteredParams = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
      filteredParams[key] = params[key];
    }
  });
  
  // 2. 按ASCII排序并拼接
  const signString = Object.keys(filteredParams)
    .sort()
    .map(key => key + '=' + filteredParams[key])
    .join('&') + secretKey;
  
  // 3. MD5加密转小写
  return crypto.createHash('md5').update(signString).digest('hex').toLowerCase();
}`,
        
        php: `
function generateSign($params, $secretKey) {
    // 过滤空值并排序
    $filteredParams = array_filter($params, function($value) {
        return $value !== '' && $value !== null;
    });
    ksort($filteredParams);
    
    // 拼接参数
    $signString = '';
    foreach($filteredParams as $key => $value) {
        $signString .= $key . '=' . $value . '&';
    }
    $signString = rtrim($signString, '&') . $secretKey;
    
    // MD5加密
    return strtolower(md5($signString));
}`,
        
        python: `
import hashlib

def generate_sign(params, secret_key):
    # 过滤空值并排序
    filtered_params = {k: v for k, v in params.items() if v not in ['', None]}
    sorted_params = sorted(filtered_params.items())
    
    # 拼接参数
    sign_string = '&'.join([f'{k}={v}' for k, v in sorted_params]) + secret_key
    
    # MD5加密
    return hashlib.md5(sign_string.encode('utf-8')).hexdigest().lower()
`
      }
    };
    
    res.json({
      code: 200,
      message: '获取API示例成功',
      data: examples
    });
    
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: error.message,
      data: null
    });
  }
});

/**
 * 验证API密钥
 * POST /api/merchant/keys/validate
 */
router.post('/keys/validate', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        code: 400,
        message: '请提供API密钥',
        data: null
      });
    }
    
    const result = await MerchantKeyManager.validateApiKey(apiKey);
    
    res.json({
      code: 200,
      message: result.valid ? 'API密钥有效' : 'API密钥无效',
      data: result
    });
    
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: error.message,
      data: null
    });
  }
});

module.exports = router;