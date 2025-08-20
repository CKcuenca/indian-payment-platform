import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { cashgitApiService } from '../services/cashgitApiService';
import { CashGitPaymentRequest, CashGitQueryRequest, CashGitRefundRequest, CashGitCloseRequest } from '../types';

const CashGitPaymentTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 支付订单参数
  const [paymentParams, setPaymentParams] = useState<Partial<CashGitPaymentRequest>>({
    appid: 'test_merchant_001',
    orderid: `cashgit_${Date.now()}`,
    amount: '100.50',
    desc: 'CashGit测试支付订单',
    notify_url: 'http://example.com/notify',
    return_url: 'http://example.com/return'
  });

  // 查询参数
  const [queryParams, setQueryParams] = useState<Partial<CashGitQueryRequest>>({
    appid: 'test_merchant_001',
    orderid: ''
  });

  // 退款参数
  const [refundParams, setRefundParams] = useState<Partial<CashGitRefundRequest>>({
    appid: 'test_merchant_001',
    orderid: '',
    amount: '50.00',
    desc: '部分退款'
  });

  // 关闭参数
  const [closeParams, setCloseParams] = useState<Partial<CashGitCloseRequest>>({
    appid: 'test_merchant_001',
    orderid: ''
  });

  const handleApiCall = async (apiFunction: () => Promise<any>, operation: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await apiFunction();
      setResponse(result);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = () => {
    handleApiCall(
      () => cashgitApiService.createPayment(paymentParams as CashGitPaymentRequest),
      '创建支付订单'
    );
  };

  const handleQueryOrder = () => {
    handleApiCall(
      () => cashgitApiService.queryOrder(queryParams as CashGitQueryRequest),
      '查询订单'
    );
  };

  const handleRefund = () => {
    handleApiCall(
      () => cashgitApiService.requestRefund(refundParams as CashGitRefundRequest),
      '申请退款'
    );
  };

  const handleCloseOrder = () => {
    handleApiCall(
      () => cashgitApiService.closeOrder(closeParams as CashGitCloseRequest),
      '关闭订单'
    );
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
        CashGit支付API测试
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        此页面用于测试CashGit支付API的各项功能。请确保后端服务器正在运行。
      </Alert>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {/* 创建支付订单 */}
        <Card sx={{ minWidth: 300, flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              创建支付订单
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="商户ID (appid)"
                value={paymentParams.appid}
                onChange={(e) => setPaymentParams({ ...paymentParams, appid: e.target.value })}
              />
              <TextField
                fullWidth
                label="订单ID (orderid)"
                value={paymentParams.orderid}
                onChange={(e) => setPaymentParams({ ...paymentParams, orderid: e.target.value })}
              />
              <TextField
                fullWidth
                label="金额 (amount)"
                value={paymentParams.amount}
                onChange={(e) => setPaymentParams({ ...paymentParams, amount: e.target.value })}
              />
              <TextField
                fullWidth
                label="描述 (desc)"
                value={paymentParams.desc}
                onChange={(e) => setPaymentParams({ ...paymentParams, desc: e.target.value })}
              />
              <TextField
                fullWidth
                label="通知URL (notify_url)"
                value={paymentParams.notify_url}
                onChange={(e) => setPaymentParams({ ...paymentParams, notify_url: e.target.value })}
              />
              <TextField
                fullWidth
                label="返回URL (return_url)"
                value={paymentParams.return_url}
                onChange={(e) => setPaymentParams({ ...paymentParams, return_url: e.target.value })}
              />
            </Box>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handleCreatePayment}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              创建订单
            </Button>
          </CardActions>
        </Card>

        {/* 查询订单 */}
        <Card sx={{ minWidth: 300, flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              查询订单
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="商户ID (appid)"
                value={queryParams.appid}
                onChange={(e) => setQueryParams({ ...queryParams, appid: e.target.value })}
              />
              <TextField
                fullWidth
                label="订单ID (orderid)"
                value={queryParams.orderid}
                onChange={(e) => setQueryParams({ ...queryParams, orderid: e.target.value })}
              />
            </Box>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handleQueryOrder}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              查询订单
            </Button>
          </CardActions>
        </Card>

        {/* 申请退款 */}
        <Card sx={{ minWidth: 300, flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              申请退款
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="商户ID (appid)"
                value={refundParams.appid}
                onChange={(e) => setRefundParams({ ...refundParams, appid: e.target.value })}
              />
              <TextField
                fullWidth
                label="订单ID (orderid)"
                value={refundParams.orderid}
                onChange={(e) => setRefundParams({ ...refundParams, orderid: e.target.value })}
              />
              <TextField
                fullWidth
                label="退款金额 (amount)"
                value={refundParams.amount}
                onChange={(e) => setRefundParams({ ...refundParams, amount: e.target.value })}
              />
              <TextField
                fullWidth
                label="退款描述 (desc)"
                value={refundParams.desc}
                onChange={(e) => setRefundParams({ ...refundParams, desc: e.target.value })}
              />
            </Box>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handleRefund}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              申请退款
            </Button>
          </CardActions>
        </Card>

        {/* 关闭订单 */}
        <Card sx={{ minWidth: 300, flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              关闭订单
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="商户ID (appid)"
                value={closeParams.appid}
                onChange={(e) => setCloseParams({ ...closeParams, appid: e.target.value })}
              />
              <TextField
                fullWidth
                label="订单ID (orderid)"
                value={closeParams.orderid}
                onChange={(e) => setCloseParams({ ...closeParams, orderid: e.target.value })}
              />
            </Box>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handleCloseOrder}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              关闭订单
            </Button>
          </CardActions>
        </Card>
      </Box>

      {/* 响应显示 */}
      {(response || error) && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            API响应
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {response && (
            <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(response, null, 2)}
              </pre>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default CashGitPaymentTest;
