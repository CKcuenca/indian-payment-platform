import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { User, UserRole } from '../types';
import { PermissionGuard } from '../components/PermissionGuard';
import { Permission } from '../types';

// 模拟用户数据 - 已清理，改为从API获取
// const mockUsers: User[] = [];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    role: UserRole.OPERATOR,
    password: '',
    confirmPassword: '',
    isActive: true,
    merchantId: '',
  });

  useEffect(() => {
    // 从API获取用户数据
    fetchUsers();
  }, []);

  // 获取用户数据
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // 调用真实API获取用户数据
      const response = await fetch('https://cashgit.com/api/users');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUsers(result.data);
        } else {
          setUsers([]);
        }
      } else {
        console.error('API请求失败:', response.status);
        setError('获取用户数据失败');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('获取用户数据失败:', err);
      setError('获取用户数据失败');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      displayName: '',
      email: '',
      role: UserRole.OPERATOR,
      password: '',
      confirmPassword: '',
      isActive: true,
      merchantId: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
      merchantId: user.merchantId || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.username === 'admin') {
      setError('不能删除超级管理员账户');
      return;
    }

    if (window.confirm('确定要删除这个用户吗？')) {
      try {
        setLoading(true);
        // 在实际项目中，这里会调用API删除用户
        setUsers(users.filter(user => user.id !== id));
        setError(null);
      } catch (err: any) {
        setError(err.message || '删除失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.username === 'admin') {
      setError('不能禁用超级管理员账户');
      return;
    }

    try {
      setLoading(true);
      // 在实际项目中，这里会调用API更新用户状态
      setUsers(users.map(user => 
        user.id === id ? { ...user, isActive: !user.isActive } : user
      ));
      setError(null);
    } catch (err: any) {
      setError(err.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.displayName || !formData.email) {
      setError('请填写所有必填字段');
      return;
    }

    if (!editingUser && (!formData.password || formData.password !== formData.confirmPassword)) {
      setError('密码不匹配');
      return;
    }

    if (formData.role === UserRole.MERCHANT && !formData.merchantId) {
      setError('商户用户必须设置商户ID');
      return;
    }

    try {
      setLoading(true);
      
      if (editingUser) {
        // 更新现有用户
        const updatedUser: User = {
          ...editingUser,
          username: formData.username,
          displayName: formData.displayName,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
          merchantId: formData.role === UserRole.MERCHANT ? formData.merchantId : undefined,
          updatedAt: new Date().toISOString(),
        };
        setUsers(users.map(user => 
          user.id === editingUser.id ? updatedUser : user
        ));
      } else {
        // 创建新用户
        const newUser: User = {
          id: Date.now().toString(),
          username: formData.username,
          displayName: formData.displayName,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
          merchantId: formData.role === UserRole.MERCHANT ? formData.merchantId : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          permissions: getDefaultPermissions(formData.role),
        };
        setUsers([...users, newUser]);
      }
      
      setDialogOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPermissions = (role: UserRole): Permission[] => {
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

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      case UserRole.OPERATOR:
        return 'primary';
      case UserRole.MERCHANT:
        return 'success';
      default:
        return 'default';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '管理员';
      case UserRole.OPERATOR:
        return '运营人员';
      case UserRole.MERCHANT:
        return '商户';
      default:
        return '未知';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{ 
            color: 'primary.main',
            fontWeight: 'bold',
            mb: 3
          }}
        >
          用户管理
        </Typography>
        <PermissionGuard permissions={[Permission.MANAGE_USERS]}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
          >
            添加用户
          </Button>
        </PermissionGuard>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
                          <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>用户</TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>角色</TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>邮箱</TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>商户ID</TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>状态</TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>最后登录</TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>创建时间</TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>操作</TableCell>
              </TableRow>
          </TableHead>
          <TableBody>
                          {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      暂无记录
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {user.displayName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {user.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.username}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getRoleDisplayName(user.role)}
                    color={getRoleColor(user.role) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.merchantId ? (
                    <Chip label={user.merchantId} size="small" variant="outlined" />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? '启用' : '禁用'}
                    color={user.isActive ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : '从未登录'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(user.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <PermissionGuard permissions={[Permission.MANAGE_USERS]}>
                      <Tooltip title={user.isActive ? '禁用用户' : '启用用户'}>
                        <IconButton
                          size="small"
                          color={user.isActive ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(user.id)}
                          disabled={user.username === 'admin'}
                        >
                          {user.isActive ? <LockIcon /> : <LockOpenIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑用户">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除用户">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.username === 'admin'}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </PermissionGuard>
                  </Box>
                </TableCell>
                              </TableRow>
              ))
              )}
            </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 2,
          flexShrink: 0,
          backgroundColor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          <Typography variant="h6" component="div">
            {editingUser ? '编辑用户' : '添加用户'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={() => setDialogOpen(false)}
              variant="outlined"
              size="small"
            >
              取消
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
              size="small"
              form="user-form"
            >
              {loading ? <CircularProgress size={16} /> : '保存'}
            </Button>
          </Box>
        </DialogTitle>
        <form id="user-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="用户名"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
                disabled={!!editingUser}
              />

              <TextField
                fullWidth
                label="显示名称"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                required
              />

              <TextField
                fullWidth
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />

              <FormControl fullWidth>
                <InputLabel>角色</InputLabel>
                <Select
                  value={formData.role}
                  label="角色"
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    role: e.target.value as UserRole,
                    merchantId: e.target.value === UserRole.MERCHANT ? prev.merchantId : ''
                  }))}
                  required
                >
                  <MenuItem value={UserRole.ADMIN}>管理员</MenuItem>
                  <MenuItem value={UserRole.OPERATOR}>运营人员</MenuItem>
                  <MenuItem value={UserRole.MERCHANT}>商户</MenuItem>
                </Select>
              </FormControl>

              {!editingUser && (
                <>
                  <TextField
                    fullWidth
                    label="密码"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingUser}
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="确认密码"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required={!editingUser}
                  />
                </>
              )}

              {formData.role === UserRole.MERCHANT && (
                <TextField
                  fullWidth
                  label="商户ID"
                  value={formData.merchantId}
                  onChange={(e) => setFormData(prev => ({ ...prev, merchantId: e.target.value }))}
                  required={formData.role === UserRole.MERCHANT}
                  placeholder="例如: MERCHANT001"
                />
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                  }
                  label="启用用户"
                />
              </Box>
            </Box>
          </DialogContent>
        </form>
      </Dialog>
    </Box>
  );
} 