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
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalance,
  Smartphone,
  AccountBalanceWallet
} from '@mui/icons-material';
import { 
  PaymentProviderCategory
} from '../types';
import { paymentProviderService } from '../services/paymentProviderService';

// 支付账户数据（初始为空）
const mockPaymentAccounts: any[] = [];

export default function PaymentManagementNew() {
  const [accounts, setAccounts] = useState(mockPaymentAccounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  
  // 支付商分类状态
  const [categories, setCategories] = useState<PaymentProviderCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
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

  // 加载支付商分类
  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const data = await paymentProviderService.getCategories();
        setCategories(data);
      } catch (err) {
        setError('加载支付商分类失败');
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  // 根据类型过滤支付商
  const getProvidersByType = (type: string) => {
    return categories.find(cat => cat.id === type)?.providers || [];
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

      {/* 支付商分类概览 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          支付商分类概览
        </Typography>
        {categoriesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {categories.map((category) => (
              <Box key={category.id} sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getTypeIcon(category.type)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {category.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {category.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {category.providers.map((provider) => (
                        <Chip
                          key={provider.id}
                          label={provider.displayName}
                          size="small"
                          color={getProviderColor(provider.name)}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 支付账户列表 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          支付账户管理
        </Typography>
        
        {accounts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <AccountBalance sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small">
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
    </Box>
  );
}
