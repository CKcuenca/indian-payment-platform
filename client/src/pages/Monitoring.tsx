import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,

} from '@mui/icons-material';
import { monitoringService, SystemOverview, SystemMetrics, SystemAlert, ServiceStatus } from '../services/monitoringService';

export default function Monitoring() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  
    // 数据状态
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);

  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<SystemMetrics | null>(null);
  
  // 筛选和设置
  const [timeRange, setTimeRange] = useState(24);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [resolution, setResolution] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 获取系统概览
  const fetchSystemOverview = useCallback(async () => {
    try {
      const data = await monitoringService.getSystemOverview();
      setSystemOverview(data);
    } catch (err) {
      console.error('获取系统概览失败:', err);
      setError('获取系统概览失败');
    }
  }, []);



  // 获取系统告警
  const fetchSystemAlerts = useCallback(async () => {
    try {
      const data = await monitoringService.getSystemAlerts(selectedSeverity);
      setSystemAlerts(data);
    } catch (err) {
      console.error('获取系统告警失败:', err);
      setError('获取系统告警失败');
    }
  }, [selectedSeverity]);

  // 获取服务状态
  const fetchServiceStatus = useCallback(async () => {
    try {
      const data = await monitoringService.getServiceStatus();
      setServiceStatus(data);
    } catch (err) {
      console.error('获取服务状态失败:', err);
      setError('获取服务状态失败');
    }
  }, []);

  // 获取实时指标
  const fetchRealTimeMetrics = useCallback(async () => {
    try {
      const data = await monitoringService.getRealTimeMetrics();
      setRealTimeMetrics(data);
    } catch (err) {
      console.error('获取实时指标失败:', err);
      setError('获取实时指标失败');
    }
  }, []);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchSystemOverview(),

        fetchSystemAlerts(),
        fetchServiceStatus(),
        fetchRealTimeMetrics()
      ]);
    } catch (err) {
      console.error('加载监控数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchSystemOverview, fetchSystemAlerts, fetchServiceStatus, fetchRealTimeMetrics]);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAllData();
      setLastUpdate(new Date());
      setSnackbar({ open: true, message: '数据已刷新', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '刷新失败', severity: 'error' });
    } finally {
      setRefreshing(false);
    }
  }, [loadAllData]);

  // 确认告警
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await monitoringService.acknowledgeAlert(alertId);
      await fetchSystemAlerts(); // 重新获取告警列表
      setSnackbar({ open: true, message: '告警已确认', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '确认告警失败', severity: 'error' });
    }
  };

  // 解决告警
  const handleResolveAlert = async () => {
    if (!selectedAlert || !resolution.trim()) return;
    
    try {
      await monitoringService.resolveAlert(selectedAlert.id, resolution);
      await fetchSystemAlerts(); // 重新获取告警列表
      setShowAlertDialog(false);
      setSelectedAlert(null);
      setResolution('');
      setSnackbar({ open: true, message: '告警已解决', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '解决告警失败', severity: 'error' });
    }
  };

  // 打开告警对话框
  const openAlertDialog = (alert: SystemAlert) => {
    setSelectedAlert(alert);
    setShowAlertDialog(true);
  };

  // 初始化数据
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 定时刷新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealTimeMetrics();
      setLastUpdate(new Date());
    }, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, [fetchRealTimeMetrics]);



  useEffect(() => {
    fetchSystemAlerts();
  }, [fetchSystemAlerts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
      case 'pass':
        return 'success';
      case 'offline':
      case 'critical':
      case 'fail':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
      case 'pass':
        return <CheckCircleIcon color="success" />;
      case 'offline':
      case 'critical':
      case 'fail':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'error';
      case 'CRITICAL':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题和刷新按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{ 
              color: 'primary.main',
              fontWeight: 'bold',
              mb: 1
            }}
          >
            系统监控
          </Typography>
          <Typography variant="body2" color="text.secondary">
            最后更新: {lastUpdate.toLocaleString('zh-CN')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>时间范围</InputLabel>
            <Select
              value={timeRange}
              label="时间范围"
              onChange={(e) => setTimeRange(e.target.value as number)}
            >
              <MenuItem value={1}>1小时</MenuItem>
              <MenuItem value={6}>6小时</MenuItem>
              <MenuItem value={24}>24小时</MenuItem>
              <MenuItem value={168}>7天</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="刷新数据">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 系统概览卡片 */}
      {systemOverview && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    总商户数
                  </Typography>
                  <Typography variant="h4">
                    {systemOverview.totalMerchants}
                  </Typography>
                </Box>
                <TrendingUpIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="body2" color="textSecondary">
                活跃: {systemOverview.activeMerchants}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    今日交易
                  </Typography>
                  <Typography variant="h4">
                    {systemOverview.totalTransactions.toLocaleString()}
                  </Typography>
                </Box>
                <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="body2" color="textSecondary">
                交易量: {formatCurrency(systemOverview.totalVolume)}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    成功率
                  </Typography>
                  <Typography variant="h4">
                    {systemOverview.successRate}%
                  </Typography>
                </Box>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="body2" color="textSecondary">
                平均响应: {systemOverview.averageResponseTime}ms
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    系统状态
                  </Typography>
                  <Typography variant="h4">
                    {systemOverview.systemStatus === 'healthy' ? '正常' : 
                     systemOverview.systemStatus === 'warning' ? '警告' : '严重'}
                  </Typography>
                </Box>
                {getStatusIcon(systemOverview.systemStatus)}
              </Box>
              <Typography variant="body2" color="textSecondary">
                {systemOverview.systemStatus === 'healthy' ? '所有服务运行正常' :
                 systemOverview.systemStatus === 'warning' ? '部分服务异常' : '系统严重异常'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* 系统状态监控 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3, mb: 3 }}>
        {/* 服务状态监控 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              服务状态监控
            </Typography>
            <Box sx={{ mt: 2 }}>
              {serviceStatus.map((service) => (
                <Box key={service.name} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120 }}>
                    {getStatusIcon(service.status)}
                    <Typography variant="body2" sx={{ ml: 1, textTransform: 'capitalize' }}>
                      {service.name}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, ml: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label={service.status === 'online' ? '在线' : '离线'}
                        color={getStatusColor(service.status) as any}
                        size="small"
                      />
                      <Typography variant="caption" color="textSecondary">
                        {service.name === 'server' && `运行时间: ${service.uptime}`}
                        {service.name === 'database' && `连接数: ${service.details.connections || 'N/A'}`}
                        {service.name === 'airpay' && `响应时间: ${service.responseTime}ms`}
                        {service.name === 'cashfree' && `响应时间: ${service.responseTime}ms`}
                        {service.name === 'redis' && `内存: ${service.details.memory || 'N/A'}`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* 系统性能监控 */}
        {realTimeMetrics && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                系统性能监控
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">CPU 使用率</Typography>
                    <Typography variant="body2">{realTimeMetrics.system.cpu}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={realTimeMetrics.system.cpu}
                    color={getPerformanceColor(realTimeMetrics.system.cpu)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">内存使用率</Typography>
                    <Typography variant="body2">{realTimeMetrics.system.memory}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={realTimeMetrics.system.memory}
                    color={getPerformanceColor(realTimeMetrics.system.memory)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">磁盘使用率</Typography>
                    <Typography variant="body2">{realTimeMetrics.system.disk}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={realTimeMetrics.system.disk}
                    color={getPerformanceColor(realTimeMetrics.system.disk)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">网络流量</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">
                      入站: {realTimeMetrics.network.inTraffic.toFixed(2)} MB/s
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      出站: {realTimeMetrics.network.outTraffic.toFixed(2)} MB/s
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* 系统告警 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              系统告警
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={selectedSeverity}
                label="严重程度"
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="LOW">低</MenuItem>
                <MenuItem value="MEDIUM">中</MenuItem>
                <MenuItem value="HIGH">高</MenuItem>
                <MenuItem value="CRITICAL">严重</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.100' }}>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>时间</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>级别</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>类别</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>消息</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>状态</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {systemAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(alert.timestamp).toLocaleString('zh-CN')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.severity}
                        color={getSeverityColor(alert.severity) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {alert.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {alert.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alert.resolved ? '已解决' : '未解决'}
                        color={alert.resolved ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {!alert.resolved && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              确认
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openAlertDialog(alert)}
                            >
                              解决
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 告警解决对话框 */}
      <Dialog open={showAlertDialog} onClose={() => setShowAlertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>解决告警</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            告警: {selectedAlert?.message}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="解决方案"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="请描述如何解决这个问题..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAlertDialog(false)}>取消</Button>
          <Button onClick={handleResolveAlert} variant="contained" disabled={!resolution.trim()}>
            解决
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 