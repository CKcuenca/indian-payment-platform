import React, { useState, useEffect, useCallback } from 'react';
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
  TablePagination,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Avatar,
  Tooltip,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Visibility as VisibilityIcon,
  AccountBalance as AccountBalanceIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
  Report as ReportIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Transaction } from '../types';
import { merchantService } from '../services/merchantService';
import { formatAmount, formatDate as formatDateUtil } from '../utils/formatters';
import { authService } from '../services/authService';

function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<{ 
    type: string; 
    status: string; 
    merchantId: string; 
    providerName: string;
    startDate: string;
    endDate: string;
    transactionId: string;
  }>({
    type: '',
    status: '',
    merchantId: '',
    providerName: '',
    startDate: '',
    endDate: '',
    transactionId: '',
  });
  const [tempFilters, setTempFilters] = useState<{ 
    type: string; 
    status: string; 
    merchantId: string; 
    providerName: string;
    startDate: string;
    endDate: string;
    transactionId: string;
  }>({
    type: '',
    status: '',
    merchantId: '',
    providerName: '',
    startDate: '',
    endDate: '',
    transactionId: '',
  });
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // 操作对话框状态
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [resolveDisputeDialogOpen, setResolveDisputeDialogOpen] = useState(false);
  const [blockOrderDialogOpen, setBlockOrderDialogOpen] = useState(false);
  
  // 操作表单状态
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeResolution, setDisputeResolution] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [riskLevel, setRiskLevel] = useState('MEDIUM');
  const [merchants, setMerchants] = useState<Array<{ merchantId: string; name: string }>>([]);
  const [providers, setProviders] = useState<Array<{ name: string; displayName: string }>>([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.merchantId) params.merchantId = filters.merchantId;
      if (filters.providerName) params.providerName = filters.providerName;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.transactionId) params.transactionId = filters.transactionId;

      const response = await merchantService.getTransactions(params);
      
      setTransactions(response.data?.data || []);
      setTotalPages(response.data?.pagination?.pages || 0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || '获取交易记录失败';
      setError(errorMessage);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // 获取商户列表
  const fetchMerchants = useCallback(async () => {
    try {
      // 从API获取商户数据
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/merchant`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setMerchants(result.data);
        } else {
          setMerchants([]);
        }
      } else {
        console.error('获取商户列表失败:', response.status);
        setMerchants([]);
      }
    } catch (err) {
      console.error('获取商户列表失败:', err);
      setMerchants([]);
    }
  }, []);

  // 获取支付商列表
  const fetchProviders = useCallback(async () => {
    try {
      // 从API获取支付商数据
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/payment-config`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const providers = result.data.map((item: any) => ({
            id: item._id,
            name: item.provider.name,
            type: item.provider.type || 'native',
            environment: item.provider.environment
          }));
          setProviders(providers);
        } else {
          setProviders([]);
        }
      } else {
        console.error('获取支付商列表失败:', response.status);
        setProviders([]);
      }
    } catch (err) {
      console.error('获取支付商列表失败:', err);
      setProviders([]);
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchMerchants();
    fetchProviders();
  }, [fetchMerchants, fetchProviders]);

  // 初始化临时筛选状态
  useEffect(() => {
    setTempFilters(filters);
    setTempDateRange(dateRange);
  }, [filters, dateRange]);

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // 重置到第一页
  };

  const handleFilterChange = (field: string, value: string) => {
    setTempFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDateRangeChange = (newValue: [Date | null, Date | null]) => {
    setTempDateRange(newValue);
    setTempFilters(prev => ({
      ...prev,
      startDate: newValue[0] ? newValue[0].toISOString().split('T')[0] : '',
      endDate: newValue[1] ? newValue[1].toISOString().split('T')[0] : ''
    }));
  };

  // 验证日期范围
  const validateDateRange = (startDate: Date | null, endDate: Date | null): boolean => {
    if (!startDate || !endDate) return true;
    return startDate <= endDate;
  };

  const handleApplyFilters = () => {
    // 验证日期范围
    if (!validateDateRange(tempDateRange[0], tempDateRange[1])) {
      setError('开始日期不能晚于结束日期');
      return;
    }
    
    setFilters(tempFilters);
    setDateRange(tempDateRange);
    setPage(0);
    setError(null); // 清除之前的错误
  };

  const handleResetFilters = () => {
    const resetFilters = {
      type: '',
      status: '',
      merchantId: '',
      providerName: '',
      startDate: '',
      endDate: '',
      transactionId: '',
    };
    setTempFilters(resetFilters);
    setFilters(resetFilters);
    setTempDateRange([null, null]);
    setDateRange([null, null]);
    setPage(0);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    try {
      console.log('Opening transaction details:', transaction);
      setSelectedTransaction(transaction);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error opening transaction details:', error);
      setError('打开详情失败');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTransaction(null);
  };

  // 退款处理
  const handleRefund = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setRefundAmount(transaction.amount.toString());
    setRefundReason('');
    setRefundDialogOpen(true);
  };

  const handleRefundSubmit = async () => {
    if (!selectedTransaction || !refundAmount || !refundReason) return;
    
    try {
      const response = await fetch(`/api/payment/refund/${selectedTransaction.orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundAmount: parseInt(refundAmount),
          reason: refundReason,
          operator: 'admin'
        })
      });
      
      if (response.ok) {
        setRefundDialogOpen(false);
        fetchTransactions();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || '退款处理失败');
      }
    } catch (error) {
      setError('退款处理失败');
    }
  };

  // 争议处理
  const handleDispute = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDisputeReason('');
    setDisputeDialogOpen(true);
  };

  const handleDisputeSubmit = async () => {
    if (!selectedTransaction || !disputeReason) return;
    
    try {
      const response = await fetch(`/api/payment/dispute/${selectedTransaction.orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: disputeReason,
          operator: 'admin'
        })
      });
      
      if (response.ok) {
        setDisputeDialogOpen(false);
        fetchTransactions();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || '争议处理失败');
      }
    } catch (error) {
      setError('争议处理失败');
    }
  };

  // 解决争议
  const handleResolveDispute = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDisputeResolution('');
    setResolveDisputeDialogOpen(true);
  };

  const handleResolveDisputeSubmit = async () => {
    if (!selectedTransaction || !disputeResolution) return;
    
    try {
      const response = await fetch(`/api/payment/dispute/${selectedTransaction.orderId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: disputeResolution,
          operator: 'admin'
        })
      });
      
      if (response.ok) {
        setResolveDisputeDialogOpen(false);
        fetchTransactions();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || '争议解决失败');
      }
    } catch (error) {
      setError('争议解决失败');
    }
  };

  // 风控拦截
  const handleBlockOrder = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setBlockReason('');
    setRiskLevel('MEDIUM');
    setBlockOrderDialogOpen(true);
  };

  const handleBlockOrderSubmit = async () => {
    if (!selectedTransaction || !blockReason) return;
    
    try {
      const response = await fetch(`/api/payment/block/${selectedTransaction.orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskLevel,
          riskFactors: ['manual_block'],
          blockedReason: blockReason
        })
      });
      
      if (response.ok) {
        setBlockOrderDialogOpen(false);
        fetchTransactions();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || '风控拦截失败');
      }
    } catch (error) {
      setError('风控拦截失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      // 基础状态
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'info';
      case 'SUCCESS': return 'success';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'default';
      
      // 高级状态
      case 'TIMEOUT': return 'warning';
      case 'PARTIAL_SUCCESS': return 'success';
      case 'REFUNDED': return 'info';
      case 'PARTIAL_REFUNDED': return 'info';
      case 'DISPUTED': return 'warning';
      case 'DISPUTE_RESOLVED': return 'success';
      case 'RISK_BLOCKED': return 'error';
      case 'MANUAL_REVIEW': return 'warning';
      case 'REVERSED': return 'error';
      case 'EXPIRED': return 'default';
      
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      // 基础状态
      case 'PENDING': return '待处理';
      case 'PROCESSING': return '处理中';
      case 'SUCCESS': return '成功';
      case 'FAILED': return '失败';
      case 'CANCELLED': return '已取消';
      
      // 高级状态
      case 'TIMEOUT': return '超时';
      case 'PARTIAL_SUCCESS': return '部分成功';
      case 'REFUNDED': return '已退款';
      case 'PARTIAL_REFUNDED': return '部分退款';
      case 'DISPUTED': return '争议中';
      case 'DISPUTE_RESOLVED': return '争议已解决';
      case 'RISK_BLOCKED': return '风控拦截';
      case 'MANUAL_REVIEW': return '人工审核';
      case 'REVERSED': return '已冲正';
      case 'EXPIRED': return '已过期';
      
      default: return status;
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      // 基础状态
      case 'PENDING': return '待支付';
      case 'PROCESSING': return '处理中';
      case 'SUCCESS': return '支付成功';
      case 'FAILED': return '支付失败';
      case 'CANCELLED': return '已取消';
      
      // 高级状态
      case 'TIMEOUT': return '支付超时';
      case 'PARTIAL_SUCCESS': return '部分成功';
      case 'REFUNDED': return '已退款';
      case 'PARTIAL_REFUNDED': return '部分退款';
      case 'DISPUTED': return '争议中';
      case 'DISPUTE_RESOLVED': return '争议已解决';
      case 'RISK_BLOCKED': return '风控拦截';
      case 'MANUAL_REVIEW': return '人工审核';
      case 'REVERSED': return '已冲正';
      case 'EXPIRED': return '已过期';
      
      default: return status;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      // 基础状态
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'info';
      case 'SUCCESS': return 'success';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'default';
      
      // 高级状态
      case 'TIMEOUT': return 'warning';
      case 'PARTIAL_SUCCESS': return 'success';
      case 'REFUNDED': return 'info';
      case 'PARTIAL_REFUNDED': return 'info';
      case 'DISPUTED': return 'warning';
      case 'DISPUTE_RESOLVED': return 'success';
      case 'RISK_BLOCKED': return 'error';
      case 'MANUAL_REVIEW': return 'warning';
      case 'REVERSED': return 'error';
      case 'EXPIRED': return 'default';
      
      default: return 'default';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return '代收';
      case 'WITHDRAWAL': return '代付';
      case 'REFUND': return '退款';
      case 'ADJUSTMENT': return '调整';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return <TrendingUpIcon color="success" />;
      case 'WITHDRAWAL': return <TrendingDownIcon color="error" />;
      case 'REFUND': return <TrendingUpIcon color="warning" />;
      case 'ADJUSTMENT': return <TrendingUpIcon color="info" />;
      default: return <TrendingUpIcon />;
    }
  };

  const formatCurrency = (amount: number) => {
    return formatAmount(amount);
  };

  const formatDate = (dateString: string) => {
    return formatDateUtil(dateString);
  };

  // 导出Excel功能
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      // 获取所有交易数据（不分页）
      const params: any = {
        page: 1,
        limit: 10000, // 获取大量数据
      };
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.merchantId) params.merchantId = filters.merchantId;
      if (filters.providerName) params.providerName = filters.providerName;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.transactionId) params.transactionId = filters.transactionId;

      const response = await merchantService.getTransactions(params);
      const allTransactions = response.data?.data || [];

      // 准备导出数据
      const exportData = allTransactions.map((transaction: Transaction) => ({
        '交易ID': transaction.transactionId,
        '订单ID': transaction.orderId || '',
        '商户ID': transaction.merchantId,
        '交易类型': getTypeText(transaction.type),
        '交易金额': transaction.amount,
        '手续费': transaction.fee,
        '净额': transaction.netAmount,
        '货币': transaction.currency,
        '余额变化': transaction.balanceChange,
        '交易前余额': transaction.balanceSnapshot.before,
        '交易后余额': transaction.balanceSnapshot.after,
        '交易状态': getStatusText(transaction.status),
        '支付商': transaction.provider?.name || '',
        '支付商参考ID': transaction.provider?.refId || '',
        'UPI ID': transaction.upiPayment?.upiId || '',
        '手机号': transaction.upiPayment?.phoneNumber || '',
        '账户名称': transaction.upiPayment?.accountName || '',
        '银行名称': transaction.upiPayment?.bankName || '',
        'IFSC代码': transaction.upiPayment?.ifscCode || '',
        '账户号码': transaction.upiPayment?.accountNumber || '',
        '收款账户': transaction.beneficiaryAccount || '',
        '收款人姓名': transaction.beneficiaryName || '',
        '创建时间': formatDate(transaction.createdAt),
        '更新时间': formatDate(transaction.updatedAt),
      }));

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const columnWidths = [
        { wch: 20 }, // 交易ID
        { wch: 20 }, // 订单ID
        { wch: 15 }, // 商户ID
        { wch: 12 }, // 交易类型
        { wch: 12 }, // 交易金额
        { wch: 10 }, // 手续费
        { wch: 12 }, // 净额
        { wch: 8 },  // 货币
        { wch: 12 }, // 余额变化
        { wch: 12 }, // 交易前余额
        { wch: 12 }, // 交易后余额
        { wch: 12 }, // 交易状态
        { wch: 12 }, // 支付商
        { wch: 20 }, // 支付商参考ID
        { wch: 20 }, // UPI ID
        { wch: 15 }, // 手机号
        { wch: 15 }, // 账户名称
        { wch: 15 }, // 银行名称
        { wch: 15 }, // IFSC代码
        { wch: 15 }, // 账户号码
        { wch: 20 }, // 收款账户
        { wch: 15 }, // 收款人姓名
        { wch: 20 }, // 创建时间
        { wch: 20 }, // 更新时间
      ];
      worksheet['!cols'] = columnWidths;

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '交易数据');

      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `交易数据_${timestamp}.xlsx`;

      // 导出文件
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

    } catch (err) {
      console.error('导出失败:', err);
      setError('导出失败，请重试');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: 'primary.main',
            fontWeight: 'bold'
          }}
        >
          交易记录
        </Typography>
        <Button
          variant="outlined"
          startIcon={exportLoading ? <CircularProgress size={16} /> : <FileDownloadIcon />}
          onClick={handleExportExcel}
          disabled={exportLoading || transactions.length === 0}
          sx={{ 
            fontSize: '0.875rem',
            '& .MuiButton-startIcon': { fontSize: '0.875rem' }
          }}
        >
          {exportLoading ? '导出中...' : '导出'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 筛选条件 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <TextField
              label="交易ID搜索"
              value={tempFilters.transactionId}
              onChange={(e) => handleFilterChange('transactionId', e.target.value)}
              placeholder="输入交易ID"
              fullWidth
              sx={{
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem'
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem'
                }
              }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.875rem' }}>交易类型</InputLabel>
              <Select
                value={tempFilters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.875rem' }}>全部</MenuItem>
                <MenuItem value="DEPOSIT" sx={{ fontSize: '0.875rem' }}>代收</MenuItem>
                <MenuItem value="WITHDRAWAL" sx={{ fontSize: '0.875rem' }}>代付</MenuItem>
                <MenuItem value="REFUND" sx={{ fontSize: '0.875rem' }}>退款</MenuItem>
                <MenuItem value="ADJUSTMENT" sx={{ fontSize: '0.875rem' }}>调整</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.875rem' }}>状态</InputLabel>
              <Select
                value={tempFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.875rem' }}>全部</MenuItem>
                <MenuItem value="PENDING" sx={{ fontSize: '0.875rem' }}>待支付</MenuItem>
                <MenuItem value="PROCESSING" sx={{ fontSize: '0.875rem' }}>处理中</MenuItem>
                <MenuItem value="SUCCESS" sx={{ fontSize: '0.875rem' }}>支付成功</MenuItem>
                <MenuItem value="FAILED" sx={{ fontSize: '0.875rem' }}>支付失败</MenuItem>
                <MenuItem value="CANCELLED" sx={{ fontSize: '0.875rem' }}>已取消</MenuItem>
                <MenuItem value="TIMEOUT" sx={{ fontSize: '0.875rem' }}>支付超时</MenuItem>
                <MenuItem value="PARTIAL_SUCCESS" sx={{ fontSize: '0.875rem' }}>部分成功</MenuItem>
                <MenuItem value="REFUNDED" sx={{ fontSize: '0.875rem' }}>已退款</MenuItem>
                <MenuItem value="PARTIAL_REFUNDED" sx={{ fontSize: '0.875rem' }}>部分退款</MenuItem>
                <MenuItem value="DISPUTED" sx={{ fontSize: '0.875rem' }}>争议中</MenuItem>
                <MenuItem value="DISPUTE_RESOLVED" sx={{ fontSize: '0.875rem' }}>争议已解决</MenuItem>
                <MenuItem value="RISK_BLOCKED" sx={{ fontSize: '0.875rem' }}>风控拦截</MenuItem>
                <MenuItem value="MANUAL_REVIEW" sx={{ fontSize: '0.875rem' }}>人工审核</MenuItem>
                <MenuItem value="REVERSED" sx={{ fontSize: '0.875rem' }}>已冲正</MenuItem>
                <MenuItem value="EXPIRED" sx={{ fontSize: '0.875rem' }}>已过期</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.875rem' }}>选择商户</InputLabel>
              <Select
                value={tempFilters.merchantId}
                onChange={(e) => handleFilterChange('merchantId', e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.875rem' }}>全部商户</MenuItem>
                {merchants.map((merchant) => (
                  <MenuItem key={merchant.merchantId} value={merchant.merchantId} sx={{ fontSize: '0.875rem' }}>
                    {merchant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.875rem' }}>选择支付商</InputLabel>
              <Select
                value={tempFilters.providerName}
                onChange={(e) => handleFilterChange('providerName', e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="" sx={{ fontSize: '0.875rem' }}>全部支付商</MenuItem>
                {providers.map((provider) => (
                  <MenuItem key={provider.name} value={provider.name} sx={{ fontSize: '0.875rem' }}>
                    {provider.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="开始日期"
                value={tempDateRange[0]}
                onChange={(newValue) => {
                  const newDateRange: [Date | null, Date | null] = [newValue, tempDateRange[1]];
                  handleDateRangeChange(newDateRange);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: {
                      '& .MuiInputLabel-root': {
                        fontSize: '0.875rem'
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.875rem'
                      }
                    }
                  }
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="结束日期"
                value={tempDateRange[1]}
                onChange={(newValue) => {
                  const newDateRange: [Date | null, Date | null] = [tempDateRange[0], newValue];
                  handleDateRangeChange(newDateRange);
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    sx: {
                      '& .MuiInputLabel-root': {
                        fontSize: '0.875rem'
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.875rem'
                      }
                    }
                  }
                }}
              />
            </LocalizationProvider>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button
              variant="outlined"
              onClick={handleResetFilters}
              sx={{ fontSize: '0.875rem' }}
            >
              重置
            </Button>
            <Button
              variant="contained"
              onClick={handleApplyFilters}
              sx={{ fontSize: '0.875rem' }}
            >
              确定
            </Button>
          </Box>
        </Box>
      </Box>



      {/* 交易记录列表 */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>交易ID</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>商户信息</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>支付账户</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>交易类型</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>金额</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>手续费</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>净额</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>余额变化</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>状态</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>创建时间</TableCell>
              <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    暂无记录
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow 
                  key={transaction.transactionId}
                  sx={{ 
                    '&:hover': { 
                      backgroundColor: 'action.hover',
                      cursor: 'pointer'
                    }
                  }}
                >
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {transaction.transactionId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                      <BusinessIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {transaction.merchantId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        商户ID
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'success.main' }}>
                      <AccountBalanceIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {transaction.provider?.name || 'N/A'}
                      </Typography>
                      {transaction.provider?.refId && (
                        <Typography variant="caption" color="text.secondary">
                          {transaction.provider.refId}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTypeIcon(transaction.type)}
                    <Chip
                      label={getTypeText(transaction.type)}
                      color={transaction.type === 'DEPOSIT' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(transaction.amount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(transaction.fee)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(transaction.netAmount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    color={transaction.balanceChange >= 0 ? 'success.main' : 'error.main'}
                  >
                    {transaction.balanceChange >= 0 ? '+' : ''}{formatCurrency(transaction.balanceChange)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={transaction.orderStatus ? getOrderStatusText(transaction.orderStatus) : getStatusText(transaction.status)}
                    color={(transaction.orderStatus ? getOrderStatusColor(transaction.orderStatus) : getStatusColor(transaction.status)) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(transaction.createdAt).toLocaleString('zh-CN')}
                  </Typography>
                </TableCell>
                                  <TableCell>
                    <Tooltip title="查看详情">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewTransaction(transaction)}
                      >
                        详情
                      </Button>
                    </Tooltip>
                  </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mt: 2,
        p: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1
      }}>
        <TablePagination
          component="div"
          count={totalPages * rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / ${count !== -1 ? count : `超过 ${to}`}`
          }
          labelRowsPerPage="每页行数:"
          sx={{
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.875rem'
            }
          }}
        />
      </Box>

      {/* 交易详情对话框 */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
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
            交易详情
          </Typography>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            size="small"
          >
            关闭
          </Button>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {selectedTransaction ? (
            <Box sx={{ mt: 2 }}>
              {/* 状态操作面板 - 放在最上面 */}
              <Box sx={{ mb: 4, p: 3, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color="primary">当前状态:</Typography>
                    <Chip
                      label={selectedTransaction.orderStatus ? getOrderStatusText(selectedTransaction.orderStatus) : getStatusText(selectedTransaction.status)}
                      color={selectedTransaction.orderStatus ? getOrderStatusColor(selectedTransaction.orderStatus) : getStatusColor(selectedTransaction.status)}
                      size="medium"
                      sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                    />
                  </Box>
                  
                  {/* 操作按钮区域 */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {/* 退款操作 */}
                    {selectedTransaction.status === 'SUCCESS' && (
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={() => handleRefund(selectedTransaction)}
                        startIcon={<RefreshIcon />}
                        size="medium"
                      >
                        退款
                      </Button>
                    )}
                    
                    {/* 争议操作 */}
                    {['SUCCESS', 'FAILED', 'CANCELLED'].includes(selectedTransaction.status) && (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleDispute(selectedTransaction)}
                        startIcon={<ReportIcon />}
                        size="medium"
                      >
                        发起争议
                      </Button>
                    )}
                    
                    {/* 解决争议操作 */}
                    {selectedTransaction.status === 'DISPUTED' && (
                      <Button
                        variant="contained"
                        color="info"
                        onClick={() => handleResolveDispute(selectedTransaction)}
                        startIcon={<CheckCircleIcon />}
                        size="medium"
                      >
                        解决争议
                      </Button>
                    )}
                    
                    {/* 风控拦截操作 */}
                    {['PENDING', 'PROCESSING'].includes(selectedTransaction.status) && (
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleBlockOrder(selectedTransaction)}
                        startIcon={<SecurityIcon />}
                        size="medium"
                      >
                        风控拦截
                      </Button>
                    )}
                  </Box>
                </Box>
                
                {/* 操作说明 */}
                {(['SUCCESS', 'FAILED', 'CANCELLED', 'DISPUTED', 'PENDING', 'PROCESSING'].includes(selectedTransaction.status)) && (
                  <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'primary.300' }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>操作说明：</strong>
                      {selectedTransaction.status === 'SUCCESS' && ' 可以对成功的交易进行退款操作'}
                      {['SUCCESS', 'FAILED', 'CANCELLED'].includes(selectedTransaction.status) && ' 可以对交易发起争议'}
                      {selectedTransaction.status === 'DISPUTED' && ' 可以解决当前的争议'}
                      {['PENDING', 'PROCESSING'].includes(selectedTransaction.status) && ' 可以对交易进行风控拦截'}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* 详细信息区域 */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>基本信息</Typography>
                  <Typography variant="body2"><strong>交易ID:</strong> {selectedTransaction.transactionId}</Typography>
                  {selectedTransaction.orderId && (
                    <Typography variant="body2"><strong>订单ID:</strong> {selectedTransaction.orderId}</Typography>
                  )}
                  <Typography variant="body2"><strong>商户ID:</strong> {selectedTransaction.merchantId}</Typography>
                  <Typography variant="body2"><strong>交易类型:</strong> {getTypeText(selectedTransaction.type)}</Typography>
                  <Typography variant="body2"><strong>创建时间:</strong> {new Date(selectedTransaction.createdAt).toLocaleString('zh-CN')}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="h6" gutterBottom>金额信息</Typography>
                  <Typography variant="body2"><strong>交易金额:</strong> {formatCurrency(selectedTransaction.amount)}</Typography>
                  <Typography variant="body2"><strong>手续费:</strong> {formatCurrency(selectedTransaction.fee)}</Typography>
                  <Typography variant="body2"><strong>净额:</strong> {formatCurrency(selectedTransaction.netAmount)}</Typography>
                  <Typography variant="body2"><strong>余额变化:</strong> 
                    <span style={{ color: selectedTransaction.balanceChange >= 0 ? 'green' : 'red' }}>
                      {selectedTransaction.balanceChange >= 0 ? '+' : ''}{formatCurrency(selectedTransaction.balanceChange)}
                    </span>
                  </Typography>
                  <Typography variant="body2"><strong>货币:</strong> {selectedTransaction.currency}</Typography>
                </Box>

                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="h6" gutterBottom>余额快照</Typography>
                  <Typography variant="body2"><strong>交易前余额:</strong> {formatCurrency(selectedTransaction.balanceSnapshot.before)}</Typography>
                  <Typography variant="body2"><strong>交易后余额:</strong> {formatCurrency(selectedTransaction.balanceSnapshot.after)}</Typography>
                </Box>

                {selectedTransaction.provider && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="h6" gutterBottom>支付信息</Typography>
                    <Typography variant="body2"><strong>支付商:</strong> {selectedTransaction.provider.name}</Typography>
                    {selectedTransaction.provider.refId && (
                      <Typography variant="body2"><strong>支付商参考ID:</strong> {selectedTransaction.provider.refId}</Typography>
                    )}
                  </Box>
                )}

                {selectedTransaction.beneficiaryAccount && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="h6" gutterBottom>收款方信息</Typography>
                    <Typography variant="body2"><strong>收款账户:</strong> {selectedTransaction.beneficiaryAccount}</Typography>
                    {selectedTransaction.beneficiaryName && (
                      <Typography variant="body2"><strong>收款人姓名:</strong> {selectedTransaction.beneficiaryName}</Typography>
                    )}
                  </Box>
                )}

                {selectedTransaction.upiPayment && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="h6" gutterBottom>UPI支付信息</Typography>
                    <Typography variant="body2"><strong>UPI ID:</strong> {selectedTransaction.upiPayment.upiId}</Typography>
                    <Typography variant="body2"><strong>手机号:</strong> {selectedTransaction.upiPayment.phoneNumber}</Typography>
                    {selectedTransaction.upiPayment.accountName && (
                      <Typography variant="body2"><strong>账户名称:</strong> {selectedTransaction.upiPayment.accountName}</Typography>
                    )}
                    {selectedTransaction.upiPayment.bankName && (
                      <Typography variant="body2"><strong>银行名称:</strong> {selectedTransaction.upiPayment.bankName}</Typography>
                    )}
                    {selectedTransaction.upiPayment.ifscCode && (
                      <Typography variant="body2"><strong>IFSC代码:</strong> {selectedTransaction.upiPayment.ifscCode}</Typography>
                    )}
                    {selectedTransaction.upiPayment.accountNumber && (
                      <Typography variant="body2"><strong>账户号码:</strong> {selectedTransaction.upiPayment.accountNumber}</Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                加载中...
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* 退款对话框 */}
      <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">退款处理</Typography>
          <Button onClick={() => setRefundDialogOpen(false)} size="small">关闭</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="退款金额"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              fullWidth
              helperText="请输入退款金额（分）"
            />
            <TextField
              label="退款原因"
              multiline
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              fullWidth
              helperText="请详细说明退款原因"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRefundDialogOpen(false)}>取消</Button>
          <Button onClick={handleRefundSubmit} variant="contained" color="warning">
            确认退款
          </Button>
        </DialogActions>
      </Dialog>

      {/* 争议对话框 */}
      <Dialog open={disputeDialogOpen} onClose={() => setDisputeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">发起争议</Typography>
          <Button onClick={() => setDisputeDialogOpen(false)} size="small">关闭</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            label="争议原因"
            multiline
            rows={4}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            fullWidth
            helperText="请详细说明争议原因"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDisputeDialogOpen(false)}>取消</Button>
          <Button onClick={handleDisputeSubmit} variant="contained" color="error">
            发起争议
          </Button>
        </DialogActions>
      </Dialog>

      {/* 解决争议对话框 */}
      <Dialog open={resolveDisputeDialogOpen} onClose={() => setResolveDisputeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">解决争议</Typography>
          <Button onClick={() => setResolveDisputeDialogOpen(false)} size="small">关闭</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            label="解决结果"
            multiline
            rows={4}
            value={disputeResolution}
            onChange={(e) => setDisputeResolution(e.target.value)}
            fullWidth
            helperText="请详细说明争议解决结果"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResolveDisputeDialogOpen(false)}>取消</Button>
          <Button onClick={handleResolveDisputeSubmit} variant="contained" color="info">
            确认解决
          </Button>
        </DialogActions>
      </Dialog>

      {/* 风控拦截对话框 */}
      <Dialog open={blockOrderDialogOpen} onClose={() => setBlockOrderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">风控拦截</Typography>
          <Button onClick={() => setBlockOrderDialogOpen(false)} size="small">关闭</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>风险等级</InputLabel>
              <Select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                label="风险等级"
              >
                <MenuItem value="LOW">低风险</MenuItem>
                <MenuItem value="MEDIUM">中风险</MenuItem>
                <MenuItem value="HIGH">高风险</MenuItem>
                <MenuItem value="CRITICAL">极高风险</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="拦截原因"
              multiline
              rows={3}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              fullWidth
              helperText="请详细说明拦截原因"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBlockOrderDialogOpen(false)}>取消</Button>
          <Button onClick={handleBlockOrderSubmit} variant="contained" color="error">
            确认拦截
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Transactions;
export {};
