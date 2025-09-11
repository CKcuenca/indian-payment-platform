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
  FormHelperText,
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
  Security as SecurityIcon,
  Add as AddIPIcon,
  Delete as DeleteIPIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  NetworkCheck as NetworkCheckIcon,
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
  
  // 用户管理相关状态 - 用于绑定商户用户
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // IP白名单管理相关状态
  const [newIP, setNewIP] = useState({ ip: '', mask: 32, description: '' });
  const [testIP, setTestIP] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // 加载IP白名单数据
  const loadIPWhitelist = async (merchantId: string) => {
    try {
      const response = await api.get('/api/ip-whitelist', {
        params: { merchantId }
      });
      if (response.data.success) {
        const ipData = response.data.data;
        setFormData(prev => ({
          ...prev,
          ipWhitelist: {
            enabled: ipData.enabled,
            strictMode: ipData.strictMode,
            allowedIPs: ipData.allowedIPs || [],
            accessRules: ipData.accessRules
          }
        }));
      }
    } catch (error) {
      console.error('加载IP白名单失败:', error);
    }
  };

  // 更新IP白名单配置
  const updateIPWhitelist = async (merchantId: string) => {
    try {
      // 更新基础配置
      await api.put('/api/ip-whitelist/config', {
        enabled: formData.ipWhitelist.enabled,
        strictMode: formData.ipWhitelist.strictMode,
        accessRules: formData.ipWhitelist.accessRules
      });

      // 这里可以添加同步IP列表的逻辑
      // 由于IP列表通过前端管理，可以考虑批量更新
      console.log('IP白名单配置已更新');
    } catch (error) {
      console.error('更新IP白名单失败:', error);
    }
  };

  const [formData, setFormData] = useState({
    merchantId: '',
    name: '',
    email: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    defaultProvider: 'passpay',
    
    // 用户绑定字段
    userId: '',
    username: '',
    userFullName: '',
    
    // 代收（充值）配置
    deposit: {
      fee: {
        percentage: 5.0,        // 默认5%
        fixedAmount: 0,         // 默认无固定费用
      },
      limits: {
        minAmount: 100,
        maxAmount: 100000,
        dailyLimit: 100000000,
        monthlyLimit: 1000000000,
        singleTransactionLimit: 10000000,
      },
    },
    
    // 代付（提现）配置
    withdrawal: {
      fee: {
        percentage: 3.0,        // 默认3%
        fixedAmount: 6,         // 默认6卢比
      },
      limits: {
        minAmount: 500,
        maxAmount: 50000,
        dailyLimit: 100000000,
        monthlyLimit: 1000000000,
        singleTransactionLimit: 10000000,
      },
    },
    
    selectedPaymentConfigs: [] as string[], // 用于存储支付配置的ID
    
    // IP白名单配置
    ipWhitelist: {
      enabled: false,
      strictMode: false,
      allowedIPs: [] as any[],
      accessRules: {
        blockUnknownIPs: true,
        maxFailedAttempts: 5,
        lockoutDuration: 300
      }
    }
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
      // 获取用户列表 - 用于绑定商户用户
      fetchUsers();
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
          email: apiData.status,
          status: apiData.status,
          defaultProvider: apiData.paymentConfig?.defaultProvider || 'passpay',
          
          // 代收（充值）配置
          deposit: {
            fee: {
              percentage: (apiData.paymentConfig?.fees?.deposit || 0.01) * 100,
              fixedAmount: 0,
            },
            limits: {
              minAmount: apiData.paymentConfig?.limits?.minDeposit || 100,
              maxAmount: apiData.paymentConfig?.limits?.maxDeposit || 5000000,
              dailyLimit: apiData.paymentConfig?.limits?.dailyLimit || 50000000,
              monthlyLimit: apiData.paymentConfig?.limits?.monthlyLimit || 500000000,
              singleTransactionLimit: apiData.paymentConfig?.limits?.maxDeposit || 5000000,
            },
            usage: {
              dailyUsed: 0,
              monthlyUsed: 0,
              lastResetDate: new Date().toISOString()
            },
          },
          
          // 代付（提现）配置
          withdrawal: {
            fee: {
              percentage: (apiData.paymentConfig?.fees?.withdrawal || 0.01) * 100,
              fixedAmount: 6,
            },
            limits: {
              minAmount: apiData.paymentConfig?.limits?.minWithdrawal || 100,
              maxAmount: apiData.paymentConfig?.limits?.maxWithdrawal || 5000000,
              dailyLimit: apiData.paymentConfig?.limits?.dailyLimit || 50000000,
              monthlyLimit: apiData.paymentConfig?.limits?.monthlyLimit || 500000000,
              singleTransactionLimit: apiData.paymentConfig?.limits?.maxWithdrawal || 5000000,
            },
            usage: {
              dailyUsed: 0,
              monthlyUsed: 0,
              lastResetDate: new Date().toISOString()
            },
          },
          
          balance: 0,
          paymentConfigs: [],
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

  // 获取用户列表 - 用于绑定商户用户
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/api/users');
      
      if (response.data.success && response.data.data) {
        // 只获取商户角色的用户
        const allUsers = response.data.data.users || response.data.data;
        const merchantUsers = allUsers.filter((user: any) => user.role === 'merchant');
        setUsers(merchantUsers);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error('获取用户数据失败:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
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
      defaultProvider: 'passpay',
      
      // 用户绑定字段
      userId: '',
      username: '',
      userFullName: '',
      
      // 代收（充值）配置
      deposit: {
        fee: {
          percentage: 5.0,        // 默认5%
          fixedAmount: 0,         // 默认无固定费用
        },
        limits: {
          minAmount: 100,
          maxAmount: 100000,
          dailyLimit: 100000000,
          monthlyLimit: 1000000000,
          singleTransactionLimit: 10000000,
        },
      },
      
      // 代付（提现）配置
      withdrawal: {
        fee: {
          percentage: 3.0,        // 默认3%
          fixedAmount: 6,         // 默认6卢比
        },
        limits: {
          minAmount: 500,
          maxAmount: 50000,
          dailyLimit: 100000000,
          monthlyLimit: 1000000000,
          singleTransactionLimit: 10000000,
        },
      },
      
      selectedPaymentConfigs: [],
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
      
      // 用户绑定字段
      userId: merchant.userId || '',
      username: merchant.username || '',
      userFullName: merchant.userFullName || '',
      
      // 代收（充值）配置
      deposit: {
        fee: {
          percentage: merchant.deposit?.fee?.percentage || 5.0,
          fixedAmount: merchant.deposit?.fee?.fixedAmount || 0,
        },
        limits: {
          minAmount: merchant.deposit?.limits?.minAmount || 100,
          maxAmount: merchant.deposit?.limits?.maxAmount || 100000,
          dailyLimit: merchant.deposit?.limits?.dailyLimit || 100000000,
          monthlyLimit: merchant.deposit?.limits?.monthlyLimit || 1000000000,
          singleTransactionLimit: merchant.deposit?.limits?.singleTransactionLimit || 10000000,
        },
      },
      
      // 代付（提现）配置
      withdrawal: {
        fee: {
          percentage: merchant.withdrawal?.fee?.percentage || 3.0,
          fixedAmount: merchant.withdrawal?.fee?.fixedAmount || 6,
        },
        limits: {
          minAmount: merchant.withdrawal?.limits?.minAmount || 500,
          maxAmount: merchant.withdrawal?.limits?.maxAmount || 50000,
          dailyLimit: merchant.withdrawal?.limits?.dailyLimit || 100000000,
          monthlyLimit: merchant.withdrawal?.limits?.monthlyLimit || 1000000000,
          singleTransactionLimit: merchant.withdrawal?.limits?.singleTransactionLimit || 10000000,
        },
      },
      
      selectedPaymentConfigs: merchant.paymentConfigs || [],
      
      // IP白名单配置
      ipWhitelist: {
        enabled: merchant.security?.ipWhitelist?.enabled || false,
        strictMode: merchant.security?.ipWhitelist?.strictMode || false,
        allowedIPs: merchant.security?.ipWhitelist?.allowedIPs || [],
        accessRules: merchant.security?.ipWhitelist?.accessRules || {
          blockUnknownIPs: true,
          maxFailedAttempts: 5,
          lockoutDuration: 300
        }
      }
    });
    
    // 加载IP白名单数据
    loadIPWhitelist(merchant.merchantId);
    setDialogOpen(true);
  };

  const handleDelete = async (merchantId: string) => {
    if (window.confirm('确定要删除这个商户吗？这将同时删除相关的订单和交易记录。')) {
      try {
        setLoading(true);
        
        // 调用后端API删除商户
        const response = await api.delete(`/api/admin/merchants/${merchantId}`);
        
        if (response.data.success) {
          // 删除成功后，从本地状态中移除
          setMerchants(merchants.filter(merchant => merchant.merchantId !== merchantId));
          setError(null);
        } else {
          throw new Error(response.data.error || '删除失败');
        }
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
    
    if (!formData.name) {
      setError('请填写商户名称');
      return;
    }

    if (!formData.userId) {
      setError('请选择绑定的用户');
      return;
    }

    if (formData.deposit.limits.maxAmount <= formData.deposit.limits.minAmount) {
      setError('最大充值金额必须大于最小充值金额');
      return;
    }

    if (formData.withdrawal.limits.maxAmount <= formData.withdrawal.limits.minAmount) {
      setError('最大提现金额必须大于最小提现金额');
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
          paymentConfigs: formData.selectedPaymentConfigs,
          
          // 用户绑定字段
          userId: formData.userId,
          username: formData.username,
          userFullName: formData.userFullName,
          
          // 代收（充值）配置
          deposit: {
            fee: {
              percentage: formData.deposit.fee.percentage,
              fixedAmount: formData.deposit.fee.fixedAmount,
            },
            limits: {
              minAmount: formData.deposit.limits.minAmount,
              maxAmount: formData.deposit.limits.maxAmount,
              dailyLimit: formData.deposit.limits.dailyLimit,
              monthlyLimit: formData.deposit.limits.monthlyLimit,
              singleTransactionLimit: formData.deposit.limits.singleTransactionLimit,
            },
            usage: {
              dailyUsed: 0,
              monthlyUsed: 0,
              lastResetDate: new Date().toISOString(),
            },
          },
          
          // 代付（提现）配置
          withdrawal: {
            fee: {
              percentage: formData.withdrawal.fee.percentage,
              fixedAmount: formData.withdrawal.fee.fixedAmount,
            },
            limits: {
              minAmount: formData.withdrawal.limits.minAmount,
              maxAmount: formData.withdrawal.limits.maxAmount,
              dailyLimit: formData.withdrawal.limits.dailyLimit,
              monthlyLimit: formData.withdrawal.limits.monthlyLimit,
              singleTransactionLimit: formData.withdrawal.limits.singleTransactionLimit,
            },
            usage: {
              dailyUsed: 0,
              monthlyUsed: 0,
              lastResetDate: new Date().toISOString(),
            },
          },
          
          // IP白名单配置
          security: {
            ipWhitelist: formData.ipWhitelist
          },
          
          updatedAt: new Date().toISOString(),
        };

        const response = await api.put(`/api/admin/merchants/${editingMerchant.merchantId}`, updateData);
        
        if (response.data.success) {
          // 同步更新IP白名单配置
          await updateIPWhitelist(editingMerchant.merchantId);
          
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
          name: formData.name,
          email: formData.email,
          status: formData.status,
          balance: 0,
          defaultProvider: formData.defaultProvider || 'passpay',
          paymentConfigs: formData.selectedPaymentConfigs || [],
          
          // 用户绑定字段
          userId: formData.userId,
          username: formData.username,
          userFullName: formData.userFullName,
          
          // 代收（充值）配置
          deposit: {
            fee: {
              percentage: formData.deposit.fee.percentage,
              fixedAmount: formData.deposit.fee.fixedAmount,
            },
            limits: {
              minAmount: formData.deposit.limits.minAmount,
              maxAmount: formData.deposit.limits.maxAmount,
              dailyLimit: formData.deposit.limits.dailyLimit,
              monthlyLimit: formData.deposit.limits.monthlyLimit,
              singleTransactionLimit: formData.deposit.limits.singleTransactionLimit,
            },
            usage: {
              dailyUsed: 0,
              monthlyUsed: 0,
              lastResetDate: new Date().toISOString(),
            },
          },
          
          // 代付（提现）配置
          withdrawal: {
            fee: {
              percentage: formData.withdrawal.fee.percentage,
              fixedAmount: formData.withdrawal.fee.fixedAmount,
            },
            limits: {
              minAmount: formData.withdrawal.limits.minAmount,
              maxAmount: formData.withdrawal.limits.maxAmount,
              dailyLimit: formData.withdrawal.limits.dailyLimit,
              monthlyLimit: formData.withdrawal.limits.monthlyLimit,
              singleTransactionLimit: formData.withdrawal.limits.singleTransactionLimit,
            },
            usage: {
              dailyUsed: 0,
              monthlyUsed: 0,
              lastResetDate: new Date().toISOString(),
            },
          },
          
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const response = await api.post('/api/admin/merchants', newMerchantData);
        
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
                <Typography variant="body2" color="text.secondary">代收费率</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentMerchant.deposit?.fee?.percentage || 0}% + ₹{currentMerchant.deposit?.fee?.fixedAmount || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">代付费率</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentMerchant.withdrawal?.fee?.percentage || 0}% + ₹{currentMerchant.withdrawal?.fee?.fixedAmount || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* 代收（充值）限额信息卡片 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              代收（充值）限额设置
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">每日额度</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.deposit.limits.dailyLimit)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">每月额度</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.deposit.limits.monthlyLimit)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">单笔限额</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.deposit.limits.singleTransactionLimit)}</Typography>
              </Box>
            </Box>
          </Paper>

          {/* 代付（提现）限额信息卡片 */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              代付（提现）限额设置
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">每日额度</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.withdrawal.limits.dailyLimit)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">每月额度</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.withdrawal.limits.monthlyLimit)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">单笔限额</Typography>
                <Typography variant="body1" fontWeight="medium">{formatCurrency(currentMerchant.withdrawal.limits.singleTransactionLimit)}</Typography>
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
                      {merchant.username && (
                        <Typography variant="caption" display="block" color="primary.main">
                          绑定用户: {merchant.userFullName || merchant.username}
                        </Typography>
                      )}
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
                      代收费率: {merchant.deposit?.fee?.percentage || 0}% + ₹{merchant.deposit?.fee?.fixedAmount || 0} | 
                      代付费率: {merchant.withdrawal?.fee?.percentage || 0}% + ₹{merchant.withdrawal?.fee?.fixedAmount || 0}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      每日额度
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(merchant.deposit?.usage?.dailyUsed || 0)} / {formatCurrency(merchant.deposit?.limits?.dailyLimit || 0)}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        每月额度
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(merchant.deposit?.usage?.monthlyUsed || 0)} / {formatCurrency(merchant.deposit?.limits?.monthlyLimit || 0)}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        单笔限额: {formatCurrency(merchant.deposit?.limits?.singleTransactionLimit || 0)}
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
              {/* 商户ID是自动生成的，编辑时显示 */}
              {editingMerchant && (
                <TextField
                  fullWidth
                  label="商户ID"
                  value={formData.merchantId}
                  disabled
                  helperText="商户ID不可修改"
                />
              )}
              <TextField
                fullWidth
                label="商户名称"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              
              {/* 用户绑定选择 */}
              <FormControl fullWidth>
                <InputLabel>绑定用户 *</InputLabel>
                <Select
                  value={formData.userId}
                  label="绑定用户 *"
                  onChange={(e) => {
                    const selectedUserId = e.target.value;
                    const selectedUser = users.find(user => user.id === selectedUserId);
                    setFormData(prev => ({ 
                      ...prev, 
                      userId: selectedUserId,
                      username: selectedUser?.username || '',
                      userFullName: selectedUser?.fullName || ''
                    }));
                  }}
                  required
                  disabled={loadingUsers || users.length === 0}
                >
                  {loadingUsers ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      加载中...
                    </MenuItem>
                  ) : users.length === 0 ? (
                    <MenuItem disabled>暂无可用商户用户</MenuItem>
                  ) : (
                    users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.fullName} ({user.username})
                      </MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>
                  必须选择一个用户管理中的商户用户进行绑定
                </FormHelperText>
              </FormControl>
              
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

              {/* 代收（充值）费率配置 */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="h6" gutterBottom>
                  代收（充值）费率配置
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                label="代收费率比例 (%)"
                type="number"
                value={formData.deposit.fee.percentage}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deposit: { 
                    ...prev.deposit, 
                    fee: { 
                      ...prev.deposit.fee, 
                      percentage: parseFloat(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                required
              />

              <TextField
                fullWidth
                label="代收固定费用 (₹)"
                type="number"
                value={formData.deposit.fee.fixedAmount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deposit: { 
                    ...prev.deposit, 
                    fee: { 
                      ...prev.deposit.fee, 
                      fixedAmount: parseFloat(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ step: 0.01, min: 0 }}
                required
              />

              {/* 代付（提现）费率配置 */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="h6" gutterBottom>
                  代付（提现）费率配置
                </Typography>
              </Box>
              
              <TextField
                fullWidth
                label="代付费率比例 (%)"
                type="number"
                value={formData.withdrawal.fee.percentage}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  withdrawal: { 
                    ...prev.withdrawal, 
                    fee: { 
                      ...prev.withdrawal.fee, 
                      percentage: parseFloat(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                required
              />

              <TextField
                fullWidth
                label="代付固定费用 (₹)"
                type="number"
                value={formData.withdrawal.fee.fixedAmount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  withdrawal: { 
                    ...prev.withdrawal, 
                    fee: { 
                      ...prev.withdrawal.fee, 
                      fixedAmount: parseFloat(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ step: 0.01, min: 0 }}
                required
              />

              {/* 代收（充值）限额设置 */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  代收（充值）限额设置
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="最小充值金额 (₹)"
                type="number"
                value={formData.deposit.limits.minAmount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deposit: { 
                    ...prev.deposit, 
                    limits: { 
                      ...prev.deposit.limits, 
                      minAmount: parseInt(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ min: 1 }}
                required
              />

              <TextField
                fullWidth
                label="最大充值金额 (₹)"
                type="number"
                value={formData.deposit.limits.maxAmount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deposit: { 
                    ...prev.deposit, 
                    limits: { 
                      ...prev.deposit.limits, 
                      maxAmount: parseInt(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ min: 1 }}
                required
              />

              {/* 代付（提现）限额设置 */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  代付（提现）限额设置
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="最小提现金额 (₹)"
                type="number"
                value={formData.withdrawal.limits.minAmount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  withdrawal: { 
                    ...prev.withdrawal, 
                    limits: { 
                      ...prev.withdrawal.limits, 
                      minAmount: parseInt(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ min: 1 }}
                required
              />

              <TextField
                fullWidth
                label="最大提现金额 (₹)"
                type="number"
                value={formData.withdrawal.limits.maxAmount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  withdrawal: { 
                    ...prev.withdrawal, 
                    limits: { 
                      ...prev.withdrawal.limits, 
                      maxAmount: parseInt(e.target.value) 
                    } 
                  } 
                }))}
                inputProps={{ min: 1 }}
                required
              />

              {/* 代收（充值）额度限制 */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  代收（充值）额度限制
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="每日充值额度限制 (₹)"
                type="text"
                value={formData.deposit.limits.dailyLimit ? formatAmount(formData.deposit.limits.dailyLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      deposit: { 
                        ...prev.deposit, 
                        limits: { 
                          ...prev.deposit.limits, 
                          dailyLimit: parseInt(value) * 100 
                        } 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      deposit: { 
                        ...prev.deposit, 
                        limits: { 
                          ...prev.deposit.limits, 
                          dailyLimit: 0 
                        } 
                      } 
                    }));
                  }
                }}
                helperText="例如：1000000 表示 ₹1,000,000"
                required
              />

              <TextField
                fullWidth
                label="每月充值额度限制 (₹)"
                type="text"
                value={formData.deposit.limits.monthlyLimit ? formatAmount(formData.deposit.limits.monthlyLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      deposit: { 
                        ...prev.deposit, 
                        limits: { 
                          ...prev.deposit.limits, 
                          monthlyLimit: parseInt(value) * 100 
                        } 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      deposit: { 
                        ...prev.deposit, 
                        limits: { 
                          ...prev.deposit.limits, 
                          monthlyLimit: 0 
                        } 
                      } 
                    }));
                  }
                }}
                helperText="例如：10000000 表示 ₹10,000,000"
                required
              />

              <TextField
                fullWidth
                label="单笔充值限额 (₹)"
                type="text"
                value={formData.deposit.limits.singleTransactionLimit ? formatAmount(formData.deposit.limits.singleTransactionLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      deposit: { 
                        ...prev.deposit, 
                        limits: { 
                          ...prev.deposit.limits, 
                          singleTransactionLimit: parseInt(value) * 100 
                        } 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      deposit: { 
                        ...prev.deposit, 
                        limits: { 
                          ...prev.deposit.limits, 
                          singleTransactionLimit: 0 
                        } 
                      } 
                    }));
                  }
                }}
                helperText="例如：100000 表示 ₹100,000"
                required
              />

              {/* 代付（提现）额度限制 */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  代付（提现）额度限制
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="每日提现额度限制 (₹)"
                type="text"
                value={formData.withdrawal.limits.dailyLimit ? formatAmount(formData.withdrawal.limits.dailyLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      withdrawal: { 
                        ...prev.withdrawal, 
                        limits: { 
                          ...prev.withdrawal.limits, 
                          dailyLimit: parseInt(value) * 100 
                        } 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      withdrawal: { 
                        ...prev.withdrawal, 
                        limits: { 
                          ...prev.withdrawal.limits, 
                          dailyLimit: 0 
                        } 
                      } 
                    }));
                  }
                }}
                helperText="例如：1000000 表示 ₹1,000,000"
                required
              />

              <TextField
                fullWidth
                label="每月提现额度限制 (₹)"
                type="text"
                value={formData.withdrawal.limits.monthlyLimit ? formatAmount(formData.withdrawal.limits.monthlyLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      withdrawal: { 
                        ...prev.withdrawal, 
                        limits: { 
                          ...prev.withdrawal.limits, 
                          monthlyLimit: parseInt(value) * 100 
                        } 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      withdrawal: { 
                        ...prev.withdrawal, 
                        limits: { 
                          ...prev.withdrawal.limits, 
                          monthlyLimit: 0 
                        } 
                      } 
                    }));
                  }
                }}
                helperText="例如：10000000 表示 ₹10,000,000"
                required
              />

              <TextField
                fullWidth
                label="单笔提现限额 (₹)"
                type="text"
                value={formData.withdrawal.limits.singleTransactionLimit ? formatAmount(formData.withdrawal.limits.singleTransactionLimit) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value) {
                    setFormData(prev => ({ 
                      ...prev, 
                      withdrawal: { 
                        ...prev.withdrawal, 
                        limits: { 
                          ...prev.withdrawal.limits, 
                          singleTransactionLimit: parseInt(value) * 100 
                        } 
                      } 
                    }));
                  } else {
                    setFormData(prev => ({ 
                      ...prev, 
                      withdrawal: { 
                        ...prev.withdrawal, 
                        limits: { 
                          ...prev.withdrawal.limits, 
                          singleTransactionLimit: 0 
                        } 
                      } 
                    }));
                  }
                }}
                helperText="例如：100000 表示 ₹100,000"
                required
              />

              {/* IP白名单管理 */}
              {editingMerchant && (
                <>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SecurityIcon color="primary" />
                      IP白名单管理
                    </Typography>
                  </Box>

                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <FormControl>
                        <label>
                          <input
                            type="checkbox"
                            checked={formData.ipWhitelist.enabled}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              ipWhitelist: {
                                ...prev.ipWhitelist,
                                enabled: e.target.checked
                              }
                            }))}
                          />
                          启用IP白名单
                        </label>
                      </FormControl>
                      <FormControl>
                        <label>
                          <input
                            type="checkbox"
                            checked={formData.ipWhitelist.strictMode}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              ipWhitelist: {
                                ...prev.ipWhitelist,
                                strictMode: e.target.checked
                              }
                            }))}
                            disabled={!formData.ipWhitelist.enabled}
                          />
                          严格模式
                        </label>
                      </FormControl>
                    </Box>
                    
                    {/* 添加IP表单 */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 2, 
                      mb: 2, 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1 
                    }}>
                      <TextField
                        size="small"
                        label="IP地址"
                        value={newIP.ip}
                        onChange={(e) => setNewIP({ ...newIP, ip: e.target.value })}
                        placeholder="192.168.1.1"
                        sx={{ flex: 1 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>掩码</InputLabel>
                        <Select
                          value={newIP.mask}
                          label="掩码"
                          onChange={(e) => setNewIP({ ...newIP, mask: Number(e.target.value) })}
                        >
                          <MenuItem value={32}>32 (单个IP)</MenuItem>
                          <MenuItem value={24}>24 (256个IP)</MenuItem>
                          <MenuItem value={16}>16 (65536个IP)</MenuItem>
                          <MenuItem value={8}>8 (16777216个IP)</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        label="描述"
                        value={newIP.description}
                        onChange={(e) => setNewIP({ ...newIP, description: e.target.value })}
                        placeholder="办公室网络"
                        sx={{ flex: 1 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIPIcon />}
                        onClick={() => {
                          if (!newIP.ip) return;
                          const newIPEntry = {
                            id: Date.now().toString(),
                            ip: newIP.ip,
                            mask: newIP.mask,
                            description: newIP.description,
                            status: 'ACTIVE',
                            addedAt: new Date().toISOString(),
                            usageCount: 0
                          };
                          setFormData(prev => ({
                            ...prev,
                            ipWhitelist: {
                              ...prev.ipWhitelist,
                              allowedIPs: [...prev.ipWhitelist.allowedIPs, newIPEntry]
                            }
                          }));
                          setNewIP({ ip: '', mask: 32, description: '' });
                        }}
                        disabled={!newIP.ip}
                      >
                        添加
                      </Button>
                    </Box>

                    {/* IP列表 */}
                    {formData.ipWhitelist.allowedIPs.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          已配置的IP ({formData.ipWhitelist.allowedIPs.length})
                        </Typography>
                        <Box sx={{ maxHeight: 200, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                          {formData.ipWhitelist.allowedIPs.map((ip: any) => (
                            <Box
                              key={ip.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 1,
                                borderBottom: 1,
                                borderColor: 'divider',
                                '&:last-child': { borderBottom: 0 }
                              }}
                            >
                              <Box>
                                <Typography variant="body2" fontFamily="monospace">
                                  {ip.mask === 32 ? ip.ip : `${ip.ip}/${ip.mask}`}
                                </Typography>
                                {ip.description && (
                                  <Typography variant="caption" color="text.secondary">
                                    {ip.description}
                                  </Typography>
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={ip.status}
                                  color={ip.status === 'ACTIVE' ? 'success' : 'error'}
                                  size="small"
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      ipWhitelist: {
                                        ...prev.ipWhitelist,
                                        allowedIPs: prev.ipWhitelist.allowedIPs.filter((item: any) => item.id !== ip.id)
                                      }
                                    }));
                                  }}
                                  color="error"
                                >
                                  <DeleteIPIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* IP测试 */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 2, 
                      alignItems: 'flex-start',
                      p: 2, 
                      bgcolor: 'blue.50', 
                      borderRadius: 1 
                    }}>
                      <TextField
                        size="small"
                        label="测试IP"
                        value={testIP}
                        onChange={(e) => setTestIP(e.target.value)}
                        placeholder="192.168.1.100"
                        sx={{ flex: 1 }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={testLoading ? <CircularProgress size={16} /> : <NetworkCheckIcon />}
                        onClick={() => {
                          if (!testIP || !formData.ipWhitelist.enabled) return;
                          
                          setTestLoading(true);
                          // 模拟测试逻辑
                          setTimeout(() => {
                            const isAllowed = formData.ipWhitelist.allowedIPs.some((ip: any) => {
                              if (ip.status !== 'ACTIVE') return false;
                              if (ip.mask === 32) return ip.ip === testIP;
                              // 简化的CIDR检查
                              return testIP.startsWith(ip.ip.split('.').slice(0, ip.mask / 8).join('.'));
                            });
                            
                            setTestResult({
                              allowed: isAllowed,
                              reason: isAllowed ? 'IP在白名单中' : 'IP不在白名单中'
                            });
                            setTestLoading(false);
                          }, 1000);
                        }}
                        disabled={!testIP || !formData.ipWhitelist.enabled || testLoading}
                      >
                        测试
                      </Button>
                    </Box>

                    {testResult && (
                      <Alert 
                        severity={testResult.allowed ? 'success' : 'error'} 
                        sx={{ mt: 2 }}
                        icon={testResult.allowed ? <CheckCircleIcon /> : <BlockIcon />}
                      >
                        <Typography variant="body2">
                          {testResult.allowed ? 'IP访问允许' : 'IP访问被拒绝'}: {testResult.reason}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </>
              )}
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