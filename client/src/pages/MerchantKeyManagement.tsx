import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  CardActions,
  Grid2,
  Tooltip,
  Snackbar,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from '@mui/material';

import {
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import { PermissionGuard } from '../components/PermissionGuard';
import { Permission } from '../types';
import { authService } from '../services/authService';
import api from '../services/api';

interface KeyInfo {
  merchantId: string;
  merchantName: string;
  apiKey: string;
  secretKey: string;
  keyStatus: string;
  lastUpdated: string;
  keyHistory: number;
  usage?: {
    dailyCount: number;
    monthlyCount: number;
    lastUsed: string;
  };
}

interface RegenerateForm {
  confirmPassword: string;
  reason: string;
}

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
      id={`key-tabpanel-${index}`}
      aria-labelledby={`key-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function MerchantKeyManagement() {
  const theme = useTheme();
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 密钥显示状态
  const [showSecretKey, setShowSecretKey] = useState(false);
  
  // 对话框状态
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  // 表单状态
  const [regenerateForm, setRegenerateForm] = useState<RegenerateForm>({
    confirmPassword: '',
    reason: ''
  });
  
  // Tab状态
  const [currentTab, setCurrentTab] = useState(0);
  
  // 示例代码
  const [examples, setExamples] = useState<any>(null);

  useEffect(() => {
    fetchKeyInfo();
    fetchExamples();
  }, []);

  const fetchKeyInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/merchant/keys');
      
      if (response.data.code === 200) {
        setKeyInfo(response.data.data);
      } else {
        setError(response.data.message || '获取密钥信息失败');
      }
    } catch (err: any) {
      console.error('获取密钥信息失败:', err);
      if (err.response?.status === 401) {
        setError('认证失败，请重新登录');
      } else if (err.response?.status === 403) {
        setError('权限不足，无法访问密钥管理功能');
      } else {
        setError(`获取密钥信息失败: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExamples = async () => {
    try {
      const response = await api.get('/api/merchant/keys/examples');
      if (response.data.code === 200) {
        setExamples(response.data.data);
      }
    } catch (err: any) {
      console.error('获取示例代码失败:', err);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!regenerateForm.confirmPassword || !regenerateForm.reason) {
      setError('请填写完整信息');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/merchant/keys/regenerate', regenerateForm);
      
      if (response.data.code === 200) {
        setSuccess('密钥重新生成成功！请立即保存新密钥。');
        setRegenerateDialogOpen(false);
        setRegenerateForm({ confirmPassword: '', reason: '' });
        // 重新获取密钥信息
        await fetchKeyInfo();
      } else {
        setError(response.data.message || '重新生成密钥失败');
      }
    } catch (err: any) {
      console.error('重新生成密钥失败:', err);
      if (err.response?.status === 401) {
        setError('密码验证失败');
      } else {
        setError(`重新生成密钥失败: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadConfig = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/api/merchant/keys/download', {
        responseType: 'blob'
      });
      
      // 创建下载链接
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${keyInfo?.merchantId}_api_credentials.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccess('配置文件已下载');
    } catch (err: any) {
      console.error('下载配置文件失败:', err);
      setError('下载配置文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess(`${label}已复制到剪贴板`);
    } catch (err) {
      setError('复制失败，请手动复制');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'DISABLED':
        return 'error';
      case 'EXPIRED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '正常';
      case 'DISABLED':
        return '已禁用';
      case 'EXPIRED':
        return '已过期';
      default:
        return '未知';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading && !keyInfo) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <KeyIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          API密钥管理
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {keyInfo && (
        <>
          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
              <Tab
                icon={<KeyIcon />}
                label="密钥信息"
                id="key-tab-0"
                aria-controls="key-tabpanel-0"
              />
              <Tab
                icon={<CodeIcon />}
                label="使用示例"
                id="key-tab-1"
                aria-controls="key-tabpanel-1"
              />
              <Tab
                icon={<HistoryIcon />}
                label="使用统计"
                id="key-tab-2"
                aria-controls="key-tabpanel-2"
              />
            </Tabs>
          </Paper>

          {/* Tab内容 */}
          <TabPanel value={currentTab} index={0}>
            <Grid2 container spacing={3}>
              {/* 基本信息卡片 */}
              <Grid2 item xs={12} md={8}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                      🏪 商户信息
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        商户号
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight="medium">
                          {keyInfo.merchantId}
                        </Typography>
                        <Tooltip title="复制商户号">
                          <IconButton size="small" onClick={() => handleCopy(keyInfo.merchantId, '商户号')}>
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        商户名称
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {keyInfo.merchantName}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        账户状态
                      </Typography>
                      <Chip
                        label={getStatusText(keyInfo.keyStatus)}
                        color={getStatusColor(keyInfo.keyStatus) as any}
                        icon={keyInfo.keyStatus === 'ACTIVE' ? undefined : <WarningIcon />}
                      />
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                      🔑 API凭据
                    </Typography>

                    {/* API Key */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        API Key (公钥)
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontFamily="monospace" sx={{ flex: 1, wordBreak: 'break-all' }}>
                            {keyInfo.apiKey}
                          </Typography>
                          <Tooltip title="复制API Key">
                            <IconButton size="small" onClick={() => handleCopy(keyInfo.apiKey, 'API Key')}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="显示二维码">
                            <IconButton size="small" onClick={() => setQrDialogOpen(true)}>
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Box>

                    {/* Secret Key */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Secret Key (私钥)
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontFamily="monospace" sx={{ flex: 1, wordBreak: 'break-all' }}>
                            {showSecretKey ? keyInfo.secretKey : keyInfo.secretKey}
                          </Typography>
                          <Tooltip title={showSecretKey ? "隐藏密钥" : "显示完整密钥"}>
                            <IconButton size="small" onClick={() => setShowSecretKey(!showSecretKey)}>
                              {showSecretKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="复制Secret Key">
                            <IconButton size="small" onClick={() => handleCopy(keyInfo.secretKey, 'Secret Key')}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Paper>
                      <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
                        ⚠️ 请妥善保管您的私钥，不要泄露给任何第三方！
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={() => setRegenerateDialogOpen(true)}
                        color="warning"
                      >
                        重新生成密钥
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadConfig}
                      >
                        下载配置文件
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<CodeIcon />}
                        onClick={() => setCurrentTab(1)}
                        color="primary"
                      >
                        查看使用示例
                      </Button>
                    </Box>
                  </CardActions>
                </Card>
              </Grid2>

              {/* 安全信息卡片 */}
              <Grid2 item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                      🛡️ 安全信息
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        最后更新
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(keyInfo.lastUpdated)}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        历史版本
                      </Typography>
                      <Typography variant="body2">
                        {keyInfo.keyHistory}个已废弃的密钥
                      </Typography>
                    </Box>

                    {keyInfo.usage && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                          📊 使用统计
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            使用次数
                          </Typography>
                          <Typography variant="body2">
                            今日 {keyInfo.usage.dailyCount.toLocaleString()} 次
                          </Typography>
                          <Typography variant="body2">
                            本月 {keyInfo.usage.monthlyCount.toLocaleString()} 次
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            最后使用
                          </Typography>
                          <Typography variant="body2">
                            {formatDate(keyInfo.usage.lastUsed)}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {examples ? (
              <Grid2 container spacing={3}>
                <Grid2 item xs={12}>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      以下示例展示了如何使用您的API密钥调用支付接口。请确保在生产环境中妥善保管您的密钥。
                    </Typography>
                  </Alert>
                </Grid2>

                {/* 快速访问文档区域 */}
                <Grid2 item xs={12}>
                  <Card sx={{ mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon />
                        开发资源快速访问
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        获取完整的API文档、SDK下载和在线测试工具
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          startIcon={<CodeIcon />}
                          onClick={() => window.open('/wakeup-payment-api.html', '_blank')}
                          sx={{ minWidth: 140 }}
                        >
                          API接口文档
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={handleDownloadConfig}
                          sx={{ minWidth: 140 }}
                        >
                          下载SDK配置
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<SecurityIcon />}
                          onClick={() => window.open('/wakeup-payment-api.html#signature', '_blank')}
                          sx={{ minWidth: 140 }}
                        >
                          签名验证工具
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid2>

                {/* 代收订单示例 */}
                <Grid2 item xs={12} lg={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary.main">
                        💳 代收支付示例
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        请求URL: POST {examples.baseUrl}{examples.paymentExample.endpoint}
                      </Typography>
                      
                      <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          请求参数:
                        </Typography>
                        <pre style={{ 
                          fontSize: '12px', 
                          margin: 0, 
                          overflow: 'auto',
                          fontFamily: 'monospace'
                        }}>
                          {JSON.stringify(examples.paymentExample.body, null, 2)}
                        </pre>
                      </Paper>
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          startIcon={<CopyIcon />}
                          onClick={() => handleCopy(JSON.stringify(examples.paymentExample.body, null, 2), '代收示例代码')}
                        >
                          复制代码
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => window.open('/wakeup-payment-api.html#deposit', '_blank')}
                        >
                          详细文档
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid2>

                {/* 余额查询示例 */}
                <Grid2 item xs={12} lg={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary.main">
                        💰 余额查询示例
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        请求URL: POST {examples.baseUrl}{examples.balanceExample.endpoint}
                      </Typography>
                      
                      <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          请求参数:
                        </Typography>
                        <pre style={{ 
                          fontSize: '12px', 
                          margin: 0, 
                          overflow: 'auto',
                          fontFamily: 'monospace'
                        }}>
                          {JSON.stringify(examples.balanceExample.body, null, 2)}
                        </pre>
                      </Paper>
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          startIcon={<CopyIcon />}
                          onClick={() => handleCopy(JSON.stringify(examples.balanceExample.body, null, 2), '余额查询示例代码')}
                        >
                          复制代码
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => window.open('/wakeup-payment-api.html#query', '_blank')}
                        >
                          详细文档
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid2>

                {/* 签名算法示例 */}
                <Grid2 item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary.main">
                        🔐 签名算法示例
                      </Typography>
                      
                      <Tabs value={0}>
                        <Tab label="JavaScript" />
                        <Tab label="PHP" />
                        <Tab label="Python" />
                      </Tabs>
                      
                      <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                        <pre style={{ 
                          fontSize: '12px', 
                          margin: 0, 
                          overflow: 'auto',
                          fontFamily: 'monospace'
                        }}>
                          {examples.signatureCode.javascript}
                        </pre>
                      </Paper>
                      
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          startIcon={<CopyIcon />}
                          onClick={() => handleCopy(examples.signatureCode.javascript, '签名算法代码')}
                        >
                          复制代码
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => window.open('/wakeup-payment-api.html#signature', '_blank')}
                        >
                          详细文档
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid2>
              </Grid2>
            ) : (
              <Alert severity="info">
                正在加载使用示例...
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary.main">
                  📈 API使用统计
                </Typography>
                {keyInfo.usage ? (
                  <Grid2 container spacing={3}>
                    <Grid2 item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.main">
                          {keyInfo.usage.dailyCount.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          今日调用次数
                        </Typography>
                      </Paper>
                    </Grid2>
                    <Grid2 item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="secondary.main">
                          {keyInfo.usage.monthlyCount.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          本月调用次数
                        </Typography>
                      </Paper>
                    </Grid2>
                    <Grid2 item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {keyInfo.keyHistory}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          历史密钥版本
                        </Typography>
                      </Paper>
                    </Grid2>
                    <Grid2 item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body1" color="text.primary">
                          {formatDate(keyInfo.usage.lastUsed)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          最后使用时间
                        </Typography>
                      </Paper>
                    </Grid2>
                  </Grid2>
                ) : (
                  <Alert severity="info">
                    暂无使用统计数据
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </>
      )}

      {/* 重新生成密钥对话框 */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'warning.main' }}>
          ⚠️ 重新生成API密钥
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              注意：新密钥生成后，旧密钥将在24小时后失效，请确保及时更新您的应用配置。
            </Typography>
          </Alert>
          
          <TextField
            fullWidth
            label="请输入您的登录密码"
            type="password"
            value={regenerateForm.confirmPassword}
            onChange={(e) => setRegenerateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            sx={{ mb: 2 }}
            required
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>重新生成原因 *</InputLabel>
            <Select
              value={regenerateForm.reason}
              label="重新生成原因 *"
              onChange={(e) => setRegenerateForm(prev => ({ ...prev, reason: e.target.value }))}
              required
            >
              <MenuItem value="密钥泄露">密钥泄露</MenuItem>
              <MenuItem value="定期更新">定期更新</MenuItem>
              <MenuItem value="安全升级">安全升级</MenuItem>
              <MenuItem value="其他">其他</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={handleRegenerateKeys}
            color="warning"
            variant="contained"
            disabled={loading || !regenerateForm.confirmPassword || !regenerateForm.reason}
          >
            {loading ? <CircularProgress size={20} /> : '确认生成'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 二维码显示对话框 */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          API Key 二维码
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            扫描二维码获取API Key
          </Typography>
          {/* 这里可以集成二维码生成库 */}
          <Box sx={{ 
            width: 200, 
            height: 200, 
            mx: 'auto', 
            border: '1px dashed',
            borderColor: 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="body2" color="text.secondary">
              二维码生成功能<br/>待集成
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 成功提示 */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}