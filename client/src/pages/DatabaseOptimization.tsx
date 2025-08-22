import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Alert,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { Permission } from '../types';
import api from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`db-optimization-tabpanel-${index}`}
      aria-labelledby={`db-optimization-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface DatabaseStatus {
  timestamp: string;
  connectionStatus: string;
  indexes: any;
  cache: any;
}

interface PerformanceReport {
  timestamp: string;
  indexes: any;
  performance: any;
  connectionPool: any;
}

const DatabaseOptimization: React.FC = () => {
  const { hasPermission, currentUser, isAuthenticated } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 状态数据
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [queryFilters, setQueryFilters] = useState({
    merchantId: '',
    startDate: '',
    endDate: '',
    groupBy: 'day'
  });

  // 检查权限
  const hasAccess = hasPermission(Permission.SYSTEM_MONITORING);

  // 添加调试信息
  console.log('=== 权限检查调试信息 ===');
  console.log('认证状态:', isAuthenticated);
  console.log('当前用户:', currentUser);
  console.log('用户角色:', currentUser?.role);
  console.log('用户权限:', currentUser?.permissions);
  console.log('检查权限:', Permission.SYSTEM_MONITORING);
  console.log('权限检查结果:', hasAccess);
  console.log('hasPermission函数:', hasPermission);
  console.log('========================');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 获取数据库状态
  const loadDatabaseStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/database-optimization/status');
      if (response.data.success) {
        setDbStatus(response.data.data);
      }
    } catch (error: any) {
      setError('获取数据库状态失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 优化数据库索引
  const optimizeIndexes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/database-optimization/optimize-indexes');
      if (response.data.success) {
        setSuccess('数据库索引优化完成');
        await loadDatabaseStatus(); // 重新加载状态
      }
    } catch (error: any) {
      setError('索引优化失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 优化连接池
  const optimizeConnectionPool = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/database-optimization/optimize-connection-pool');
      if (response.data.success) {
        setSuccess('连接池配置优化完成');
        await loadDatabaseStatus(); // 重新加载状态
      }
    } catch (error: any) {
      setError('连接池优化失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 获取性能报告
  const loadPerformanceReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/database-optimization/performance-report');
      if (response.data.success) {
        setPerformanceReport(response.data.data);
      }
    } catch (error: any) {
      setError('获取性能报告失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 清理过期数据
  const cleanupExpiredData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/database-optimization/cleanup-expired-data');
      if (response.data.success) {
        setSuccess('过期数据清理完成');
      }
    } catch (error: any) {
      setError('数据清理失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadDatabaseStatus();
    loadPerformanceReport();
  }, []);

  // 权限检查
  if (!hasAccess) {
    console.log('❌ 权限检查失败 - 用户无法访问数据库优化页面');
    return (
      <Box p={3}>
        <Alert severity="error">
          您没有权限访问此页面
          <br />
          <strong>调试信息：</strong>
          <br />
          用户角色: {currentUser?.role}
          <br />
          用户权限: {currentUser?.permissions?.join(', ') || '无权限'}
          <br />
          需要权限: {Permission.SYSTEM_MONITORING}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        数据库性能优化
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        优化数据库性能，包括索引管理、查询优化、连接池配置等
      </Typography>

      {/* 错误和成功提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="数据库优化标签页">
            <Tab label="状态监控" />
            <Tab label="索引优化" />
            <Tab label="查询优化" />
            <Tab label="性能报告" />
            <Tab label="数据清理" />
          </Tabs>
        </Box>

        {/* 状态监控标签页 */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">数据库状态</Typography>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={loadDatabaseStatus}
                    disabled={loading}
                    size="small"
                  >
                    刷新
                  </Button>
                </Box>
                
                {dbStatus ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      连接状态: <Chip label={dbStatus.connectionStatus} color="success" size="small" />
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      最后更新: {new Date(dbStatus.timestamp).toLocaleString()}
                    </Typography>
                    
                    {dbStatus.indexes && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          连接池状态:
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          最大连接数: {dbStatus.indexes.maxPoolSize || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          当前连接数: {dbStatus.indexes.currentConnections || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          可用连接数: {dbStatus.indexes.availableConnections || 'N/A'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    暂无数据
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>缓存状态</Typography>
                
                {dbStatus?.cache ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      总条目数: {dbStatus.cache.totalEntries}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      有效条目: {dbStatus.cache.validEntries}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      过期条目: {dbStatus.cache.expiredEntries}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      缓存大小: {dbStatus.cache.totalSize}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      超时时间: {dbStatus.cache.cacheTimeout}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    暂无缓存数据
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* 索引优化标签页 */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  索引管理
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  优化数据库索引以提高查询性能
                </Typography>
                
                <Button
                  fullWidth
                  variant="contained"
                  onClick={optimizeIndexes}
                  disabled={loading}
                  startIcon={<SpeedIcon />}
                  sx={{ mb: 2 }}
                >
                  优化索引
                </Button>
                
                <Typography variant="caption" color="textSecondary">
                  这将为常用查询字段创建复合索引，提高查询性能
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  连接池优化
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  优化MongoDB连接池配置
                </Typography>
                
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={optimizeConnectionPool}
                  disabled={loading}
                  startIcon={<StorageIcon />}
                  sx={{ mb: 2 }}
                >
                  优化连接池
                </Button>
                
                <Typography variant="caption" color="textSecondary">
                  优化连接池大小、超时时间等配置参数
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* 查询优化标签页 */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  查询过滤器
                </Typography>
                
                <TextField
                  fullWidth
                  label="商户ID"
                  value={queryFilters.merchantId}
                  onChange={(e) => setQueryFilters(prev => ({ ...prev, merchantId: e.target.value }))}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="开始日期"
                  type="date"
                  value={queryFilters.startDate}
                  onChange={(e) => setQueryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="结束日期"
                  type="date"
                  value={queryFilters.endDate}
                  onChange={(e) => setQueryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>分组方式</InputLabel>
                  <Select
                    value={queryFilters.groupBy}
                    onChange={(e) => setQueryFilters(prev => ({ ...prev, groupBy: e.target.value }))}
                    label="分组方式"
                  >
                    <MenuItem value="hour">按小时</MenuItem>
                    <MenuItem value="day">按天</MenuItem>
                    <MenuItem value="month">按月</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  优化建议
                </Typography>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>索引优化建议</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary">
                      • 为常用查询字段添加复合索引
                      <br />
                      • 为时间范围查询添加降序索引
                      <br />
                      • 为状态查询添加复合索引
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>查询优化建议</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary">
                      • 使用lean()查询减少内存使用
                      <br />
                      • 只选择需要的字段
                      <br />
                      • 使用聚合管道优化复杂查询
                      <br />
                      • 实现查询缓存减少数据库压力
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* 性能报告标签页 */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">性能报告</Typography>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={loadPerformanceReport}
                    disabled={loading}
                    size="small"
                  >
                    刷新
                  </Button>
                </Box>
                
                {performanceReport ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      生成时间: {new Date(performanceReport.timestamp).toLocaleString()}
                    </Typography>
                    
                    {performanceReport.indexes && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          索引优化结果:
                        </Typography>
                        {Object.entries(performanceReport.indexes).map(([model, data]: [string, any]) => (
                          <Typography key={model} variant="body2" color="textSecondary">
                            {model}: {data.indexesCount || 0} 个索引
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    暂无性能报告
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>查询性能分析</Typography>
                
                {performanceReport?.performance ? (
                  <Box>
                    {Object.entries(performanceReport.performance).map(([collection, data]: [string, any]) => (
                      <Accordion key={collection}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>{collection} 集合</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" color="textSecondary">
                            文档数量: {data.stats?.count || 'N/A'}
                            <br />
                            存储大小: {data.stats?.size ? `${(data.stats.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                            <br />
                            索引数量: {data.stats?.indexes || 'N/A'}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    暂无性能分析数据
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* 数据清理标签页 */}
        <TabPanel value={tabValue} index={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                数据清理
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                清理过期的订单、日志等数据，释放存储空间
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                onClick={cleanupExpiredData}
                disabled={loading}
                startIcon={<MemoryIcon />}
                sx={{ mb: 2 }}
              >
                清理过期数据
              </Button>
              
              <Typography variant="caption" color="textSecondary">
                将清理超过30天的过期订单和超过90天的日志数据
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>

      {/* 加载指示器 */}
      {loading && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};

export default DatabaseOptimization;
