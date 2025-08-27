const express = require('express');
const router = express.Router();
const { mgAuthMiddleware, successResponse, errorResponse } = require('../middleware/mgAuth');
const Order = require('../models/order');

/**
 * 统一余额查询接口
 * POST /api/balance/query
 */
router.post('/query', mgAuthMiddleware, async (req, res) => {
  try {
    const { appid, timestamp, sign } = req.body;
    const merchant = req.merchant;
    
    // 验证商户号
    if (appid !== merchant.merchantId) {
      return res.json(errorResponse(400, '商户号不匹配'));
    }
    
    // 计算账户余额
    const balance = await calculateMerchantBalance(merchant.merchantId);
    
    return res.json(successResponse({
      appid: merchant.merchantId,
      balance: balance.totalBalance.toString(),
      currency: 'INR',
      frozenAmount: balance.frozenAmount.toString(),
      availableAmount: balance.availableAmount.toString(),
      lastUpdateTime: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('查询余额失败:', error);
    return res.json(errorResponse(500, '系统错误'));
  }
});

/**
 * 计算商户余额
 */
async function calculateMerchantBalance(merchantId) {
  try {
    // 获取所有成功的存款订单
    const successfulDeposits = await Order.aggregate([
      {
        $match: {
          merchantId,
          type: 'DEPOSIT',
          status: 'SUCCESS'
        }
      },
      {
        $group: {
          _id: null,
          totalDeposits: { $sum: '$amount' }
        }
      }
    ]);
    
    // 获取所有成功的出款订单
    const successfulWithdrawals = await Order.aggregate([
      {
        $match: {
          merchantId,
          type: 'WITHDRAWAL',
          status: 'SUCCESS'
        }
      },
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: '$amount' }
        }
      }
    ]);
    
    // 获取处理中的订单（冻结金额）
    const processingOrders = await Order.aggregate([
      {
        $match: {
          merchantId,
          status: { $in: ['PENDING', 'PROCESSING', 'PENDING_VERIFICATION'] }
        }
      },
      {
        $group: {
          _id: null,
          frozenAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalDeposits = successfulDeposits[0]?.totalDeposits || 0;
    const totalWithdrawals = successfulWithdrawals[0]?.totalWithdrawals || 0;
    const frozenAmount = processingOrders[0]?.frozenAmount || 0;
    
    const totalBalance = totalDeposits - totalWithdrawals;
    const availableAmount = totalBalance - frozenAmount;
    
    return {
      totalBalance: Math.max(0, totalBalance),
      frozenAmount: Math.max(0, frozenAmount),
      availableAmount: Math.max(0, availableAmount)
    };
    
  } catch (error) {
    console.error('计算商户余额失败:', error);
    return {
      totalBalance: 0,
      frozenAmount: 0,
      availableAmount: 0
    };
  }
}

module.exports = router;
