import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
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
      id={`limit-tabpanel-${index}`}
      aria-labelledby={`limit-tab-${index}`}
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

interface LimitConfig {
  basic: {
    minAmount: number;
    maxAmount: number;
  };
  daily: {
    limit: number;
  };
  monthly: {
    limit: number;
  };
  risk: {
    allowLargeTransactions: boolean;
    maxLargeTransactionsPerDay: number;
    largeAmountThreshold: number;
  };
}

interface LimitStats {
  today: {
    total: number;
    limit: number;
    remaining: number;
    usage: string;
  };
  month: {
    total: number;
    limit: number;
    remaining: number;
    usage: string;
  };
  transactions: {
    today: number;
    month: number;
  };
}

export default function LimitManagement() {
  const { currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 限额配置状态
  const [limitConfig, setLimitConfig] = useState<LimitConfig>({
    basic: { minAmount: 1, maxAmount: 50000 },
    daily: { limit: 500000 },
    monthly: { limit: 5000000 },
    risk: { allowLargeTransactions: false, maxLargeTransactionsPerDay: 3, largeAmountThreshold: 1000000 }
  });
  
  // 限额统计状态
  const [limitStats, setLimitStats] = useState<LimitStats | null>(null);
  
  // 测试验证状态
  const [testAmount, setTestAmount] = useState('');
  const [testType, setTestType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [testProvider, setTestProvider] = useState('passpay');
  const [testResult, setTestResult] = useState<any>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 加载限额配置
  const loadLimitConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/limit-management/config?provider=${testProvider}`);
      
      if (response.data.success) {
        setLimitConfig(response.data.data.limits);
      }
    } catch (error: any) {
      setError('加载限额配置失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 加载限额统计
  const loadLimitStats = async () => {
    try {
      const response = await api.get(`/limit-management/stats?provider=${testProvider}&type=${testType}`);
      
      if (response.data.success) {
        setLimitStats(response.data.data.stats);
      }
    } catch (error: any) {
      console.error('加载限额统计失败:', error);
    }
  };

  // 更新限额配置
  const updateLimitConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.put('/limit-management/config', {
        provider: testProvider,
        limits: limitConfig
      });
      
      if (response.data.success) {
        setSuccess('限额配置更新成功');
        await loadLimitConfig(); // 重新加载配置
      }
    } catch (error: any) {
      setError('更新限额配置失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 测试限额验证
  const testLimitValidation = async () => {
    try {
      if (!testAmount || isNaN(Number(testAmount))) {
        setError('请输入有效的金额');
        return;
      }

      setLoading(true);
      setError(null);
      setTestResult(null);
      
      const amount = Math.round(Number(testAmount) * 100); // 转换为分
      
      const response = await api.post('/limit-management/pre-check', {
        amount,
        type: testType,
        provider: testProvider
      });
      
      if (response.data.success) {
        setTestResult(response.data.data);
        await loadLimitStats(); // 重新加载统计
      }
    } catch (error: any) {
      setError('限额验证测试失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (currentUser) {
      loadLimitConfig();
      loadLimitStats();
    }
  }, [currentUser, testProvider, testType]);

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">请先登录</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        限额管理
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        配置和管理交易限额，防止超额交易，保护资金安全
      </Typography>

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
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="限额管理标签页">
            <Tab label="限额配置" />
            <Tab label="限额统计" />
            <Tab label="限额测试" />
          </Tabs>
        </Box>

        {/* 限额配置标签页 */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  基础限额设置
                </Typography>
                <TextField
                  fullWidth
                  label="最小交易金额 (卢比)"
                  type="number"
                  value={limitConfig.basic.minAmount}
                  onChange={(e) => setLimitConfig(prev => ({
                    ...prev,
                    basic: { ...prev.basic, minAmount: Number(e.target.value) }
                  }))}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="最大交易金额 (卢比)"
                  type="number"
                  value={limitConfig.basic.maxAmount}
                  onChange={(e) => setLimitConfig(prev => ({
                    ...prev,
                    basic: { ...prev.basic, maxAmount: Number(e.target.value) }
                  }))}
                  margin="normal"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  时间限额设置
                </Typography>
                <TextField
                  fullWidth
                  label="日限额 (卢比)"
                  type="number"
                  value={limitConfig.daily.limit}
                  onChange={(e) => setLimitConfig(prev => ({
                    ...prev,
                    daily: { ...prev.daily, limit: Number(e.target.value) }
                  }))}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="月限额 (卢比)"
                  type="number"
                  value={limitConfig.monthly.limit}
                  onChange={(e) => setLimitConfig(prev => ({
                    ...prev,
                    monthly: { ...prev.monthly, limit: Number(e.target.value) }
                  }))}
                  margin="normal"
                />
              </CardContent>
            </Card>

            <Card sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  风险控制设置
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={limitConfig.risk.allowLargeTransactions}
                      onChange={(e) => setLimitConfig(prev => ({
                        ...prev,
                        risk: { ...prev.risk, allowLargeTransactions: e.target.checked }
                      }))}
                    />
                  }
                  label="允许大额交易"
                />
                <TextField
                  fullWidth
                  label="大额交易阈值 (卢比)"
                  type="number"
                  value={limitConfig.risk.largeAmountThreshold}
                  onChange={(e) => setLimitConfig(prev => ({
                    ...prev,
                    risk: { ...prev.risk, largeAmountThreshold: Number(e.target.value) }
                  }))}
                  margin="normal"
                  disabled={!limitConfig.risk.allowLargeTransactions}
                />
                <TextField
                  fullWidth
                  label="每日大额交易次数限制"
                  type="number"
                  value={limitConfig.risk.maxLargeTransactionsPerDay}
                  onChange={(e) => setLimitConfig(prev => ({
                    ...prev,
                    risk: { ...prev.risk, maxLargeTransactionsPerDay: Number(e.target.value) }
                  }))}
                  margin="normal"
                  disabled={!limitConfig.risk.allowLargeTransactions}
                />
              </CardContent>
            </Card>

            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' }, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={loadLimitConfig}
                disabled={loading}
                startIcon={<RefreshIcon />}
              >
                重置
              </Button>
              <Button
                variant="contained"
                onClick={updateLimitConfig}
                disabled={loading}
                startIcon={<SettingsIcon />}
              >
                {loading ? <CircularProgress size={20} /> : '保存配置'}
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* 限额统计标签页 */}
        <TabPanel value={tabValue} index={1}>
          {limitStats ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    今日限额使用情况
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      已使用: {limitStats.today.total.toLocaleString()} / {limitStats.today.limit.toLocaleString()} 卢比
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(limitStats.today.usage)} 
                      sx={{ mt: 1 }}
                      color={parseFloat(limitStats.today.usage) > 80 ? 'warning' : 'primary'}
                    />
                  </Box>
                  <Typography variant="body2">
                    剩余额度: {limitStats.today.remaining.toLocaleString()} 卢比
                  </Typography>
                  <Typography variant="body2">
                    交易笔数: {limitStats.transactions.today} 笔
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    本月限额使用情况
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      已使用: {limitStats.month.total.toLocaleString()} / {limitStats.month.limit.toLocaleString()} 卢比
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(limitStats.month.usage)} 
                      sx={{ mt: 1 }}
                      color={parseFloat(limitStats.month.usage) > 80 ? 'warning' : 'primary'}
                    />
                  </Box>
                  <Typography variant="body2">
                    剩余额度: {limitStats.month.remaining.toLocaleString()} 卢比
                  </Typography>
                  <Typography variant="body2">
                    交易笔数: {limitStats.transactions.month} 笔
                  </Typography>
                </CardContent>
              </Card>

              <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' }, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={loadLimitStats}
                  startIcon={<RefreshIcon />}
                >
                  刷新统计
                </Button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </TabPanel>

        {/* 限额测试标签页 */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  限额验证测试
                </Typography>
                <TextField
                  fullWidth
                  label="测试金额 (卢比)"
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  margin="normal"
                  placeholder="例如: 1000"
                />
                <TextField
                  fullWidth
                  select
                  label="交易类型"
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as 'DEPOSIT' | 'WITHDRAWAL')}
                  margin="normal"
                >
                  <option value="DEPOSIT">充值</option>
                  <option value="WITHDRAWAL">提现</option>
                </TextField>
                <TextField
                  fullWidth
                  select
                  label="支付提供商"
                  value={testProvider}
                  onChange={(e) => setTestProvider(e.target.value)}
                  margin="normal"
                >
                  <option value="passpay">PassPay</option>
                  <option value="mock">Mock</option>
                </TextField>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={testLimitValidation}
                  disabled={loading || !testAmount}
                  sx={{ mt: 2 }}
                  startIcon={<TrendingUpIcon />}
                >
                  {loading ? <CircularProgress size={20} /> : '测试验证'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  测试结果
                </Typography>
                {testResult ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {testResult.preCheck.valid ? (
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <ErrorIcon color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="body1" color={testResult.preCheck.valid ? 'success.main' : 'error.main'}>
                        {testResult.preCheck.message}
                      </Typography>
                    </Box>
                    
                    {testResult.preCheck.error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {testResult.preCheck.error}
                      </Alert>
                    )}

                    {testResult.stats && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          限额统计:
                        </Typography>
                        <Typography variant="body2">
                          今日已用: {testResult.stats.today.total.toLocaleString()} 卢比
                        </Typography>
                        <Typography variant="body2">
                          今日剩余: {testResult.stats.today.remaining.toLocaleString()} 卢比
                        </Typography>
                        <Typography variant="body2">
                          本月已用: {testResult.stats.month.total.toLocaleString()} 卢比
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    点击"测试验证"按钮开始测试
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}
