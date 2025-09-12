const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const Merchant = require('../models/merchant');
const SecurityAudit = require('../services/security/security-audit');

const securityAudit = new SecurityAudit();

/**
 * 获取商户IP白名单配置
 * GET /api/ip-whitelist?merchantId=xxx
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 获取merchantId - 支持admin查询任意商户，普通用户只能查询自己的
    let merchantId;
    if (req.user.role === 'admin') {
      // admin用户可以通过query参数查询任意商户
      merchantId = req.query.merchantId;
      if (!merchantId) {
        return res.status(400).json({
          success: false,
          error: '管理员查询需要提供merchantId参数'
        });
      }
    } else {
      // 普通用户只能查询自己的
      merchantId = req.user.merchantId;
    }
    
    const merchant = await Merchant.findOne({ merchantId });
    
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    const ipWhitelist = merchant.security.ipWhitelist || {
      enabled: false,
      strictMode: false,
      allowedIPs: [],
      accessRules: {
        blockUnknownIPs: true,
        maxFailedAttempts: 5,
        lockoutDuration: 300
      }
    };
    
    // 隐藏敏感信息（如内部ID）
    const sanitizedIPs = ipWhitelist.allowedIPs.map(ip => ({
      id: ip._id,
      ip: ip.ip,
      mask: ip.mask,
      description: ip.description,
      status: ip.status,
      addedAt: ip.addedAt,
      lastUsed: ip.lastUsed,
      usageCount: ip.usageCount || 0
    }));
    
    res.json({
      success: true,
      data: {
        enabled: ipWhitelist.enabled,
        strictMode: ipWhitelist.strictMode,
        allowedIPs: sanitizedIPs,
        accessRules: ipWhitelist.accessRules,
        totalIPs: sanitizedIPs.length,
        activeIPs: sanitizedIPs.filter(ip => ip.status === 'ACTIVE').length
      }
    });
    
  } catch (error) {
    console.error('获取IP白名单失败:', error);
    res.status(500).json({
      success: false,
      error: '获取IP白名单失败'
    });
  }
});

/**
 * 更新IP白名单总配置
 * PUT /api/ip-whitelist/config
 */
router.put('/config', authenticateToken, async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { enabled, strictMode, accessRules } = req.body;
    
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    // 初始化IP白名单配置
    if (!merchant.security.ipWhitelist) {
      merchant.security.ipWhitelist = {
        enabled: false,
        strictMode: false,
        allowedIPs: [],
        accessRules: {
          blockUnknownIPs: true,
          maxFailedAttempts: 5,
          lockoutDuration: 300
        }
      };
    }
    
    // 更新配置
    if (typeof enabled === 'boolean') {
      merchant.security.ipWhitelist.enabled = enabled;
    }
    
    if (typeof strictMode === 'boolean') {
      merchant.security.ipWhitelist.strictMode = strictMode;
    }
    
    if (accessRules && typeof accessRules === 'object') {
      merchant.security.ipWhitelist.accessRules = {
        ...merchant.security.ipWhitelist.accessRules,
        ...accessRules
      };
    }
    
    await merchant.save();
    
    // 记录安全日志
    await securityAudit.logSecurityEvent('IP_WHITELIST_CONFIG_UPDATED', {
      merchantId,
      config: { enabled, strictMode, accessRules },
      updatedBy: req.user.username || 'unknown'
    }, 'INFO');
    
    res.json({
      success: true,
      message: 'IP白名单配置更新成功',
      data: {
        enabled: merchant.security.ipWhitelist.enabled,
        strictMode: merchant.security.ipWhitelist.strictMode,
        accessRules: merchant.security.ipWhitelist.accessRules
      }
    });
    
  } catch (error) {
    console.error('更新IP白名单配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新IP白名单配置失败'
    });
  }
});

/**
 * 添加IP到白名单
 * POST /api/ip-whitelist/add
 */
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { ip, mask = 32, description = '' } = req.body;
    
    // 验证IP格式
    if (!isValidIP(ip)) {
      return res.status(400).json({
        success: false,
        error: 'IP地址格式不正确'
      });
    }
    
    // 验证CIDR掩码
    if (mask < 0 || mask > 32) {
      return res.status(400).json({
        success: false,
        error: 'CIDR掩码必须在0-32之间'
      });
    }
    
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    const result = merchant.addAllowedIP(
      ip, 
      mask, 
      description, 
      req.user.username || 'admin'
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }
    
    await merchant.save();
    
    // 记录安全日志
    await securityAudit.logSecurityEvent('IP_ADDED_TO_WHITELIST', {
      merchantId,
      ip,
      mask,
      description,
      addedBy: req.user.username || 'admin'
    }, 'INFO');
    
    res.json({
      success: true,
      message: 'IP添加到白名单成功',
      data: {
        ip,
        mask,
        description
      }
    });
    
  } catch (error) {
    console.error('添加IP到白名单失败:', error);
    res.status(500).json({
      success: false,
      error: '添加IP到白名单失败'
    });
  }
});

