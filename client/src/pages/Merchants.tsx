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

  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,

  Divider,
} from '@mui/material';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AccountBalance as AccountBalanceIcon,

  History as HistoryIcon,
} from '@mui/icons-material';
import { Merchant } from '../types';
import { PermissionGuard } from '../components/PermissionGuard';
import { Permission } from '../types';
import { formatAmount, formatDate as formatDateUtil } from '../utils/formatters';

// 模拟商户数据
const mockMerchants: Merchant[] = [
  {
    merchantId: 'MERCHANT001',
    name: '游戏公司A',
    email: 'gamea@example.com',
    phone: '+91 9876543210',
    status: 'ACTIVE',
    balance: 140000.50,
    defaultProvider: 'AirPay',
    depositFee: 0.5,
    withdrawalFee: 1.0,
    minDeposit: 100,
    maxDeposit: 100000,
    minWithdrawal: 500,
    maxWithdrawal: 50000,
    limits: {
      dailyLimit: 100000000,      // 100万
      monthlyLimit: 1000000000,   // 1000万
      singleTransactionLimit: 10000000,  // 10万
    },
    usage: {
      dailyUsed: 25000000,        // 25万
      monthlyUsed: 350000000,     // 350万
      lastResetDate: '2025-08-08T00:00:00Z',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    merchantId: 'MERCHANT002',
    name: '游戏公司B',
    email: 'gameb@example.com',
    phone: '+91 9876543211',
    status: 'ACTIVE',
    balance: 97000.00,
    defaultProvider: 'Cashfree',
    depositFee: 0.3,
    withdrawalFee: 0.8,
    minDeposit: 200,
    maxDeposit: 200000,
    minWithdrawal: 1000,
    maxWithdrawal: 100000,
    limits: {
      dailyLimit: 200000000,      // 200万
      monthlyLimit: 2000000000,   // 2000万
      singleTransactionLimit: 20000000,  // 20万
    },
    usage: {
      dailyUsed: 45000000,        // 45万
      monthlyUsed: 680000000,     // 680万
      lastResetDate: '2025-08-08T00:00:00Z',
    },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-14T15:20:00Z',
  },
  {
    merchantId: 'MERCHANT003',
    name: '游戏公司C',
    email: 'gamec@example.com',
    phone: '+91 9876543212',
    status: 'SUSPENDED',
    balance: 25000.00,
    defaultProvider: 'AirPay',
    depositFee: 0.4,
    withdrawalFee: 0.9,
    minDeposit: 150,
    maxDeposit: 150000,
    minWithdrawal: 750,
    maxWithdrawal: 75000,
    limits: {
      dailyLimit: 50000000,       // 50万
      monthlyLimit: 500000000,    // 500万
      singleTransactionLimit: 5000000,   // 5万
    },
    usage: {
      dailyUsed: 0,             // 0
      monthlyUsed: 0,           // 0
      lastResetDate: '2025-08-08T00:00:00Z',
    },
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-10T09:15:00Z',
  },
];

export default function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>(mockMerchants);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [showBalance, setShowBalance] = useState<{ [key: string]: boolean }>({});

  const [formData, setFormData] = useState({
    merchantId: '',
    name: '',
    email: '',
    phone: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    defaultProvider: 'AirPay',
    depositFee: 0.5,
    withdrawalFee: 1.0,
    minDeposit: 100,
    maxDeposit: 100000,
    minWithdrawal: 500,
    maxWithdrawal: 50000,
    limits: {
      dailyLimit: 100000000,
      monthlyLimit: 1000000000,
      singleTransactionLimit: 10000000,
    },
  });

  useEffect(() => {
    // 在实际项目中，这里会从API获取商户数据
    setLoading(false);
  }, []);

  const handleAddNew = () => {
    setEditingMerchant(null);
    setFormData({
      merchantId: '',
      name: '',
      email: '',
      phone: '',
      status: 'ACTIVE',
      defaultProvider: 'AirPay',
      depositFee: 0.5,
      withdrawalFee: 1.0,
      minDeposit: 100,
      maxDeposit: 100000,
      minWithdrawal: 500,
      maxWithdrawal: 50000,
      limits: {
        dailyLimit: 100000000,
        monthlyLimit: 1000000000,
        singleTransactionLimit: 10000000,
      },
    });
    setDialogOpen(true);
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setFormData({
      merchantId: merchant.merchantId,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      status: merchant.status,
      defaultProvider: merchant.defaultProvider,
      depositFee: merchant.depositFee,
      withdrawalFee: merchant.withdrawalFee,
      minDeposit: merchant.minDeposit,
      maxDeposit: merchant.maxDeposit,
      minWithdrawal: merchant.minWithdrawal,
      maxWithdrawal: merchant.maxWithdrawal,
      limits: {
        dailyLimit: merchant.limits.dailyLimit,
        monthlyLimit: merchant.limits.monthlyLimit,
        singleTransactionLimit: merchant.limits.singleTransactionLimit,
      },
    });
    setDialogOpen(true);
  };

  const handleDelete = async (merchantId: string) => {
    if (window.confirm('确定要删除这个商户吗？这将同时删除相关的订单和交易记录。')) {
      try {
        setLoading(true);
        // 在实际项目中，这里会调用API删除商户
        setMerchants(merchants.filter(merchant => merchant.merchantId !== merchantId));
        setError(null);
      } catch (err: any) {
        setError(err.message || '删除失败');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.merchantId || !formData.name || !formData.email || !formData.phone) {
      setError('请填写所有必填字段');
      return;
    }

    if (formData.maxDeposit <= formData.minDeposit) {
      setError('最大充值金额必须大于最小充值金额');
      return;
    }

    if (formData.maxWithdrawal <= formData.minWithdrawal) {
      setError('最大提现金额必须大于最小提现金额');
      return;
    }

    if (!formData.limits?.dailyLimit || !formData.limits?.monthlyLimit || !formData.limits?.singleTransactionLimit) {
      setError('请填写所有额度限制字段');
      return;
    }

    if (formData.limits.dailyLimit <= 0 || formData.limits.monthlyLimit <= 0 || formData.limits.singleTransactionLimit <= 0) {
      setError('额度限制必须大于0');
      return;
    }

    if (formData.limits.monthlyLimit < formData.limits.dailyLimit) {
      setError('每月额度限制必须大于或等于每日额度限制');
      return;
    }

    if (formData.limits.dailyLimit < formData.limits.singleTransactionLimit) {
      setError('每日额度限制必须大于或等于单笔交易限额');
      return;
    }

    try {
      setLoading(true);
      
      if (editingMerchant) {
        // 更新现有商户
        const updatedMerchant: Merchant = {
          ...editingMerchant,
          merchantId: formData.merchantId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          defaultProvider: formData.defaultProvider,
          depositFee: formData.depositFee,
          withdrawalFee: formData.withdrawalFee,
          minDeposit: formData.minDeposit,
          maxDeposit: formData.maxDeposit,
          minWithdrawal: formData.minWithdrawal,
          maxWithdrawal: formData.maxWithdrawal,
          limits: {
            dailyLimit: formData.limits.dailyLimit,
            monthlyLimit: formData.limits.monthlyLimit,
            singleTransactionLimit: formData.limits.singleTransactionLimit,
          },
          updatedAt: new Date().toISOString(),
        };
        setMerchants(merchants.map(merchant => 
          merchant.merchantId === editingMerchant.merchantId ? updatedMerchant : merchant
        ));
      } else {
        // 创建新商户
        const newMerchant: Merchant = {
          merchantId: formData.merchantId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          balance: 0,
          defaultProvider: formData.defaultProvider,
          depositFee: formData.depositFee,
          withdrawalFee: formData.withdrawalFee,
          minDeposit: formData.minDeposit,
          maxDeposit: formData.maxDeposit,
          minWithdrawal: formData.minWithdrawal,
          maxWithdrawal: formData.maxWithdrawal,
          limits: {
            dailyLimit: formData.limits.dailyLimit,
            monthlyLimit: formData.limits.monthlyLimit,
            singleTransactionLimit: formData.limits.singleTransactionLimit,
          },
          usage: {
            dailyUsed: 0,
            monthlyUsed: 0,
            lastResetDate: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setMerchants([...merchants, newMerchant]);
      }
      
      setDialogOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleBalanceVisibility = (merchantId: string) => {
    setShowBalance(prev => ({
      ...prev,
      [merchantId]: !prev[merchantId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'warning';
      case 'SUSPENDED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '正常';
      case 'INACTIVE':
        return '停用';
      case 'SUSPENDED':
        return '暂停';
      default:
        return '未知';
    }
  };

  const formatCurrency = (amount: number) => {
    return formatAmount(amount);
  };

  const formatDate = (dateString: string) => {
    return formatDateUtil(dateString);
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
          商户管理
        </Typography>
        <PermissionGuard permissions={[Permission.MANAGE_MERCHANTS]}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
          >
            添加商户
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
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>商户信息</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>状态</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>余额</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>支付配置</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>额度使用</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>创建时间</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    暂无记录
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              merchants.map((merchant) => (
                <TableRow key={merchant.merchantId}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 40, height: 40 }}>
                      {merchant.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {merchant.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {merchant.merchantId}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {merchant.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusDisplayName(merchant.status)}
                    color={getStatusColor(merchant.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        可用余额
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        冻结余额
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {showBalance[merchant.merchantId] ? formatCurrency(merchant.balance / 100) : '••••••••'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {showBalance[merchant.merchantId] ? '₹0.00' : '••••••••'}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => toggleBalanceVisibility(merchant.merchantId)}
                    >
                      {showBalance[merchant.merchantId] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      默认支付商: {merchant.defaultProvider}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      充值费率: {merchant.depositFee}% | 
                      提现费率: {merchant.withdrawalFee}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      每日额度
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(merchant.usage.dailyUsed)} / {formatCurrency(merchant.limits.dailyLimit)}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        每月额度
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(merchant.usage.monthlyUsed)} / {formatCurrency(merchant.limits.monthlyLimit)}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        单笔限额: {formatCurrency(merchant.limits.singleTransactionLimit)}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(merchant.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <PermissionGuard permissions={[Permission.MANAGE_MERCHANTS]}>
                      <Tooltip title="编辑商户">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(merchant)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除商户">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(merchant.merchantId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </PermissionGuard>
                    <Tooltip title="查看余额详情">
                      <IconButton size="small">
                        <AccountBalanceIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="查看交易历史">
                      <IconButton size="small">
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
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
            {editingMerchant ? '编辑商户' : '添加商户'}
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
              form="merchant-form"
            >
              {loading ? <CircularProgress size={16} /> : '保存'}
            </Button>
          </Box>
        </DialogTitle>
        <form id="merchant-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {/* 基本信息 */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="h6" gutterBottom>
                  基本信息
                </Typography>
              </Box>
              <TextField
                fullWidth
                label="商户ID"
                value={formData.merchantId}
                onChange={(e) => setFormData(prev => ({ ...prev, merchantId: e.target.value }))}
                required
                disabled={!!editingMerchant}
              />
              <TextField
                fullWidth
                label="商户名称"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
              <TextField
                fullWidth
                label="电话"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.status}
                  label="状态"
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  required
                >
                  <MenuItem value="ACTIVE">正常</MenuItem>
                  <MenuItem value="INACTIVE">停用</MenuItem>
                  <MenuItem value="SUSPENDED">暂停</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  支付配置
                </Typography>
              </Box>

              <FormControl fullWidth>
                <InputLabel>默认支付商</InputLabel>
                <Select
                  value={formData.defaultProvider}
                  label="默认支付商"
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultProvider: e.target.value }))}
                  required
                >
                  <MenuItem value="AirPay">AirPay</MenuItem>
                  <MenuItem value="Cashfree">Cashfree</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="充值费率 (%)"
                type="number"
                value={formData.depositFee}
                onChange={(e) => setFormData(prev => ({ ...prev, depositFee: parseFloat(e.target.value) }))}
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                required
              />

              <TextField
                fullWidth
                label="提现费率 (%)"
                type="number"
                value={formData.withdrawalFee}
                onChange={(e) => setFormData(prev => ({ ...prev, withdrawalFee: parseFloat(e.target.value) }))}
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                required
              />

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  限额设置
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="最小充值金额 (₹)"
                type="number"
                value={formData.minDeposit}
                onChange={(e) => setFormData(prev => ({ ...prev, minDeposit: parseInt(e.target.value) }))}
                inputProps={{ min: 1 }}
                required
              />

              <TextField
                fullWidth
                label="最大充值金额 (₹)"
                type="number"
                value={formData.maxDeposit}
                onChange={(e) => setFormData(prev => ({ ...prev, maxDeposit: parseInt(e.target.value) }))}
                inputProps={{ min: 1 }}
                required
              />

              <TextField
                fullWidth
                label="最小提现金额 (₹)"
                type="number"
                value={formData.minWithdrawal}
                onChange={(e) => setFormData(prev => ({ ...prev, minWithdrawal: parseInt(e.target.value) }))}
                inputProps={{ min: 1 }}
                required
              />

              <TextField
                fullWidth
                label="最大提现金额 (₹)"
                type="number"
                value={formData.maxWithdrawal}
                onChange={(e) => setFormData(prev => ({ ...prev, maxWithdrawal: parseInt(e.target.value) }))}
                inputProps={{ min: 1 }}
                required
              />

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  额度限制
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="每日额度限制 (₹)"
                type="text"
                value={formData.limits?.dailyLimit ? formatAmount(formData.limits.dailyLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      limits: { 
                        ...prev.limits, 
                        dailyLimit: parseInt(value) * 100 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      limits: { 
                        ...prev.limits, 
                        dailyLimit: 0 
                      } 
                    }));
                  }
                }}
                helperText="例如：1000000 表示 ₹1,000,000"
                required
              />

              <TextField
                fullWidth
                label="每月额度限制 (₹)"
                type="text"
                value={formData.limits?.monthlyLimit ? formatAmount(formData.limits.monthlyLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      limits: { 
                        ...prev.limits, 
                        monthlyLimit: parseInt(value) * 100 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      limits: { 
                        ...prev.limits, 
                        monthlyLimit: 0 
                      } 
                    }));
                  }
                }}
                helperText="例如：10000000 表示 ₹10,000,000"
                required
              />

              <TextField
                fullWidth
                label="单笔交易限额 (₹)"
                type="text"
                value={formData.limits?.singleTransactionLimit ? formatAmount(formData.limits.singleTransactionLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      limits: { 
                        ...prev.limits, 
                        singleTransactionLimit: parseInt(value) * 100 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      limits: { 
                        ...prev.limits, 
                        singleTransactionLimit: 0 
                      } 
                    }));
                  }
                }}
                helperText="例如：100000 表示 ₹100,000"
                required
              />
            </Box>
          </DialogContent>
        </form>
      </Dialog>
    </Box>
  );
} 