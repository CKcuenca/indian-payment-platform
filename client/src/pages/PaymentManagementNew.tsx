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
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Smartphone,
  AccountBalanceWallet
} from '@mui/icons-material';


// 模拟支付账户数据
const mockPaymentAccounts = [
  {
    _id: '1',
    accountName: 'AirPay主账户',
    provider: {
      name: 'airpay',
      type: 'native',
      accountId: 'AP001',
      apiKey: 'ak_123456789',
      secretKey: 'sk_987654321',
      environment: 'production'
    },
    description: 'AirPay主要支付账户',
    limits: {
      dailyLimit: 1000000,
      monthlyLimit: 10000000,
      singleTransactionLimit: 100000,
      minTransactionAmount: 100
    },
    fees: {
      transactionFee: 0.5,
      fixedFee: 0
    },
    priority: 1,
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    _id: '2',
    accountName: 'UniSpay唤醒账户',
    provider: {
      name: 'unispay',
      type: 'wakeup',
      accountId: 'US001',
      apiKey: 'uk_123456789',
      secretKey: 'sk_987654321',
      environment: 'production'
    },
    description: 'UniSpay唤醒支付账户',
    limits: {
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      singleTransactionLimit: 50000,
      minTransactionAmount: 100
    },
    fees: {
      transactionFee: 0.6,
      fixedFee: 0
    },
    priority: 2,
    status: 'ACTIVE',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];

export default function PaymentManagementNew() {
  const [error, setError] = useState<string | null>(null);
  
  // 支付账户状态
  const [accounts, setAccounts] = useState(mockPaymentAccounts);
  const [loading, setLoading] = useState(false);
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    accountName: '',
    providerName: '',
    type: 'native',
    accountId: '',
    apiKey: '',
    secretKey: '',
    environment: 'sandbox',
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
      type: 'native',
      accountId: '',
      apiKey: '',
      secretKey: '',
      environment: 'sandbox',
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

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.accountName,
      providerName: account.provider.name,
      type: account.provider.type,
      accountId: account.provider.accountId,
      apiKey: account.provider.apiKey,
      secretKey: account.provider.secretKey,
      environment: account.provider.environment,
      description: account.description || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const accountData = {
        accountName: formData.accountName,
        provider: {
          name: formData.providerName,
          type: formData.type,
          accountId: formData.accountId,
          apiKey: formData.apiKey,
          secretKey: formData.secretKey,
          environment: formData.environment
        },
        description: formData.description,
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
        priority: formData.priority,
        status: formData.status
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

  const handleDelete = (accountId: string) => {
    if (window.confirm('确定要删除这个支付账户吗？')) {
      setAccounts(prev => prev.filter(account => account._id !== accountId));
    }
  };



  const getProviderColor = (providerName: string) => {
    const colors: {[key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'} = {
      'airpay': 'primary',
      'cashfree': 'secondary',
      'razorpay': 'success',
      'paytm': 'warning',
      'passpay': 'error',
      'unispay': 'info'
    };
    return colors[providerName.toLowerCase()] || 'default';
  };

  const getTypeLabel = (type: string) => {
    const labels: {[key: string]: string} = {
      'native': '原生',
      'wakeup': '唤醒'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'wakeup') {
      return <Smartphone color="primary" />;
    }
    return <AccountBalanceWallet color="secondary" />;
  };



  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          支付管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAccount}
          sx={{ borderRadius: 2 }}
        >
          添加支付账户
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}



      {/* 支付账户列表 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          支付账户管理
        </Typography>
        
        {accounts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无支付账户
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              点击上方"添加支付账户"按钮开始配置
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>账户名称</TableCell>
                  <TableCell>支付商</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>环境</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>优先级</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account._id}>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell>
                      <Chip
                        label={account.provider.name}
                        color={getProviderColor(account.provider.name)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTypeIcon(account.provider.type)}
                        <Typography variant="body2">
                          {getTypeLabel(account.provider.type)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.provider.environment}
                        color={account.provider.environment === 'production' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.status}
                        color={account.status === 'ACTIVE' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{account.priority}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleEdit(account)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(account._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 添加/编辑账户对话框 */}
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
            >
              {loading ? <CircularProgress size={16} /> : '保存'}
            </Button>
          </Box>
        </DialogTitle>
        <form id="payment-account-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 基本信息 */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  基本信息
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="账户名称"
                    value={formData.accountName}
                    onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth required>
                    <InputLabel>支付商类型</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const currentProvider = formData.providerName;
                        
                        // 检查当前选中的支付商是否在新类型中可用
                        let shouldResetProvider = false;
                        if (newType === 'native') {
                          shouldResetProvider = !['airpay', 'cashfree', 'razorpay', 'paytm'].includes(currentProvider);
                        } else if (newType === 'wakeup') {
                          shouldResetProvider = !['unispay', 'passpay'].includes(currentProvider);
                        }
                        
                        setFormData({
                          ...formData, 
                          type: newType, 
                          providerName: shouldResetProvider ? '' : currentProvider
                        });
                      }}
                    >
                      <MenuItem value="native">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountBalanceWallet color="secondary" />
                          原生支付商
                        </Box>
                      </MenuItem>
                      <MenuItem value="wakeup">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Smartphone color="primary" />
                          唤醒支付商
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth required>
                    <InputLabel>支付商</InputLabel>
                    <Select
                      value={formData.providerName}
                      onChange={(e) => setFormData({...formData, providerName: e.target.value})}
                    >
                      {formData.type === 'native' ? (
                        <>
                          <MenuItem value="airpay">AirPay</MenuItem>
                          <MenuItem value="cashfree">CashFree</MenuItem>
                          <MenuItem value="razorpay">Razorpay</MenuItem>
                          <MenuItem value="paytm">Paytm</MenuItem>
                        </>
                      ) : (
                        <>
                          <MenuItem value="unispay">UniSpay</MenuItem>
                          <MenuItem value="passpay">PassPay</MenuItem>
                        </>
                      )}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth required>
                    <InputLabel>环境</InputLabel>
                    <Select
                      value={formData.environment}
                      onChange={(e) => setFormData({...formData, environment: e.target.value})}
                    >
                      <MenuItem value="sandbox">沙箱环境</MenuItem>
                      <MenuItem value="production">生产环境</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* 配置信息 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  配置信息
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="账户ID"
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="API密钥"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="密钥"
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({...formData, secretKey: e.target.value})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="优先级"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Box>
              </Box>

              {/* 限额配置 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  限额配置
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="日限额"
                    type="number"
                    value={formData.dailyLimit}
                    onChange={(e) => setFormData({...formData, dailyLimit: parseInt(e.target.value)})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="月限额"
                    type="number"
                    value={formData.monthlyLimit}
                    onChange={(e) => setFormData({...formData, monthlyLimit: parseInt(e.target.value)})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="单笔限额"
                    type="number"
                    value={formData.singleTransactionLimit}
                    onChange={(e) => setFormData({...formData, singleTransactionLimit: parseInt(e.target.value)})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="最小交易金额"
                    type="number"
                    value={formData.minTransactionAmount}
                    onChange={(e) => setFormData({...formData, minTransactionAmount: parseInt(e.target.value)})}
                    required
                  />
                </Box>
              </Box>

              {/* 费率配置 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  费率配置
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="交易费率 (%)"
                    type="number"
                    value={formData.transactionFee}
                    onChange={(e) => setFormData({...formData, transactionFee: parseFloat(e.target.value)})}
                    inputProps={{ step: 0.01, min: 0 }}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="固定费用"
                    type="number"
                    value={formData.fixedFee}
                    onChange={(e) => setFormData({...formData, fixedFee: parseFloat(e.target.value)})}
                    inputProps={{ step: 0.01, min: 0 }}
                  />
                </Box>
              </Box>

              {/* 状态配置 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  状态配置
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.status === 'ACTIVE'}
                        onChange={(e) => setFormData({
                          ...formData, 
                          status: e.target.checked ? 'ACTIVE' : 'INACTIVE'
                        })}
                      />
                    }
                    label="启用账户"
                  />
                </Box>
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="描述"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </Box>

            </Box>
          </DialogContent>
        </form>
      </Dialog>
    </Box>
  );
}
