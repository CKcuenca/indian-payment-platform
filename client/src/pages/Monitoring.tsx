import React, { useState, useEffect } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { SystemStats } from '../types';

// 模拟系统监控数据
const mockSystemStats: SystemStats = {
  totalMerchants: 156,
  activeMerchants: 142,
  totalTransactions: 15420,
  totalVolume: 12500000,
  successRate: 98.5,
  averageResponseTime: 245,
};

// 模拟系统状态数据
const mockSystemStatus: Record<string, any> = {
  server: { status: 'online', uptime: '15天 8小时 32分钟', load: 0.45 },
  database: { status: 'online', connections: 24, responseTime: 12 },
  airpay: { status: 'online', lastCheck: '2分钟前', responseTime: 180 },
  cashfree: { status: 'online', lastCheck: '1分钟前', responseTime: 165 },
  redis: { status: 'online', memory: '2.1GB', connections: 8 },
};

// 模拟性能数据
const mockPerformanceData = {
  cpu: { usage: 45, cores: 8 },
  memory: { used: 6.2, total: 16, percentage: 38.75 },
  disk: { used: 120, total: 500, percentage: 24 },
  network: { in: 2.5, out: 1.8, unit: 'MB/s' },
};

// 模拟最近错误日志
const mockErrorLogs = [
  {
    id: '1',
    timestamp: '2024-01-15 14:32:15',
    level: 'ERROR',
    message: 'AirPay API 连接超时',
    details: 'Request timeout after 30 seconds',
  },
  {
    id: '2',
    timestamp: '2024-01-15 13:45:22',
    level: 'WARNING',
    message: '高并发请求检测',
    details: 'Concurrent requests exceeded 1000/min',
  },
  {
    id: '3',
    timestamp: '2024-01-15 12:18:45',
    level: 'ERROR',
    message: '数据库连接失败',
    details: 'Connection pool exhausted',
  },
];

export default function Monitoring() {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [systemStats] = useState(mockSystemStats);
  const [systemStatus] = useState(mockSystemStatus);
  const [performanceData] = useState(mockPerformanceData);
  const [errorLogs] = useState(mockErrorLogs);

  useEffect(() => {
    // 在实际项目中，这里会定期从API获取监控数据
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    // 模拟刷新数据
    setTimeout(() => {
      setLastUpdate(new Date());
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
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
        return <CheckCircleIcon color="success" />;
      case 'offline':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const formatUptime = (uptime: string) => {
    return uptime;
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
    <Box sx={{ p: 0 }}>
      {/* 页面标题和刷新按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{ 
              color: 'primary.main',
              fontWeight: 'bold',
              mb: 3
            }}
          >
            系统监控
          </Typography>
          <Typography variant="body2" color="text.secondary">
            最后更新: {lastUpdate.toLocaleString('zh-CN')}
          </Typography>
        </Box>
        <Tooltip title="刷新数据">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 系统概览卡片 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  总商户数
                </Typography>
                <Typography variant="h4">
                  {systemStats.totalMerchants}
                </Typography>
              </Box>
              <TrendingUpIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="body2" color="textSecondary">
              活跃: {systemStats.activeMerchants}
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
                  {systemStats.totalTransactions.toLocaleString()}
                </Typography>
              </Box>
              <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="body2" color="textSecondary">
                  交易量: {formatCurrency(systemStats.totalVolume)}
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
                  {systemStats.successRate}%
                </Typography>
              </Box>
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="body2" color="textSecondary">
                  平均响应: {systemStats.averageResponseTime}ms
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
                  正常
                </Typography>
              </Box>
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="body2" color="textSecondary">
                  所有服务运行正常
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 系统状态监控 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              服务状态监控
            </Typography>
            <Box sx={{ mt: 2 }}>
              {Object.entries(systemStatus).map(([service, data]) => (
                <Box key={service} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120 }}>
                    {getStatusIcon(data.status)}
                    <Typography variant="body2" sx={{ ml: 1, textTransform: 'capitalize' }}>
                      {service}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, ml: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label={data.status === 'online' ? '在线' : '离线'}
                        color={getStatusColor(data.status) as any}
                        size="small"
                      />
                      <Typography variant="caption" color="textSecondary">
                        {service === 'server' && `运行时间: ${formatUptime(data.uptime)}`}
                        {service === 'database' && `连接数: ${data.connections}`}
                        {service === 'airpay' && `响应时间: ${data.responseTime}ms`}
                        {service === 'cashfree' && `响应时间: ${data.responseTime}ms`}
                        {service === 'redis' && `内存: ${data.memory}`}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              系统性能监控
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">CPU 使用率</Typography>
                  <Typography variant="body2">{performanceData.cpu.usage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={performanceData.cpu.usage}
                  color={getPerformanceColor(performanceData.cpu.usage)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {performanceData.cpu.cores} 核心
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">内存使用率</Typography>
                  <Typography variant="body2">{performanceData.memory.percentage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={performanceData.memory.percentage}
                  color={getPerformanceColor(performanceData.memory.percentage)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {performanceData.memory.used}GB / {performanceData.memory.total}GB
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">磁盘使用率</Typography>
                  <Typography variant="body2">{performanceData.disk.percentage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={performanceData.disk.percentage}
                  color={getPerformanceColor(performanceData.disk.percentage)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {performanceData.disk.used}GB / {performanceData.disk.total}GB
                </Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">网络流量</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="textSecondary">
                    入站: {performanceData.network.in} {performanceData.network.unit}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    出站: {performanceData.network.out} {performanceData.network.unit}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 错误日志 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            最近错误日志
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.100' }}>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>时间</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>级别</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>消息</TableCell>
                  <TableCell sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '0.875rem' }}>详情</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errorLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {log.timestamp}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.level}
                        color={log.level === 'ERROR' ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {log.details}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
} 