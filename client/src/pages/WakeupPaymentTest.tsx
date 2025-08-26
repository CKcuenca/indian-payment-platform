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
  ListItemIcon
} from '@mui/material';
import {
  AccountBalance,
  Payment,
  CheckCircle,
  Schedule,
  Info,
  Warning
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
}

interface WakeupPaymentResponse {
  orderid: string;
  status: string;
  message: string;
  upi_transfer_info: UpiTransferInfo;
  verification_required: boolean;
}

export default function WakeupPaymentTest() {
  const [formData, setFormData] = useState({
    orderid: '',
    amount: '',
    desc: '',
    customer_phone: '',
    notify_url: '',
    return_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<WakeupPaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState({
    utr_number: '',
    transfer_amount: '',
    transfer_date: ''
  });
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVerificationChange = (field: string, value: string) => {
    setVerificationData(prev => ({ ...prev, [field]: value }));
  };

  const createPayment = async () => {
    setLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      const response = await fetch('/api/wakeup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.code === 0) {
        setPaymentResult(result.data);
      } else {
        setError(result.message || '创建支付订单失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (!paymentResult) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wakeup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderid: paymentResult.orderid,
          ...verificationData
        })
      });

      const result = await response.json();

      if (result.code === 0) {
        setVerificationResult(result.data);
        // 更新支付结果状态
        setPaymentResult(prev => prev ? { ...prev, status: 'SUCCESS' } : null);
      } else {
        setError(result.message || '验证失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const queryOrderStatus = async () => {
    if (!paymentResult) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wakeup/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderid: paymentResult.orderid
        })
      });

      const result = await response.json();

      if (result.code === 0) {
        setPaymentResult(prev => prev ? { ...prev, ...result.data } : null);
      } else {
        setError(result.message || '查询订单状态失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permissions={[Permission.MANAGE_PAYMENT_CONFIG]}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          唤醒支付测试
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          测试唤醒支付功能 - 玩家通过UPI转账到指定印度人的私人银行卡
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 创建支付订单 */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                创建唤醒支付订单
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="订单ID"
                  value={formData.orderid}
                  onChange={(e) => handleInputChange('orderid', e.target.value)}
                  placeholder="例如: ORDER123456"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="金额 (卢比)"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="例如: 1000"
                  type="number"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="描述"
                  value={formData.desc}
                  onChange={(e) => handleInputChange('desc', e.target.value)}
                  placeholder="例如: 游戏充值"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="客户手机号"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  placeholder="例如: +919876543210"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="通知URL"
                  value={formData.notify_url}
                  onChange={(e) => handleInputChange('notify_url', e.target.value)}
                  placeholder="例如: https://example.com/webhook"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="返回URL"
                  value={formData.return_url}
                  onChange={(e) => handleInputChange('return_url', e.target.value)}
                  placeholder="例如: https://example.com/return"
                  sx={{ mb: 2 }}
                />
              </Box>
              
              <Button
                variant="contained"
                onClick={createPayment}
                disabled={loading || !formData.orderid || !formData.amount}
                fullWidth
                startIcon={loading ? <CircularProgress size={20} /> : <Payment />}
              >
                {loading ? '创建中...' : '创建支付订单'}
              </Button>
            </Paper>
          </Box>

          {/* 支付结果 */}
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
              
              {paymentResult && (
                <Box>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        订单信息
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        订单ID: {paymentResult.orderid}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        状态: 
                        <Chip 
                          label={paymentResult.status} 
                          color={paymentResult.status === 'SUCCESS' ? 'success' : 'warning'}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        消息: {paymentResult.message}
                      </Typography>
                    </CardContent>
                  </Card>

                  {paymentResult.upi_transfer_info && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          UPI转账信息
                        </Typography>
                        
                        <List dense>
                          <ListItem>
                            <ListItemIcon>
                              <AccountBalance />
                            </ListItemIcon>
                            <ListItemText 
                              primary="收款人姓名"
                              secondary={paymentResult.upi_transfer_info.beneficiaryName}
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <Payment />
                            </ListItemIcon>
                            <ListItemText 
                              primary="UPI ID"
                              secondary={paymentResult.upi_transfer_info.beneficiaryUPI}
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <AccountBalance />
                            </ListItemIcon>
                            <ListItemText 
                              primary="银行账户"
                              secondary={paymentResult.upi_transfer_info.beneficiaryAccount}
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <Info />
                            </ListItemIcon>
                            <ListItemText 
                              primary="IFSC代码"
                              secondary={paymentResult.upi_transfer_info.ifscCode}
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <AccountBalance />
                            </ListItemIcon>
                            <ListItemText 
                              primary="银行名称"
                              secondary={paymentResult.upi_transfer_info.bankName}
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <Payment />
                            </ListItemIcon>
                            <ListItemText 
                              primary="转账金额"
                              secondary={`${paymentResult.upi_transfer_info.amount} ${paymentResult.upi_transfer_info.currency}`}
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <Info />
                            </ListItemIcon>
                            <ListItemText 
                              primary="转账备注"
                              secondary={paymentResult.upi_transfer_info.transferNote}
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <Schedule />
                            </ListItemIcon>
                            <ListItemText 
                              primary="预计完成时间"
                              secondary={paymentResult.upi_transfer_info.expectedCompletionTime}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  )}

                  {/* 操作按钮 */}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      onClick={queryOrderStatus}
                      disabled={loading}
                      startIcon={<Info />}
                    >
                      查询状态
                    </Button>
                    
                    {paymentResult.status === 'PENDING_VERIFICATION' && (
                      <Button
                        variant="outlined"
                        onClick={() => document.getElementById('verification-section')?.scrollIntoView()}
                        startIcon={<CheckCircle />}
                      >
                        手动验证
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>

        {/* 手动验证部分 */}
        {paymentResult && paymentResult.status === 'PENDING_VERIFICATION' && (
          <Box sx={{ mt: 3 }} id="verification-section">
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                手动验证转账
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                如果自动验证失败，可以手动输入UTR号码和转账信息进行验证
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    label="UTR号码"
                    value={verificationData.utr_number}
                    onChange={(e) => handleVerificationChange('utr_number', e.target.value)}
                    placeholder="例如: 123456789012"
                    helperText="银行转账的唯一标识号"
                  />
                </Box>
                
                <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    label="转账金额"
                    value={verificationData.transfer_amount}
                    onChange={(e) => handleVerificationChange('transfer_amount', e.target.value)}
                    placeholder="例如: 1000"
                    type="number"
                    helperText="实际转账金额"
                  />
                </Box>
                
                <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                  <TextField
                    fullWidth
                    label="转账日期"
                    value={verificationData.transfer_date}
                    onChange={(e) => handleVerificationChange('transfer_date', e.target.value)}
                    placeholder="例如: 2024-01-15"
                    type="date"
                    helperText="转账完成日期"
                  />
                </Box>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={verifyPayment}
                  disabled={loading || !verificationData.utr_number || !verificationData.transfer_amount}
                  startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                >
                  {loading ? '验证中...' : '验证转账'}
                </Button>
              </Box>
              
              {verificationResult && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {verificationResult.message}
                </Alert>
              )}
            </Paper>
          </Box>
        )}

        {/* 说明信息 */}
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              唤醒支付说明
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              唤醒支付是一种特殊的支付方式，玩家通过UPI转账到指定的印度私人银行卡账户。
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>工作流程：</strong>
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="primary" />
                </ListItemIcon>
                <ListItemText primary="1. 系统生成UPI转账信息，包含收款人账户详情" />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="primary" />
                </ListItemIcon>
                <ListItemText primary="2. 玩家通过UPI应用转账到指定账户" />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="primary" />
                </ListItemIcon>
                <ListItemText primary="3. 系统通过网银API查询转账状态" />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="primary" />
                </ListItemIcon>
                <ListItemText primary="4. 确认完成后通知游戏公司支付结果" />
              </ListItem>
            </List>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>注意：</strong> 唤醒支付需要手动验证或等待系统自动验证。如果自动验证失败，可以使用手动验证功能。
              </Typography>
            </Alert>
          </Paper>
        </Box>
      </Box>
    </PermissionGuard>
  );
}
