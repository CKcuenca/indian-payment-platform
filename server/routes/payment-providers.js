const express = require('express');
const router = express.Router();
const PaymentProviderService = require('../services/payment-provider-service');

/**
 * 获取所有支付商分类
 * GET /api/payment-providers/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = PaymentProviderService.getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取支付商分类失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商分类失败'
    });
  }
});

/**
 * 根据类型获取支付商分类
 * GET /api/payment-providers/categories/:type
 */
router.get('/categories/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const category = PaymentProviderService.getCategoryByType(type);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: '支付商分类不存在'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('获取支付商分类失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商分类失败'
    });
  }
});

/**
 * 获取所有支付商
 * GET /api/payment-providers
 */
router.get('/', async (req, res) => {
  try {
    const providers = PaymentProviderService.getAllProviders();
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('获取支付商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商列表失败'
    });
  }
});

/**
 * 根据类型获取支付商
 * GET /api/payment-providers/type/:type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const providers = PaymentProviderService.getProvidersByType(type);
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('获取支付商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商列表失败'
    });
  }
});

/**
 * 根据分类获取支付商
 * GET /api/payment-providers/category/:categoryId
 */
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const providers = PaymentProviderService.getProvidersByCategory(categoryId);
    
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('获取支付商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商列表失败'
    });
  }
});

/**
 * 获取激活的支付商
 * GET /api/payment-providers/active
 */
router.get('/active', async (req, res) => {
  try {
    const providers = PaymentProviderService.getActiveProviders();
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('获取激活支付商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取激活支付商列表失败'
    });
  }
});

/**
 * 根据ID获取支付商
 * GET /api/payment-providers/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = PaymentProviderService.getProviderById(id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: '支付商不存在'
      });
    }

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('获取支付商详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商详情失败'
    });
  }
});

/**
 * 获取支付商统计信息
 * GET /api/payment-providers/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = PaymentProviderService.getProviderStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取支付商统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取支付商统计失败'
    });
  }
});

/**
 * 验证支付商类型
 * POST /api/payment-providers/validate-type
 */
router.post('/validate-type', async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: '支付商类型不能为空'
      });
    }

    const isValid = PaymentProviderService.isValidProviderType(type);
    res.json({
      success: true,
      data: {
        type,
        isValid
      }
    });
  } catch (error) {
    console.error('验证支付商类型失败:', error);
    res.status(500).json({
      success: false,
      error: '验证支付商类型失败'
    });
  }
});

/**
 * 验证支付商名称
 * POST /api/payment-providers/validate-name
 */
router.post('/validate-name', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '支付商名称不能为空'
      });
    }

    const isValid = PaymentProviderService.isValidProviderName(name);
    res.json({
      success: true,
      data: {
        name,
        isValid
      }
    });
  } catch (error) {
    console.error('验证支付商名称失败:', error);
    res.status(500).json({
      success: false,
      error: '验证支付商名称失败'
    });
  }
});

module.exports = router;
