import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import { merchantService } from '../services/merchantService';

export default function TestPage() {
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testMerchantInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await merchantService.getMerchantInfo();
      setMerchantInfo(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '获取商户信息失败');
    } finally {
      setLoading(false);
    }
  };

  const testCreatePayment = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await merchantService.createPayment({
        merchantId: 'MERCHANT_ME01UHM7',
        amount: 10000,
        customerEmail: 'test@example.com',
        customerPhone: '919876543210',
        returnUrl: 'http://localhost:3001',
        provider: 'mock',
      });
      alert(`创建支付订单成功！订单ID: ${response.data.orderId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '创建支付订单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        API功能测试
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <Button
          variant="contained"
          onClick={testMerchantInfo}
          disabled={loading}
        >
          测试获取商户信息
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={testCreatePayment}
          disabled={loading}
        >
          测试创建支付订单
        </Button>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" mb={2}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {merchantInfo && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              商户信息
            </Typography>
            <Typography variant="body2">
              <strong>商户ID:</strong> {merchantInfo.merchantId}
            </Typography>
            <Typography variant="body2">
              <strong>名称:</strong> {merchantInfo.name}
            </Typography>
            <Typography variant="body2">
              <strong>邮箱:</strong> {merchantInfo.email}
            </Typography>
            <Typography variant="body2">
              <strong>状态:</strong> {merchantInfo.status}
            </Typography>
            <Typography variant="body2">
              <strong>可用余额:</strong> ₹{(merchantInfo.balance.available / 100).toFixed(2)}
            </Typography>
            <Typography variant="body2">
              <strong>冻结余额:</strong> ₹{(merchantInfo.balance.frozen / 100).toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