/**
 * 从白名单删除IP
 * DELETE /api/ip-whitelist/:ipId
 */
router.delete('/:ipId', authenticateToken, async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { ipId } = req.params;
    
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    // 记录要删除的IP信息用于日志
    const ipToDelete = merchant.security.ipWhitelist?.allowedIPs?.find(
      item => item._id.toString() === ipId
    );
    
    const result = merchant.removeAllowedIP(ipId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }
    
    await merchant.save();
    
    // 记录安全日志
    await securityAudit.logSecurityEvent('IP_REMOVED_FROM_WHITELIST', {
      merchantId,
      ipId,
      ipInfo: ipToDelete,
      removedBy: req.user.username || 'admin'
    }, 'WARN');
    
    res.json({
      success: true,
      message: 'IP从白名单删除成功'
    });
    
  } catch (error) {
    console.error('删除IP失败:', error);
    res.status(500).json({
      success: false,
      error: '删除IP失败'
    });
  }
});

/**
 * 更新IP状态
 * PUT /api/ip-whitelist/:ipId/status
 */
router.put('/:ipId/status', authenticateToken, async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { ipId } = req.params;
    const { status } = req.body;
    
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '状态值必须是ACTIVE或INACTIVE'
      });
    }
    
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    const result = merchant.updateIPStatus(ipId, status);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }
    
    await merchant.save();
    
    // 记录安全日志
    await securityAudit.logSecurityEvent('IP_STATUS_UPDATED', {
      merchantId,
      ipId,
      newStatus: status,
      updatedBy: req.user.username || 'admin'
    }, 'INFO');
    
    res.json({
      success: true,
      message: 'IP状态更新成功'
    });
    
  } catch (error) {
    console.error('更新IP状态失败:', error);
    res.status(500).json({
      success: false,
      error: '更新IP状态失败'
    });
  }
});

/**
 * 测试IP是否在白名单中
 * POST /api/ip-whitelist/test
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    const { testIP } = req.body;
    
    if (!isValidIP(testIP)) {
      return res.status(400).json({
        success: false,
        error: 'IP地址格式不正确'
      });
    }
    
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    const result = merchant.isIPAllowed(testIP);
    
    res.json({
      success: true,
      data: {
        testIP,
        allowed: result.allowed,
        reason: result.reason,
        matchedEntry: result.matchedEntry ? {
          ip: result.matchedEntry.ip,
          mask: result.matchedEntry.mask,
          description: result.matchedEntry.description
        } : null
      }
    });
    
  } catch (error) {
    console.error('IP测试失败:', error);
    res.status(500).json({
      success: false,
      error: 'IP测试失败'
    });
  }
});

/**
 * 获取IP访问统计
 * GET /api/ip-whitelist/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    const merchant = await Merchant.findOne({ merchantId });
    
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: '商户不存在'
      });
    }
    
    const ipWhitelist = merchant.security.ipWhitelist;
    if (!ipWhitelist || !ipWhitelist.allowedIPs) {
      return res.json({
        success: true,
        data: {
          totalIPs: 0,
          activeIPs: 0,
          totalUsage: 0,
          lastUsed: null,
          mostUsedIP: null
        }
      });
    }
    
    const allowedIPs = ipWhitelist.allowedIPs;
    const totalIPs = allowedIPs.length;
    const activeIPs = allowedIPs.filter(ip => ip.status === 'ACTIVE').length;
    const totalUsage = allowedIPs.reduce((sum, ip) => sum + (ip.usageCount || 0), 0);
    
    // 找到最近使用的IP
    const lastUsedIP = allowedIPs
      .filter(ip => ip.lastUsed)
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))[0];
    
    // 找到使用最多的IP
    const mostUsedIP = allowedIPs
      .filter(ip => ip.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))[0];
    
    res.json({
      success: true,
      data: {
        totalIPs,
        activeIPs,
        totalUsage,
        lastUsed: lastUsedIP ? {
          ip: lastUsedIP.ip,
          lastUsed: lastUsedIP.lastUsed,
          usageCount: lastUsedIP.usageCount || 0
        } : null,
        mostUsedIP: mostUsedIP ? {
          ip: mostUsedIP.ip,
          usageCount: mostUsedIP.usageCount || 0,
          description: mostUsedIP.description
        } : null
      }
    });
    
  } catch (error) {
    console.error('获取IP统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取IP统计失败'
    });
  }
});

/**
 * 验证IP地址格式
 */
function isValidIP(ip) {
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

module.exports = router;