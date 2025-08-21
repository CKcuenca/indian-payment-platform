import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Button
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Speed,
  Error,
  Refresh
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../services/api';
import { formatAmount as formatAmountUtil } from '../utils/formatters';

interface PaymentConfig {
  _id: string;
  accountName: string;
  provider: {
    name: string;
  };
}

interface PaymentStats {
  _id: string;
  paymentAccountId: string;
  date: string;
  orders: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    cancelled: number;
  };
  amounts: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    refunded: number;
  };
  successRate: number;
  avgProcessingTime: number;
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

interface AggregatedStats {
  totalOrders: number;
  successOrders: number;
  failedOrders: number;
  totalAmount: number;
  successAmount: number;
  avgSuccessRate: number;
  avgProcessingTime: number;
}

const PaymentData: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 筛选条件
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [timeDimension, setTimeDimension] = useState<string>('daily');
  
  // 临时筛选状态
  const [tempSelectedAccount, setTempSelectedAccount] = useState<string>('');
  const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [tempTimeDimension, setTempTimeDimension] = useState<string>('daily');
  
  // 数据
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);
  const [stats, setStats] = useState<PaymentStats[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);
  
  // 分页状态
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // 获取支付配置列表
  const fetchPaymentConfigs = useCallback(async () => {
    try {
      const response = await api.get('/payment-config');
      if (response.data.success) {
        setPaymentConfigs(response.data.data);
        if (response.data.data.length > 0 && !selectedAccount) {
          const defaultAccount = response.data.data[0]._id;
          setSelectedAccount(defaultAccount);
          setTempSelectedAccount(defaultAccount);
        }
      }
    } catch (err) {
      setError('获取支付配置失败');
    }
  }, [selectedAccount]);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    if (!selectedAccount || !dateRange[0] || !dateRange[1]) {
      setError('请选择支付账户和日期范围');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const params = {
        paymentAccountId: selectedAccount,
        startDate: dateRange[0]!.toISOString(),
        endDate: dateRange[1]!.toISOString(),
        timeDimension,
        page: page + 1,
        limit: rowsPerPage
      };
      
      const response = await api.get('/payment-config/stats/summary', { params });
      
      if (response.data.success) {
        setStats(response.data.data.detailed || []);
        setAggregatedStats(response.data.data.aggregated || null);
        setTotalCount(response.data.data.pagination?.total || 0);
      } else {
        setError(response.data.message || '获取统计数据失败');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || '获取统计数据失败';
      setError(errorMessage);
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange, timeDimension, page, rowsPerPage]);

  useEffect(() => {
    fetchPaymentConfigs();
  }, [fetchPaymentConfigs]);

  useEffect(() => {
    if (selectedAccount && dateRange[0] && dateRange[1]) {
      fetchStats();
    }
  }, [selectedAccount, dateRange, timeDimension, page, rowsPerPage, fetchStats]);

  useEffect(() => {
    if (selectedAccount) {
      fetchStats();
    }
  }, [selectedAccount, dateRange, timeDimension, fetchStats]);

  // 计算成功率趋势
  const getSuccessRateTrend = () => {
    if (stats.length < 2) return 'stable';
    const recent = stats[stats.length - 1]?.successRate || 0;
    const previous = stats[stats.length - 2]?.successRate || 0;
    return recent > previous ? 'up' : recent < previous ? 'down' : 'stable';
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    return formatAmountUtil(amount);
  };

  // 格式化时间
  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 应用筛选条件
  const handleApplyFilters = () => {
    setSelectedAccount(tempSelectedAccount);
    setDateRange(tempDateRange);
    setTimeDimension(tempTimeDimension);
    setPage(0); // 重置到第一页
  };

  // 分页处理函数
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 重置筛选条件
  const handleResetFilters = () => {
    const defaultDateRange: [Date | null, Date | null] = [
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date()
    ];
    // 如果有支付配置，使用第一个作为默认值
    const defaultAccount = paymentConfigs.length > 0 ? paymentConfigs[0]._id : '';
    setTempSelectedAccount(defaultAccount);
    setTempDateRange(defaultDateRange);
    setTempTimeDimension('daily');
    setSelectedAccount(defaultAccount);
    setDateRange(defaultDateRange);
    setTimeDimension('daily');
  };

  // 初始化临时筛选状态
  useEffect(() => {
    setTempSelectedAccount(selectedAccount);
    setTempDateRange(dateRange);
    setTempTimeDimension(timeDimension);
  }, [selectedAccount, dateRange, timeDimension]);

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom color="primary" fontWeight="bold" sx={{ mb: 1 }}>
        支付统计
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 筛选条件 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.875rem' }}>支付账户</InputLabel>
              <Select
                value={tempSelectedAccount}
                onChange={(e) => setTempSelectedAccount(e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                {paymentConfigs.map((config) => (
                  <MenuItem key={config._id} value={config._id} sx={{ fontSize: '0.875rem' }}>
                    {config.accountName} ({config.provider.name})
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
                onChange={(newValue) => setTempDateRange([newValue, tempDateRange[1]])}
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
                onChange={(newValue) => setTempDateRange([tempDateRange[0], newValue])}
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
            <FormControl fullWidth>
              <InputLabel sx={{ fontSize: '0.875rem' }}>时间维度</InputLabel>
              <Select
                value={tempTimeDimension}
                onChange={(e) => setTempTimeDimension(e.target.value)}
                sx={{
                  '& .MuiSelect-select': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="hourly" sx={{ fontSize: '0.875rem' }}>按小时</MenuItem>
                <MenuItem value="daily" sx={{ fontSize: '0.875rem' }}>按天</MenuItem>
                <MenuItem value="monthly" sx={{ fontSize: '0.875rem' }}>按月</MenuItem>
              </Select>
            </FormControl>
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Tooltip title="刷新数据">
              <IconButton
                onClick={fetchStats}
                disabled={loading}
                color="primary"
                sx={{ 
                  width: 48, 
                  height: 48,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '&:disabled': {
                    backgroundColor: 'grey.300',
                    color: 'grey.500',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : <Refresh />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* 汇总统计卡片 */}
      {aggregatedStats && (
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
          gap: 3, 
          mb: 3 
        }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Receipt color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">总订单数</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1, flex: 1 }}>
                {aggregatedStats.totalOrders.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
                成功: {aggregatedStats.successOrders.toLocaleString()} | 
                失败: {aggregatedStats.failedOrders.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalance color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">总金额</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1, flex: 1 }}>
                {formatAmount(aggregatedStats.totalAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
                成功: {formatAmount(aggregatedStats.successAmount)}
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">成功率</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1, flex: 1 }}>
                {aggregatedStats.avgSuccessRate.toFixed(2)}%
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                {getSuccessRateTrend() === 'up' && <TrendingUp color="success" />}
                {getSuccessRateTrend() === 'down' && <TrendingDown color="error" />}
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  趋势: {getSuccessRateTrend() === 'up' ? '上升' : 
                         getSuccessRateTrend() === 'down' ? '下降' : '稳定'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Speed color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">平均处理时间</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1, flex: 1 }}>
                {formatTime(aggregatedStats.avgProcessingTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
                响应时间
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* 详细统计表格 */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>日期</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>订单数</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>成功率</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>总金额</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>成功金额</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>平均处理时间</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>错误数</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {loading ? '加载中...' : '暂无数据'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat) => (
                  <TableRow key={stat._id} hover>
                    <TableCell>
                      {new Date(stat.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          总计: {stat.orders.total}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          成功: {stat.orders.success}
                        </Typography>
                        <Typography variant="body2" color="error.main">
                          失败: {stat.orders.failed}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {stat.successRate.toFixed(2)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={stat.successRate}
                          sx={{ width: 60, height: 6, borderRadius: 3 }}
                          color={stat.successRate > 80 ? 'success' : stat.successRate > 60 ? 'warning' : 'error'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{formatAmount(stat.amounts.total)}</TableCell>
                    <TableCell>{formatAmount(stat.amounts.success)}</TableCell>
                    <TableCell>{formatTime(stat.avgProcessingTime)}</TableCell>
                    <TableCell>
                      <Chip
                        label={stat.errors.total}
                        size="small"
                        color={stat.errors.total > 0 ? 'error' : 'default'}
                        icon={stat.errors.total > 0 ? <Error /> : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 分页组件 */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="每页行数:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default PaymentData;
