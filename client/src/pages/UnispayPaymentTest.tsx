import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  AccountBalance,
  Payment,
  CheckCircle,
  Schedule,
  Info,
  Warning,
  ExpandMore
} from '@mui/icons-material';
import { PermissionGuard } from '../components/PermissionGuard';
import { Permission } from '../types';

interface UpiTransferInfo {
  beneficiaryName: string;
  beneficiaryUPI: string;
  beneficiaryAccount: string;
  ifscCode: string;
  bankName: string;
  amount: number;
  currency: string;
  transferNote: string;
  expectedCompletionTime: string;
  orderNo: string;
}

interface UnispayPaymentResponse {
  orderid: string;
  status: string;
  message: string;
  upi_transfer_info: UpiTransferInfo;
  order_no: string;
}

interface OrderStatus {
  orderid: string;
  status: string;
  amount: number;
  order_no: string;
  paid_time?: number;
  message: string;
}

const UnispayPaymentTest: React.FC = () => {
  const [formData, setFormData] = useState({
    orderid: `TEST_${Date.now()}`,
    amount: '1000',
    desc: '测试UNISPAY唤醒支付',
    notify_url: 'https://example.com/notify',
    return_url: 'https://example.com/return',
    customer_phone: '919876543210'
  });

  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<UnispayPaymentResponse | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const createPaymentOrder = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/unispay/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-ID': 'test_merchant_001',
          'X-API-Key': 'test_api_key_123'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.code === 0) {
        setPaymentResult(result.data);
        setSuccess('订单创建成功！');
        setOrderStatus(null);
      } else {
        setError(result.message || '创建订单失败');
        setPaymentResult(null);
      }
    } catch (err) {
      setError('网络请求失败');
      setPaymentResult(null);
    } finally {
      setLoading(false);
    }
  };

  const queryOrderStatus = async () => {
    if (!paymentResult?.orderid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/unispay/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-ID': 'test_merchant_001',
          'X-API-Key': 'test_api_key_123'
        },
        body: JSON.stringify({
          orderid: paymentResult.orderid
        })
      });

      const result = await response.json();
      
      if (result.code === 0) {
        setOrderStatus(result.data);
        setSuccess('查询订单状态成功！');
      } else {
        setError(result.message || '查询订单状态失败');
      }
    } catch (err) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle color="success" />;
      case 'PENDING':
        return <Schedule color="warning" />;
      case 'FAILED':
        return <Warning color="error" />;
      default:
        return <Info />;
    }
  };

  return (
    <PermissionGuard permissions={[Permission.MANAGE_USERS]}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          UNISPAY 唤醒支付测试
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          UNISPAY 唤醒支付是一种特殊的支付方式，玩家通过 UPI 转账到指定印度人的私人银行卡，
          第三方支付公司通过网银查询转账是否完成，然后通知游戏公司支付结果。
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 创建订单表单 */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                创建唤醒支付订单
              </Typography>
              
              <Box component="form" sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="订单ID"
                  value={formData.orderid}
                  onChange={(e) => handleInputChange('orderid', e.target.value)}
                  margin="normal"
                  helperText="订单ID长度至少6位"
                />
                
                <TextField
                  fullWidth
                  label="支付金额 (卢比)"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  margin="normal"
                  type="number"
                  helperText="请输入支付金额"
                />
                
                <TextField
                  fullWidth
                  label="订单描述"
                  value={formData.desc}
                  onChange={(e) => handleInputChange('desc', e.target.value)}
                  margin="normal"
                  multiline
                  rows={2}
                />
                
                <TextField
                  fullWidth
                  label="异步通知地址"
                  value={formData.notify_url}
                  onChange={(e) => handleInputChange('notify_url', e.target.value)}
                  margin="normal"
                  helperText="支付结果异步通知地址"
                />
                
                <TextField
                  fullWidth
                  label="同步返回地址"
                  value={formData.return_url}
                  onChange={(e) => handleInputChange('return_url', e.target.value)}
                  margin="normal"
                  helperText="支付完成后的跳转地址"
                />
                
                <TextField
                  fullWidth
                  label="客户手机号"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  margin="normal"
                  helperText="印度手机号格式：91XXXXXXXXXX"
                />
                
                <Button
                  variant="contained"
                  onClick={createPaymentOrder}
                  disabled={loading}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  {loading ? <CircularProgress size={24} /> : '创建支付订单'}
                </Button>
              </Box>
            </Paper>
          </Box>

          {/* 支付结果展示 */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                支付结果
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}
              
              {paymentResult && (
                <Box>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        订单信息
                      </Typography>
                      <Typography>订单ID: {paymentResult.orderid}</Typography>
                      <Typography>状态: 
                        <Chip 
                          label={paymentResult.status} 
                          color={getStatusColor(paymentResult.status) as any}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography>消息: {paymentResult.message}</Typography>
                      <Typography>UNISPAY订单号: {paymentResult.order_no}</Typography>
                    </CardContent>
                  </Card>

                  <Accordion>
                                         <AccordionSummary expandIcon={<ExpandMore />}>
                       <Typography variant="h6">
                         <Payment sx={{ mr: 1 }} />
                         UPI 转账信息
                       </Typography>
                     </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                                                 <ListItem>
                           <ListItemIcon><AccountBalance /></ListItemIcon>
                           <ListItemText 
                             primary="收款人姓名" 
                             secondary={paymentResult.upi_transfer_info.beneficiaryName} 
                           />
                         </ListItem>
                                                 <ListItem>
                           <ListItemIcon><Payment /></ListItemIcon>
                           <ListItemText 
                             primary="UPI ID" 
                             secondary={paymentResult.upi_transfer_info.beneficiaryUPI || 'N/A'} 
                           />
                         </ListItem>
                        <ListItem>
                          <ListItemIcon><AccountBalance /></ListItemIcon>
                          <ListItemText 
                            primary="银行账户" 
                            secondary={paymentResult.upi_transfer_info.beneficiaryAccount} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Info /></ListItemIcon>
                          <ListItemText 
                            primary="IFSC代码" 
                            secondary={paymentResult.upi_transfer_info.ifscCode} 
                          />
                        </ListItem>
                                                 <ListItem>
                           <ListItemIcon><AccountBalance /></ListItemIcon>
                           <ListItemText 
                             primary="银行名称" 
                             secondary={paymentResult.upi_transfer_info.bankName} 
                           />
                         </ListItem>
                        <ListItem>
                          <ListItemIcon><Payment /></ListItemIcon>
                          <ListItemText 
                            primary="转账金额" 
                            secondary={`${paymentResult.upi_transfer_info.amount} ${paymentResult.upi_transfer_info.currency}`} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Info /></ListItemIcon>
                          <ListItemText 
                            primary="转账备注" 
                            secondary={paymentResult.upi_transfer_info.transferNote} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><Schedule /></ListItemIcon>
                          <ListItemText 
                            primary="预计完成时间" 
                            secondary={paymentResult.upi_transfer_info.expectedCompletionTime} 
                          />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>

                  <Button
                    variant="outlined"
                    onClick={queryOrderStatus}
                    disabled={loading}
                    sx={{ mt: 2 }}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : '查询订单状态'}
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>

          {/* 订单状态查询结果 */}
          {orderStatus && (
            <Box>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  订单状态查询结果
                </Typography>
                
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          订单ID
                        </Typography>
                        <Typography variant="body1">
                          {orderStatus.orderid}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          状态
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getStatusIcon(orderStatus.status)}
                          <Chip 
                            label={orderStatus.status} 
                            color={getStatusColor(orderStatus.status) as any}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          支付金额
                        </Typography>
                        <Typography variant="body1">
                          {orderStatus.amount} 卢比
                        </Typography>
                      </Box>
                      
                      <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          UNISPAY订单号
                        </Typography>
                        <Typography variant="body1">
                          {orderStatus.order_no}
                        </Typography>
                      </Box>
                      
                      {orderStatus.paid_time && (
                        <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                          <Typography variant="subtitle2" color="textSecondary">
                            支付时间
                          </Typography>
                          <Typography variant="body1">
                            {new Date(orderStatus.paid_time * 1000).toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                      
                      <Box sx={{ minWidth: '100%', flex: '1 1 100%' }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          消息
                        </Typography>
                        <Typography variant="body1">
                          {orderStatus.message}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Paper>
            </Box>
          )}
                  </Box>
        </Box>
    </PermissionGuard>
  );
};

export default UnispayPaymentTest;
