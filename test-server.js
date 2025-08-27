const express = require('express');
const app = express();

app.use(express.json());

// 测试路由
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.post('/test', (req, res) => {
  res.json({ 
    message: 'POST test successful',
    body: req.body 
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`✅ 测试服务器运行在端口 ${PORT}`);
  console.log(`📍 测试地址: http://localhost:${PORT}/test`);
});

// 5秒后自动关闭
setTimeout(() => {
  console.log('🔄 测试服务器将在5秒后关闭...');
  process.exit(0);
}, 5000);
