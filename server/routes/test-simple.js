const express = require('express');
const router = express.Router();

// 简单的测试路由
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test route working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
