import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import { UserRole, Permission } from '../types';

// 测试用户数据（实际项目中应该从后端获取）
const testUsers = [
  {
    username: 'admin',
    password: 'Yyw11301107*',
    role: UserRole.ADMIN,
    displayName: '管理员'
  },
  {
    username: 'operator',
    password: 'operator123',
    role: UserRole.OPERATOR,
    displayName: '运营人员'
  },
  {
    username: 'merchant',
    password: 'merchant123',
    role: UserRole.MERCHANT,
    displayName: '商户'
  }
];

export default function Login() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTestUser, setSelectedTestUser] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleTestUserSelect = (username: string) => {
    const testUser = testUsers.find(user => user.username === username);
    if (testUser) {
      setCredentials({
        username: testUser.username,
        password: testUser.password
      });
      setSelectedTestUser(username);
      setError(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 模拟登录成功
      const testUser = testUsers.find(user => 
        user.username === credentials.username && 
        user.password === credentials.password
      );

      if (testUser) {
        // 模拟登录成功，创建用户数据
        const mockUser = {
          id: '1',
          username: testUser.username,
          email: `${testUser.username}@example.com`,
          role: testUser.role,
          permissions: getPermissionsForRole(testUser.role),
          status: 'ACTIVE' as const,
          createdAt: new Date().toISOString(),
          merchantId: testUser.role === UserRole.MERCHANT ? 'MERCHANT001' : undefined
        };

        // 模拟存储用户数据
        localStorage.setItem('user_data', JSON.stringify(mockUser));
        localStorage.setItem('auth_token', 'mock_token_' + Date.now());
        
        // 跳转到仪表盘
        navigate('/');
      } else {
        setError('用户名或密码错误');
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 根据角色获取权限
  const getPermissionsForRole = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return [
          Permission.VIEW_ALL_MERCHANTS,
          Permission.MANAGE_MERCHANTS,
          Permission.VIEW_PAYMENT_CONFIG,
          Permission.MANAGE_PAYMENT_CONFIG,
          Permission.VIEW_ALL_ORDERS,
          Permission.VIEW_ALL_TRANSACTIONS,
          Permission.MANAGE_USERS,
          Permission.SYSTEM_MONITORING
        ];
      case UserRole.OPERATOR:
        return [
          Permission.VIEW_ALL_MERCHANTS,
          Permission.VIEW_ALL_ORDERS,
          Permission.VIEW_ALL_TRANSACTIONS
        ];
      case UserRole.MERCHANT:
        return [
          Permission.VIEW_OWN_ORDERS,
          Permission.VIEW_OWN_TRANSACTIONS
        ];
      default:
        return [];
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
            disabled={loading}
          />
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={credentials.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            margin="normal"
            required
            disabled={loading}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : '登录'}
          </Button>
        </form>

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            测试账户
          </Typography>
        </Divider>

        <FormControl fullWidth>
          <InputLabel>选择测试账户</InputLabel>
          <Select
            value={selectedTestUser}
            label="选择测试账户"
            onChange={(e) => handleTestUserSelect(e.target.value)}
          >
            {testUsers.map((user) => (
              <MenuItem key={user.username} value={user.username}>
                {user.displayName} ({user.username})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    </Box>
  );
}
