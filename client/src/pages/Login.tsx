import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

// 移除测试用户数据，使用真实系统

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  
  // 组件挂载时清理认证状态
  useEffect(() => {
    // 如果用户已经登录，跳转到仪表盘
    if (isAuthenticated) {
      navigate('/');
      return;
    }
    
    // 清理可能存在的旧状态
    setCredentials({ username: '', password: '' });
    setError(null);
  }, [navigate, isAuthenticated]);

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('请输入用户名和密码');
      return;
    }

    setError(null);

    try {
      // 使用新的认证Hook进行登录
      await login(credentials.username, credentials.password);
      // 登录成功会自动跳转（通过useEffect监听isAuthenticated变化）
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '登录失败，请检查用户名和密码');
    }
  };



  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 2
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            CashGit - Indian Payment Platform
          </Typography>
          <Typography variant="body2" color="text.secondary">
            请登录您的账户
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <TextField
            fullWidth
            label="用户名"
            value={credentials.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            margin="normal"
            required
            disabled={isLoading}
            placeholder="请输入用户名或邮箱"
          />
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={credentials.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            margin="normal"
            required
            disabled={isLoading}
            placeholder="请输入密码"
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : '登录'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
