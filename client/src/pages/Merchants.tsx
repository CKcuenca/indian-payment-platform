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
  DialogActions,
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
import { Merchant, UserRole } from '../types';
import { PermissionGuard } from '../components/PermissionGuard';
import { Permission } from '../types';
import { formatAmount, formatDate as formatDateUtil } from '../utils/formatters';
import { authService } from '../services/authService';
import api from '../services/api'; // Added import for api service

// 模拟商户数据 - 已清理，改为从API获取
// const mockMerchants: Merchant[] = [];

export default function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [showBalance, setShowBalance] = useState<{ [key: string]: boolean }>({});
  
  // 商户视图相关状态
  const [isMerchantView, setIsMerchantView] = useState(false);
  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [apiKeyForm, setApiKeyForm] = useState({
    apiKeyName: '',
    description: ''
  });

  // 支付配置相关状态
  const [paymentConfigs, setPaymentConfigs] = useState<any[]>([]);
  const [loadingPaymentConfigs, setLoadingPaymentConfigs] = useState(false);
  


  const [formData, setFormData] = useState({
    merchantId: '',
    name: '',
    email: '',
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
    selectedPaymentConfigs: [] as string[], // 新增：用于存储支付配置的ID
  });

  useEffect(() => {
    // 检查当前用户角色
    const currentUser = authService.getCurrentUser();
    console.log('🔍 useEffect - 当前用户:', currentUser);
    console.log('🔍 useEffect - 用户角色:', currentUser?.role);
    console.log('🔍 useEffect - UserRole.MERCHANT:', UserRole.MERCHANT);
    
    if (currentUser && currentUser.role === UserRole.MERCHANT) {
      console.log('🔍 useEffect - 设置为商户视图');
      setIsMerchantView(true);
      // 如果是商户，获取自己的信息
      fetchCurrentMerchantInfo();
    } else {
      console.log('🔍 useEffect - 设置为管理员视图');
      // 如果是管理员，获取所有商户列表
      fetchMerchants();
      // 获取支付配置列表
      fetchPaymentConfigs();
    }
  }, []);

  // 获取当前商户信息
  const fetchCurrentMerchantInfo = async () => {
    console.log('🔍 fetchCurrentMerchantInfo - 开始执行');
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      console.log('🔍 fetchCurrentMerchantInfo - 当前用户:', currentUser);
      console.log('🔍 fetchCurrentMerchantInfo - 商户ID:', currentUser?.merchantId);
      
      if (!currentUser?.merchantId) {
        setError('商户ID未找到');
        return;
      }
      
      // 使用统一的api服务
      const response = await api.get('/api/merchant-profile/profile');
      console.log('🔍 API响应:', response);
      
      if (response.data.success && response.data.data) {
        // 转换API数据格式以匹配前端期望
        const apiData = response.data.data;
        const convertedData = {
          merchantId: apiData.merchantId,
          name: apiData.name,
          email: apiData.email,
          status: apiData.status,
          defaultProvider: apiData.paymentConfig?.defaultProvider || 'airpay',
          depositFee: (apiData.paymentConfig?.fees?.deposit || 0.01) * 100, // 转换为百分比
          withdrawalFee: (apiData.paymentConfig?.fees?.withdrawal || 0.01) * 100, // 转换为百分比
          minDeposit: apiData.paymentConfig?.limits?.minDeposit || 100,
          maxDeposit: apiData.paymentConfig?.limits?.maxDeposit || 5000000,
          minWithdrawal: apiData.paymentConfig?.limits?.minWithdrawal || 100,
          maxWithdrawal: apiData.paymentConfig?.limits?.maxWithdrawal || 5000000,
          limits: {
            dailyLimit: apiData.paymentConfig?.limits?.dailyLimit || 50000000,
            monthlyLimit: apiData.paymentConfig?.limits?.monthlyLimit || 500000000,
            singleTransactionLimit: apiData.paymentConfig?.limits?.maxDeposit || 5000000,
          },
          balance: 0, // 默认余额
          usage: {
            dailyUsed: 0,
            monthlyUsed: 0,
            lastResetDate: new Date().toISOString()
          },
          createdAt: apiData.createdAt || new Date(),
          updatedAt: apiData.updatedAt || new Date()
        };
        
        console.log('🔍 转换后的商户数据:', convertedData);
        setCurrentMerchant(convertedData);
      } else {
        setError(response.data.message || '获取商户信息失败');
      }
    } catch (err: any) {
      console.error('获取商户信息失败:', err);
      console.error('错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });
      
      if (err.response?.status === 401) {
        setError('认证失败，请重新登录');
      } else if (err.response?.status === 403) {
        setError('权限不足，无法访问此功能');
      } else if (err.response?.status === 404) {
        setError('API端点不存在');
      } else {
        setError(`获取商户信息失败: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 获取支付配置列表
  const fetchPaymentConfigs = async () => {
    try {
      setLoadingPaymentConfigs(true);
      console.log('🔍 开始获取支付配置...');
      
      const response = await api.get('/api/payment-config');
      console.log('🔍 支付配置API响应:', response);
      
      if (response.data.success) {
        console.log('🔍 支付配置数据:', response.data.data);
        setPaymentConfigs(response.data.data || []);
      } else {
        console.warn('🔍 API返回数据格式异常:', response.data);
      }
    } catch (err: any) {
      console.error('🔍 获取支付配置失败:', err);
      console.error('🔍 错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
    } finally {
      setLoadingPaymentConfigs(false);
    }
  };

  // 获取所有商户数据
  const fetchMerchants = async () => {
    try {
      setLoading(true);
      console.log('🔍 fetchMerchants - 开始获取商户列表');
      
      // 使用统一的api服务
      const response = await api.get('/api/merchant');
      console.log('🔍 商户列表API响应:', response);
      
      if (response.data.success && response.data.data) {
        setMerchants(response.data.data.merchants || response.data.data);
        setError(null);
      } else {
        console.warn('API返回数据格式异常:', response.data);
        setMerchants([]);
        setError('获取商户数据失败：数据格式异常');
      }
    } catch (err: any) {
      console.error('获取商户列表失败:', err);
      console.error('错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });
      
      if (err.response?.status === 401) {
        setError('认证失败，请重新登录');
      } else if (err.response?.status === 403) {
        setError('权限不足，只有管理员可以查看商户列表');
      } else if (err.response?.status === 404) {
        setError('API端点不存在');
      } else if (err.response?.status === 500) {
        setError('服务器内部错误');
      } else {
        setError(`获取商户数据失败: ${err.message}`);
      }
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingMerchant(null);
    setFormData({
      merchantId: '',
      name: '',
      email: '',
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
      selectedPaymentConfigs: [], // 新增：添加默认值
    });
    setDialogOpen(true);
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setFormData({
      merchantId: merchant.merchantId,
      name: merchant.name,
      email: merchant.email,
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
      selectedPaymentConfigs: merchant.paymentConfigs || [], // 修复：使用可选链和默认值
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

  // 修改密码
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/merchant-profile/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      if (response.data.success) {
        setPasswordDialogOpen(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        alert('密码修改成功！');
      } else {
        setError(response.data.message || '修改密码失败');
      }
    } catch (err: any) {
      console.error('修改密码失败:', err);
      console.error('错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 401) {
        setError('认证失败，请重新登录');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || '密码格式不正确');
      } else {
        setError(`修改密码失败: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 生成API密钥
  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/merchant-profile/generate-api-key', {
        name: apiKeyForm.apiKeyName,
        description: apiKeyForm.description
      });
      
      if (response.data.success) {
        setApiKeyDialogOpen(false);
        setApiKeyForm({
          apiKeyName: '',
          description: ''
        });
        alert('API密钥生成成功！');
      } else {
        setError(response.data.message || '生成API密钥失败');
      }
    } catch (err: any) {
      console.error('生成API密钥失败:', err);
      console.error('错误详情:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 401) {
        setError('认证失败，请重新登录');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || '参数格式不正确');
      } else {
        setError(`生成API密钥失败: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.merchantId || !formData.name) {
      setError('请填写商户ID和商户名称');
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

    if (formData.selectedPaymentConfigs.length === 0) {
      setError('请至少选择一个支付配置');
      return;
    }

    if (!formData.defaultProvider) {
      setError('请选择默认支付商');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingMerchant) {
        // 更新商户
        const updateData = {
          name: formData.name,
          email: formData.email,
          status: formData.status,
          defaultProvider: formData.defaultProvider,
          paymentConfigs: formData.selectedPaymentConfigs, // 修复：直接使用ID数组
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

        const response = await api.put(`/api/merchants/${editingMerchant.merchantId}`, updateData);
        
        if (response.data.success) {
          setMerchants(merchants.map(merchant => 
            merchant.merchantId === editingMerchant.merchantId 
              ? { ...merchant, ...updateData }
              : merchant
          ));
          setDialogOpen(false);
          setError(null);
        } else {
          throw new Error(response.data.error || '更新失败');
        }
      } else {
        // 创建新商户
        const newMerchantData = {
          merchantId: formData.merchantId,
          name: formData.name,
          email: formData.email,
          status: formData.status,
          balance: 0,
          defaultProvider: formData.defaultProvider,
          paymentConfigs: formData.selectedPaymentConfigs, // 修复：直接使用ID数组
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

        const response = await api.post('/api/merchants', newMerchantData);
        
        if (response.data.success) {
          setMerchants([...merchants, response.data.data]);
          setDialogOpen(false);
          setError(null);
        } else {
          throw new Error(response.data.error || '创建失败');
        }
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
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
          {isMerchantView ? '我的账户' : '商户管理'}
        </Typography>
        {!isMerchantView && (
          <PermissionGuard permissions={[Permission.MANAGE_MERCHANTS]}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
            >
              添加商户
            </Button>
          </PermissionGuard>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 商户视图 - 显示自己的账户信息 */}
      {isMerchantView && currentMerchant ? (
        <Box>
          {/* 基本信息卡片 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              基本信息
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">商户ID</Typography>
                <Typography variant="body1" fontWeight="medium">{currentMerchant.merchantId}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">商户名称</Typography>
                <Typography variant="body1" fontWeight="medium">{currentMerchant.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">状态</Typography>
                <Chip
                  label={getStatusDisplayName(currentMerchant.status)}
                  color={getStatusColor(currentMerchant.status) as any}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">默认支付商</Typography>
                <Typography variant="body1" fontWeight="medium">{currentMerchant.defaultProvider}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* 费率信息卡片 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              费率设置
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">充值费率</Typography>
                <Typography variant="body1" fontWeight="medium">{currentMerchant.depositFee}%</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">提现费率</Typography>
                <Typography variant="body1" fontWeight="medium">{currentMerchant.withdrawalFee}%</Typography>
              </Box>
            </Box>
          </Paper>

          {/* 限额信息卡片 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              限额设置
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">每日额度</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.limits.dailyLimit)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">每月额度</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.limits.monthlyLimit)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">单笔限额</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.limits.singleTransactionLimit)}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              onClick={() => setPasswordDialogOpen(true)}
            >
              修改密码
            </Button>
            <Button
              variant="outlined"
              onClick={() => setApiKeyDialogOpen(true)}
            >
              生成API密钥
            </Button>
          </Box>
        </Box>
      ) : (
        /* 管理员视图 - 显示所有商户列表 */
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
      )}

      {/* 密码修改对话框 */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          修改密码
        </DialogTitle>
        <form onSubmit={handlePasswordChange}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="当前密码"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
              <TextField
                fullWidth
                label="新密码"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                required
              />
              <TextField
                fullWidth
                label="确认新密码"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
            </Box>
          </DialogContent>
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 1,
            borderTop: 1,
            borderColor: 'divider',
            pt: 2
          }}>
            <Button 
              onClick={() => setPasswordDialogOpen(false)}
              variant="outlined"
            >
              取消
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
            >
              {loading ? <CircularProgress size={16} /> : '确认修改'}
            </Button>
          </DialogTitle>
        </form>
      </Dialog>

      {/* API密钥生成对话框 */}
      <Dialog 
        open={apiKeyDialogOpen} 
        onClose={() => setApiKeyDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          生成API密钥
        </DialogTitle>
        <form onSubmit={handleGenerateApiKey}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="密钥名称"
                value={apiKeyForm.apiKeyName}
                onChange={(e) => setApiKeyForm(prev => ({ ...prev, apiKeyName: e.target.value }))}
                required
                placeholder="例如：生产环境密钥"
              />
              <TextField
                fullWidth
                label="描述"
                value={apiKeyForm.description}
                onChange={(e) => setApiKeyForm(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
                placeholder="密钥用途说明"
              />
            </Box>
          </DialogContent>
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 1,
            borderTop: 1,
            borderColor: 'divider',
            pt: 2
          }}>
            <Button 
              onClick={() => setApiKeyDialogOpen(false)}
              variant="outlined"
            >
              取消
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
            >
              {loading ? <CircularProgress size={16} /> : '生成密钥'}
            </Button>
          </DialogTitle>
        </form>
      </Dialog>

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
                helperText="可选字段"
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

              {/* 支付配置选择 */}
              <FormControl fullWidth>
                <InputLabel>支付配置</InputLabel>
                <Select
                  multiple
                  value={formData.selectedPaymentConfigs}
                  label="支付配置"
                  onChange={(e) => setFormData(prev => ({ ...prev, selectedPaymentConfigs: Array.from(e.target.value as string[]) }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const config = paymentConfigs.find(pc => pc._id === value);
                        return <Chip key={value} label={config?.accountName || value} />;
                      })}
                    </Box>
                  )}
                  disabled={loadingPaymentConfigs}
                >
                  {loadingPaymentConfigs ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      加载中...
                    </MenuItem>
                  ) : paymentConfigs.length === 0 ? (
                    <MenuItem disabled>暂无支付配置</MenuItem>
                  ) : (
                    paymentConfigs.map((config) => (
                      <MenuItem key={config._id} value={config._id}>
                        {config.accountName} ({config.provider.name})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>默认支付商</InputLabel>
                <Select
                  value={formData.defaultProvider}
                  label="默认支付商"
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultProvider: e.target.value }))}
                  required
                  disabled={loadingPaymentConfigs || paymentConfigs.length === 0}
                >
                  {loadingPaymentConfigs ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      加载中...
                    </MenuItem>
                  ) : paymentConfigs.length === 0 ? (
                    <MenuItem disabled>请先添加支付配置</MenuItem>
                  ) : (
                    paymentConfigs.map((config) => (
                      <MenuItem key={config._id} value={config._id}>
                        {config.accountName} ({config.provider.name})
                      </MenuItem>
                    ))
                  )}
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

      {/* 修改密码对话框 */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">修改密码</Typography>
        </DialogTitle>
        <form onSubmit={handlePasswordChange}>
          <DialogContent>
            <TextField
              fullWidth
              label="当前密码"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="新密码"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="确认新密码"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              required
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialogOpen(false)}>取消</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={16} /> : '确认修改'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 生成API密钥对话框 */}
      <Dialog open={apiKeyDialogOpen} onClose={() => setApiKeyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">生成API密钥</Typography>
        </DialogTitle>
        <form onSubmit={handleGenerateApiKey}>
          <DialogContent>
            <TextField
              fullWidth
              label="API密钥名称"
              value={apiKeyForm.apiKeyName}
              onChange={(e) => setApiKeyForm(prev => ({ ...prev, apiKeyName: e.target.value }))}
              required
              placeholder="例如：生产环境API密钥"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="描述"
              value={apiKeyForm.description}
              onChange={(e) => setApiKeyForm(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              placeholder="可选：描述这个API密钥的用途"
              sx={{ mb: 2 }}
            />
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                生成新的API密钥后，旧的密钥将自动失效。请妥善保管您的API密钥。
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApiKeyDialogOpen(false)}>取消</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={16} /> : '生成密钥'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 