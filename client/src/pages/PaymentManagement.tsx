import React, { useState } from 'react';
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
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AccountBalance,
  Speed,
  TrendingUp,
  Error
} from '@mui/icons-material';
import { PermissionGuard } from '../components/PermissionGuard';
import { SensitiveDataGuard } from '../components/PermissionGuard';
import { Permission } from '../types';

// 模拟支付账户数据（合并后的数据结构）
const mockPaymentAccounts = [
  {
    _id: '1',
    accountName: 'AirPay主账户',
    provider: {
      name: 'airpay',
      accountId: 'AIRPAY001',
      apiKey: 'ak_test_123456789',
      secretKey: 'sk_test_987654321',
      environment: 'sandbox'
    },
    limits: {
      dailyLimit: 5000000,
      monthlyLimit: 50000000,
      singleTransactionLimit: 500000,
      minTransactionAmount: 100
    },
    usage: {
      dailyUsed: 1000000,
      monthlyUsed: 10000000,
      lastResetDate: new Date().toISOString()
    },
    status: 'ACTIVE',
    priority: 1,
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    webhookUrl: 'https://your-domain.com/webhook/airpay',
    description: 'AirPay主要支付账户',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    _id: '2',
    accountName: 'Cashfree备用账户',
    provider: {
      name: 'cashfree',
      accountId: 'CASHFREE001',
      apiKey: 'cf_test_123456789',
      secretKey: 'cf_sk_test_987654321',
      environment: 'sandbox'
    },
    limits: {
      dailyLimit: 3000000,
      monthlyLimit: 30000000,
      singleTransactionLimit: 300000,
      minTransactionAmount: 100
    },
    usage: {
      dailyUsed: 500000,
      monthlyUsed: 5000000,
      lastResetDate: new Date().toISOString()
    },
    status: 'ACTIVE',
    priority: 2,
    fees: {
      transactionFee: 0.6,
      fixedFee: 0
    },
    webhookUrl: 'https://your-domain.com/webhook/cashfree',
    description: 'Cashfree备用支付账户',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

export default function PaymentManagement() {
  const [accounts, setAccounts] = useState(mockPaymentAccounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  
  const [formData, setFormData] = useState({
    accountName: '',
    providerName: '',
    accountId: '',
    apiKey: '',
    secretKey: '',
    environment: 'sandbox',
    webhookUrl: '',
    description: '',
    dailyLimit: 1000000,
    monthlyLimit: 10000000,
    singleTransactionLimit: 100000,
    minTransactionAmount: 100,
    transactionFee: 0.5,
    fixedFee: 0,
    priority: 1,
    status: 'ACTIVE'
  });

  const handleAddAccount = () => {
    setEditingAccount(null);
    setFormData({
      accountName: '',
      providerName: '',
      accountId: '',
      apiKey: '',
      secretKey: '',
      environment: 'sandbox',
      webhookUrl: '',
      description: '',
      dailyLimit: 1000000,
      monthlyLimit: 10000000,
      singleTransactionLimit: 100000,
      minTransactionAmount: 100,
      transactionFee: 0.5,
      fixedFee: 0,
      priority: 1,
      status: 'ACTIVE'
    });
    setDialogOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.accountName,
      providerName: account.provider.name,
      accountId: account.provider.accountId,
      apiKey: account.provider.apiKey,
      secretKey: account.provider.secretKey,
      environment: account.provider.environment,
      webhookUrl: account.webhookUrl,
      description: account.description,
      dailyLimit: account.limits.dailyLimit,
      monthlyLimit: account.limits.monthlyLimit,
      singleTransactionLimit: account.limits.singleTransactionLimit,
      minTransactionAmount: account.limits.minTransactionAmount,
      transactionFee: account.fees.transactionFee,
      fixedFee: account.fees.fixedFee,
      priority: account.priority,
      status: account.status
    });
    setDialogOpen(true);
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('确定要删除这个支付账户吗？')) {
      setAccounts(prev => prev.filter(account => account._id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const accountData = {
        accountName: formData.accountName,
        provider: {
          name: formData.providerName,
          accountId: formData.accountId,
          apiKey: formData.apiKey,
          secretKey: formData.secretKey,
          environment: formData.environment
        },
        limits: {
          dailyLimit: formData.dailyLimit,
          monthlyLimit: formData.monthlyLimit,
          singleTransactionLimit: formData.singleTransactionLimit,
          minTransactionAmount: formData.minTransactionAmount
        },
        fees: {
          transactionFee: formData.transactionFee,
          fixedFee: formData.fixedFee
        },
        webhookUrl: formData.webhookUrl,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        usage: {
          dailyUsed: 0,
          monthlyUsed: 0,
          lastResetDate: new Date().toISOString()
        }
      };

      if (editingAccount) {
        // 更新现有账户
        setAccounts(prev => prev.map(account => 
          account._id === editingAccount._id 
            ? { ...account, ...accountData, updatedAt: new Date().toISOString() }
            : account
        ));
      } else {
        // 添加新账户
        const newAccount = {
          _id: Date.now().toString(),
          ...accountData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setAccounts(prev => [...prev, newAccount]);
      }
      
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      setError('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getProviderColor = (providerName: string) => {
    const colors: {[key: string]: string} = {
      'airpay': 'primary',
      'cashfree': 'secondary',
      'razorpay': 'success',
      'paytm': 'warning',
      'phonepe': 'info'
    };
    return colors[providerName.toLowerCase()] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: {[key: string]: string} = {
      'ACTIVE': 'success',
      'INACTIVE': 'error',
      'SUSPENDED': 'warning'
    };
    return colors[status] || 'default';
  };

  const getRemainingLimit = (account: any, type: 'daily' | 'monthly') => {
    const limit = type === 'daily' ? account.limits.dailyLimit : account.limits.monthlyLimit;
    const used = type === 'daily' ? account.usage.dailyUsed : account.usage.monthlyUsed;
    return Math.max(0, limit - used);
  };

  const getUsagePercentage = (account: any, type: 'daily' | 'monthly') => {
    const limit = type === 'daily' ? account.limits.dailyLimit : account.limits.monthlyLimit;
    const used = type === 'daily' ? account.usage.dailyUsed : account.usage.monthlyUsed;
    return (used / limit) * 100;
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{ 
          color: 'primary.main',
          fontWeight: 'bold',
          mb: 1
        }}
      >
        支付账户管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 统计卡片 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  总账户数
                </Typography>
                <Typography variant="h4">
                  {accounts.length}
                </Typography>
              </Box>
              <AccountBalance color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  活跃账户
                </Typography>
                <Typography variant="h4">
                  {accounts.filter(a => a.status === 'ACTIVE').length}
                </Typography>
              </Box>
              <TrendingUp color="success" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  今日交易量
                </Typography>
                <Typography variant="h4">
                  ₹{(accounts.reduce((sum, a) => sum + a.usage.dailyUsed, 0) / 100).toLocaleString()}
                </Typography>
              </Box>
              <Speed color="info" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  平均费率
                </Typography>
                <Typography variant="h4">
                  {(accounts.reduce((sum, a) => sum + a.fees.transactionFee, 0) / accounts.length).toFixed(2)}%
                </Typography>
              </Box>
              <Error color="warning" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">支付账户列表</Typography>
        <PermissionGuard permissions={[Permission.MANAGE_PAYMENT_CONFIG]}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddAccount}
          >
            添加支付账户
          </Button>
        </PermissionGuard>
      </Box>

      {/* 账户列表 */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>账户名称</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>支付商</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>账户ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>API Key</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>限额使用</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>费率</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>优先级</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    暂无支付账户
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account._id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {account.accountName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {account.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={account.provider.name.toUpperCase()}
                      color={getProviderColor(account.provider.name) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{account.provider.accountId}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SensitiveDataGuard showSensitiveData={showSecrets[account._id]}>
                        {showSecrets[account._id] ? account.provider.apiKey : '••••••••••••••••'}
                      </SensitiveDataGuard>
                      <IconButton
                        size="small"
                        onClick={() => toggleSecretVisibility(account._id)}
                      >
                        {showSecrets[account._id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ minWidth: 120 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">日限额</Typography>
                        <Typography variant="body2">
                          {getUsagePercentage(account, 'daily').toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={getUsagePercentage(account, 'daily')}
                        color={getUsagePercentage(account, 'daily') > 80 ? 'error' : 'primary'}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        ₹{(getRemainingLimit(account, 'daily') / 100).toLocaleString()} 剩余
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {account.fees.transactionFee}% + ₹{account.fees.fixedFee}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={account.status} 
                      size="small" 
                      color={getStatusColor(account.status) as any}
                    />
                  </TableCell>
                  <TableCell>{account.priority}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEditAccount(account)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteAccount(account._id)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 添加/编辑账户对话框 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="lg" 
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
            {editingAccount ? '编辑支付账户' : '添加支付账户'}
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
              form="payment-account-form"
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? '保存中...' : '保存'}
            </Button>
          </Box>
        </DialogTitle>
        <form id="payment-account-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 基本信息 */}
              <Box>
                <Typography variant="h6" gutterBottom>基本信息</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="账户名称"
                    value={formData.accountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                    required
                  />
                  <FormControl fullWidth required>
                    <InputLabel>支付商</InputLabel>
                    <Select
                      value={formData.providerName}
                      label="支付商"
                      onChange={(e) => setFormData(prev => ({ ...prev, providerName: e.target.value }))}
                    >
                      <MenuItem value="airpay">AirPay</MenuItem>
                      <MenuItem value="cashfree">Cashfree</MenuItem>
                      <MenuItem value="razorpay">Razorpay</MenuItem>
                      <MenuItem value="paytm">Paytm</MenuItem>
                      <MenuItem value="phonepe">PhonePe</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="账户ID"
                    value={formData.accountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                    required
                  />
                  <FormControl fullWidth required>
                    <InputLabel>环境</InputLabel>
                    <Select
                      value={formData.environment}
                      label="环境"
                      onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
                    >
                      <MenuItem value="sandbox">沙盒环境</MenuItem>
                      <MenuItem value="production">生产环境</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="API Key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Secret Key"
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                    required
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Webhook URL"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    placeholder="https://your-domain.com/webhook"
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="描述"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    multiline
                    rows={2}
                  />
                </Box>
              </Box>

              {/* 限额设置 */}
              <Box>
                <Typography variant="h6" gutterBottom>限额设置</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="日限额 (₹)"
                    type="number"
                    value={formData.dailyLimit / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) * 100 }))}
                    required
                  />
                  <TextField
                    fullWidth
                    label="月限额 (₹)"
                    type="number"
                    value={formData.monthlyLimit / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: parseInt(e.target.value) * 100 }))}
                    required
                  />
                  <TextField
                    fullWidth
                    label="单笔限额 (₹)"
                    type="number"
                    value={formData.singleTransactionLimit / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, singleTransactionLimit: parseInt(e.target.value) * 100 }))}
                    required
                  />
                  <TextField
                    fullWidth
                    label="最小金额 (₹)"
                    type="number"
                    value={formData.minTransactionAmount / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, minTransactionAmount: parseInt(e.target.value) * 100 }))}
                    required
                  />
                </Box>
              </Box>

              {/* 费用设置 */}
              <Box>
                <Typography variant="h6" gutterBottom>费用设置</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                  <TextField
                    fullWidth
                    label="交易费率 (%)"
                    type="number"
                    value={formData.transactionFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, transactionFee: parseFloat(e.target.value) }))}
                    inputProps={{ step: 0.01, min: 0 }}
                    required
                  />
                  <TextField
                    fullWidth
                    label="固定费用 (₹)"
                    type="number"
                    value={formData.fixedFee / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, fixedFee: parseInt(e.target.value) * 100 }))}
                    required
                  />
                  <TextField
                    fullWidth
                    label="优先级"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Box>
              </Box>

              {/* 状态设置 */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.status === 'ACTIVE'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        status: e.target.checked ? 'ACTIVE' : 'INACTIVE' 
                      }))}
                    />
                  }
                  label="启用账户"
                />
              </Box>
            </Box>
          </DialogContent>
        </form>
      </Dialog>
    </Box>
  );
}
