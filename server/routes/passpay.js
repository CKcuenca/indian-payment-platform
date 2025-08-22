const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const PassPayProvider = require('../services/payment-providers/passpay-provider');
const PaymentConfig = require('../models/PaymentConfig');

/**
 * @route GET /api/passpay/status
 * @desc 获取PassPay服务状态
 * @access Private
 */
router.get('/status', apiKeyAuth, async (req, res) => {
  try {
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 测试连接
    const isConnected = await passpay.initialize();
    
    res.json({
      success: true,
      data: {
        status: isConnected ? 'connected' : 'disconnected',
        config: {
          accountId: passpayConfig.provider.accountId,
          payId: passpayConfig.provider.payId,
          baseUrl: passpay.baseUrl
        },
        providerInfo: passpay.getProviderInfo()
      }
    });
  } catch (error) {
    console.error('PassPay状态查询失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay状态查询失败'
    });
  }
});

/**
 * @route POST /api/passpay/collection/create
 * @desc 创建代收订单
 * @access Private
 */
router.post('/collection/create', apiKeyAuth, async (req, res) => {
  try {
    const { orderId, amount, notifyUrl } = req.body;

    if (!orderId || !amount || !notifyUrl) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：orderId, amount, notifyUrl'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 创建代收订单
    const result = await passpay.createCollectionOrder({
      orderId,
      amount: parseFloat(amount),
      notifyUrl
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay代收订单创建失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay代收订单创建失败'
    });
  }
});

/**
 * @route POST /api/passpay/collection/query
 * @desc 查询代收订单状态
 * @access Private
 */
router.post('/collection/query', apiKeyAuth, async (req, res) => {
  try {
    const { orderId, tradeNo } = req.body;

    if (!orderId && !tradeNo) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：orderId 或 tradeNo'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 查询订单状态
    const result = await passpay.queryCollectionOrderStatus(orderId, tradeNo);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay代收订单查询失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay代收订单查询失败'
    });
  }
});

/**
 * @route POST /api/passpay/utr/submit
 * @desc 提交UTR
 * @access Private
 */
router.post('/utr/submit', apiKeyAuth, async (req, res) => {
  try {
    const { orderId, tradeNo, utr } = req.body;

    if (!orderId || !tradeNo || !utr) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：orderId, tradeNo, utr'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 提交UTR
    const result = await passpay.submitUTR(orderId, tradeNo, utr);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay UTR提交失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay UTR提交失败'
    });
  }
});

/**
 * @route POST /api/passpay/utr/query
 * @desc 查询UTR状态
 * @access Private
 */
router.post('/utr/query', apiKeyAuth, async (req, res) => {
  try {
    const { orderId, tradeNo } = req.body;

    if (!orderId || !tradeNo) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：orderId, tradeNo'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 查询UTR状态
    const result = await passpay.queryUTRStatus(orderId, tradeNo);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay UTR查询失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay UTR查询失败'
    });
  }
});

/**
 * @route POST /api/passpay/upi/query
 * @desc 查询UPI
 * @access Private
 */
router.post('/upi/query', apiKeyAuth, async (req, res) => {
  try {
    const { upiId } = req.body;

    if (!upiId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：upiId'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 查询UPI
    const result = await passpay.queryUPI(upiId);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay UPI查询失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay UPI查询失败'
    });
  }
});

/**
 * @route POST /api/passpay/payout/create
 * @desc 创建代付订单
 * @access Private
 */
router.post('/payout/create', apiKeyAuth, async (req, res) => {
  try {
    const { orderId, amount, upiId, notifyUrl } = req.body;

    if (!orderId || !amount || !upiId || !notifyUrl) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：orderId, amount, upiId, notifyUrl'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 创建代付订单
    const result = await passpay.createPayoutOrder({
      orderId,
      amount: parseFloat(amount),
      upiId,
      notifyUrl
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay代付订单创建失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay代付订单创建失败'
    });
  }
});

/**
 * @route POST /api/passpay/payout/query
 * @desc 查询代付订单状态
 * @access Private
 */
router.post('/payout/query', apiKeyAuth, async (req, res) => {
  try {
    const { orderId, tradeNo } = req.body;

    if (!orderId && !tradeNo) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：orderId 或 tradeNo'
      });
    }

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 查询代付订单状态
    const result = await passpay.queryPayoutOrderStatus(orderId, tradeNo);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay代付订单查询失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay代付订单查询失败'
    });
  }
});

/**
 * @route GET /api/passpay/balance
 * @desc 查询余额
 * @access Private
 */
router.get('/balance', apiKeyAuth, async (req, res) => {
  try {
    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 查询余额
    const result = await passpay.getBalance();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('PassPay余额查询失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay余额查询失败'
    });
  }
});

/**
 * @route POST /api/passpay/callback
 * @desc 处理PassPay回调
 * @access Public
 */
router.post('/callback', async (req, res) => {
  try {
    const callbackData = req.body;

    // 获取PassPay配置
    const passpayConfig = await PaymentConfig.findOne({
      'provider.name': 'passpay'
    });

    if (!passpayConfig) {
      console.error('PassPay回调处理失败：未找到配置');
      return res.status(404).json({
        success: false,
        error: '未找到PassPay配置'
      });
    }

    // 创建PassPay提供者实例
    const passpay = new PassPayProvider(passpayConfig);
    
    // 验证回调签名
    const validationResult = await passpay.verifyCallback(callbackData);

    if (!validationResult.valid) {
      console.error('PassPay回调签名验证失败:', validationResult.error);
      return res.status(400).json({
        success: false,
        error: '回调签名验证失败'
      });
    }

    // 处理回调数据
    console.log('PassPay回调数据:', callbackData);

    // 返回成功响应
    res.json({
      success: true,
      message: '回调处理成功'
    });
  } catch (error) {
    console.error('PassPay回调处理失败:', error);
    res.status(500).json({
      success: false,
      error: 'PassPay回调处理失败'
    });
  }
});

module.exports = router;
