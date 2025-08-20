const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// 模拟用户数据
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    email: 'admin@example.com',
    role: 'admin',
    permissions: [
      'VIEW_ALL_ORDERS',
      'VIEW_ALL_TRANSACTIONS', 
      'VIEW_ALL_MERCHANTS',
      'MANAGE_PAYMENT_PROVIDERS',
      'VIEW_MONITORING',
      'MANAGE_USERS'
    ],
    merchantId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    username: 'merchant',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    email: 'merchant@example.com',
    role: 'merchant',
    permissions: [
      'VIEW_OWN_ORDERS',
      'VIEW_OWN_TRANSACTIONS',
      'VIEW_OWN_MERCHANT_DATA'
    ],
    merchantId: 'merchant123',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 登录路由
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      });
    }

    // 查找用户
    const user = mockUsers.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 验证密码 (使用 bcrypt.compare 或直接比较，因为这是测试数据)
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        merchantId: user.merchantId 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
});

// 验证token中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '访问令牌缺失'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: '访问令牌无效'
      });
    }
    req.user = user;
    next();
  });
};

// 获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  const user = mockUsers.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在'
    });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    success: true,
    data: userWithoutPassword
  });
});

// 登出路由
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

module.exports = router; 