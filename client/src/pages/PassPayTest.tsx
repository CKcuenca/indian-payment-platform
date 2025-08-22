import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  AccountBalance,
  Payment,
  Receipt,
  QueryStats,
  CheckCircle,
  Error,
  Warning,
  Info
} from '@mui/icons-material';
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
      id={`passpay-tabpanel-${index}`}
      aria-labelledby={`passpay-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface PassPayStatus {
  status: string;
  config: {
    accountId: string;
    payId: string;
    baseUrl: string;
  };
  providerInfo: {
    name: string;
    displayName: string;
    version: string;
    supportedFeatures: string[];
    signatureAlgorithm: string;
    apiVersion: string;
  };
}

const PassPayTest: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [status, setStatus] = useState<PassPayStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 代收订单表单
  const [collectionForm, setCollectionForm] = useState({
    orderId: '',
    amount: '',
    notifyUrl: ''
  });

  // 代付订单表单
  const [payoutForm, setPayoutForm] = useState({
    orderId: '',
    amount: '',
    upiId: '',
    notifyUrl: ''
  });

  // 查询表单
  const [queryForm, setQueryForm] = useState({
    orderId: '',
    tradeNo: '',
    upiId: ''
  });

  // UTR表单
  const [utrForm, setUtrForm] = useState({
    orderId: '',
    tradeNo: '',
    utr: ''
  });

  // 余额信息
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/passpay/status');
      if (response.data.success) {
        setStatus(response.data.data);
        setMessage({ type: 'success', text: 'PassPay服务连接正常' });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'PassPay服务连接失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/api/passpay/collection/create', collectionForm);
      if (response.data.success) {
        setMessage({ type: 'success', text: '代收订单创建成功' });
        setCollectionForm({ orderId: '', amount: '', notifyUrl: '' });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '代收订单创建失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/api/passpay/payout/create', payoutForm);
      if (response.data.success) {
        setMessage({ type: 'success', text: '代付订单创建成功' });
        setPayoutForm({ orderId: '', amount: '', upiId: '', notifyUrl: '' });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '代付订单创建失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionQuery = async () => {
    if (!queryForm.orderId && !queryForm.tradeNo) {
      setMessage({ type: 'error', text: '请输入订单ID或交易号' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/passpay/collection/query', {
        orderId: queryForm.orderId || undefined,
        tradeNo: queryForm.tradeNo || undefined
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: '查询成功' });
        console.log('查询结果:', response.data.data);
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '查询失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutQuery = async () => {
    if (!queryForm.orderId && !queryForm.tradeNo) {
      setMessage({ type: 'error', text: '请输入订单ID或交易号' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/passpay/payout/query', {
        orderId: queryForm.orderId || undefined,
        tradeNo: queryForm.tradeNo || undefined
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: '查询成功' });
        console.log('查询结果:', response.data.data);
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '查询失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpiQuery = async () => {
    if (!queryForm.upiId) {
      setMessage({ type: 'error', text: '请输入UPI ID' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/passpay/upi/query', {
        upiId: queryForm.upiId
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'UPI查询成功' });
        console.log('UPI查询结果:', response.data.data);
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'UPI查询失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/api/passpay/utr/submit', utrForm);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'UTR提交成功' });
        setUtrForm({ orderId: '', tradeNo: '', utr: '' });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'UTR提交失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUtrQuery = async () => {
    if (!utrForm.orderId || !utrForm.tradeNo) {
      setMessage({ type: 'error', text: '请输入订单ID和交易号' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/passpay/utr/query', {
        orderId: utrForm.orderId,
        tradeNo: utrForm.tradeNo
      });
      if (response.data.success) {
        setMessage({ type: 'success', text: 'UTR查询成功' });
        console.log('UTR查询结果:', response.data.data);
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'UTR查询失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/passpay/balance');
      if (response.data.success) {
        setBalance(response.data.data);
        setMessage({ type: 'success', text: '余额查询成功' });
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '余额查询失败' 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle color="success" />;
      case 'disconnected':
        return <Error color="error" />;
      default:
        return <Warning color="warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        PassPay 支付测试
      </Typography>

      {/* 状态显示 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccountBalance sx={{ mr: 1 }} />
            <Typography variant="h6">服务状态</Typography>
          </Box>
          
          {status ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getStatusIcon(status.status)}
                <Chip 
                  label={status.status === 'connected' ? '已连接' : '未连接'} 
                  color={getStatusColor(status.status) as any}
                  sx={{ ml: 1 }}
                />
              </Box>
              
              <Grid container spacing={2}>
                <Grid xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    账户ID: {status.config.accountId}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    支付ID: {status.config.payId}
                  </Typography>
                </Grid>
                <Grid xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    版本: {status.providerInfo.version}
                  </Typography>
                  <Typography variant="subtitle2" color="textSecondary">
                    签名算法: {status.providerInfo.signatureAlgorithm}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  支持功能:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {status.providerInfo.supportedFeatures.map((feature, index) => (
                    <Chip key={index} label={feature} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            </Box>
          ) : (
            <Typography color="textSecondary">正在检查状态...</Typography>
          )}

          <Button 
            variant="outlined" 
            onClick={checkStatus} 
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={20} /> : '刷新状态'}
          </Button>
        </CardContent>
      </Card>

      {/* 消息提示 */}
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* 功能标签页 */}
      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="代收订单" icon={<Payment />} />
          <Tab label="代付订单" icon={<Receipt />} />
          <Tab label="订单查询" icon={<QueryStats />} />
          <Tab label="UTR管理" icon={<CheckCircle />} />
          <Tab label="余额查询" icon={<AccountBalance />} />
        </Tabs>

        {/* 代收订单 */}
        <TabPanel value={tabValue} index={0}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>创建代收订单</Typography>
              <form onSubmit={handleCollectionSubmit}>
                <Grid container spacing={2}>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      label="订单ID"
                      value={collectionForm.orderId}
                      onChange={(e) => setCollectionForm({...collectionForm, orderId: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      label="金额"
                      type="number"
                      value={collectionForm.amount}
                      onChange={(e) => setCollectionForm({...collectionForm, amount: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      label="回调URL"
                      value={collectionForm.notifyUrl}
                      onChange={(e) => setCollectionForm({...collectionForm, notifyUrl: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid xs={12}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={20} /> : '创建代收订单'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </TabPanel>

        {/* 代付订单 */}
        <TabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>创建代付订单</Typography>
              <form onSubmit={handlePayoutSubmit}>
                <Grid container spacing={2}>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      label="订单ID"
                      value={payoutForm.orderId}
                      onChange={(e) => setPayoutForm({...payoutForm, orderId: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      label="金额"
                      type="number"
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm({...payoutForm, amount: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      label="UPI ID"
                      value={payoutForm.upiId}
                      onChange={(e) => setPayoutForm({...payoutForm, upiId: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      label="回调URL"
                      value={payoutForm.notifyUrl}
                      onChange={(e) => setPayoutForm({...payoutForm, notifyUrl: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid xs={12}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={20} /> : '创建代付订单'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </TabPanel>

        {/* 订单查询 */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2}>
            <Grid xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>查询代收订单</Typography>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="订单ID"
                      value={queryForm.orderId}
                      onChange={(e) => setQueryForm({...queryForm, orderId: e.target.value})}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="交易号"
                      value={queryForm.tradeNo}
                      onChange={(e) => setQueryForm({...queryForm, tradeNo: e.target.value})}
                      sx={{ mb: 2 }}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleCollectionQuery}
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={20} /> : '查询代收订单'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>查询代付订单</Typography>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="订单ID"
                      value={queryForm.orderId}
                      onChange={(e) => setQueryForm({...queryForm, orderId: e.target.value})}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="交易号"
                      value={queryForm.tradeNo}
                      onChange={(e) => setQueryForm({...queryForm, tradeNo: e.target.value})}
                      sx={{ mb: 2 }}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handlePayoutQuery}
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={20} /> : '查询代付订单'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>查询UPI</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="UPI ID"
                      value={queryForm.upiId}
                      onChange={(e) => setQueryForm({...queryForm, upiId: e.target.value})}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleUpiQuery}
                      disabled={loading}
                      sx={{ minWidth: 120 }}
                    >
                      {loading ? <CircularProgress size={20} /> : '查询UPI'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* UTR管理 */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={2}>
            <Grid xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>提交UTR</Typography>
                  <form onSubmit={handleUtrSubmit}>
                    <Grid container spacing={2}>
                      <Grid xs={12}>
                        <TextField
                          fullWidth
                          label="订单ID"
                          value={utrForm.orderId}
                          onChange={(e) => setUtrForm({...utrForm, orderId: e.target.value})}
                          required
                        />
                      </Grid>
                      <Grid xs={12}>
                        <TextField
                          fullWidth
                          label="交易号"
                          value={utrForm.tradeNo}
                          onChange={(e) => setUtrForm({...utrForm, tradeNo: e.target.value})}
                          required
                        />
                      </Grid>
                      <Grid xs={12}>
                        <TextField
                          fullWidth
                          label="UTR"
                          value={utrForm.utr}
                          onChange={(e) => setUtrForm({...utrForm, utr: e.target.value})}
                          required
                        />
                      </Grid>
                      <Grid xs={12}>
                        <Button 
                          type="submit" 
                          variant="contained" 
                          disabled={loading}
                          fullWidth
                        >
                          {loading ? <CircularProgress size={20} /> : '提交UTR'}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>查询UTR状态</Typography>
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="订单ID"
                      value={utrForm.orderId}
                      onChange={(e) => setUtrForm({...utrForm, orderId: e.target.value})}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="交易号"
                      value={utrForm.tradeNo}
                      onChange={(e) => setUtrForm({...utrForm, tradeNo: e.target.value})}
                      sx={{ mb: 2 }}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleUtrQuery}
                      disabled={loading}
                      fullWidth
                    >
                      {loading ? <CircularProgress size={20} /> : '查询UTR状态'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 余额查询 */}
        <TabPanel value={tabValue} index={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>账户余额</Typography>
              
              {balance ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h3" color="primary" gutterBottom>
                    ₹{balance.balance.toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary">
                    {balance.currency}
                  </Typography>
                </Box>
              ) : (
                <Typography color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                  点击下方按钮查询余额
                </Typography>
              )}

              <Button 
                variant="contained" 
                onClick={checkBalance}
                disabled={loading}
                fullWidth
                size="large"
              >
                {loading ? <CircularProgress size={20} /> : '查询余额'}
              </Button>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default PassPayTest;
