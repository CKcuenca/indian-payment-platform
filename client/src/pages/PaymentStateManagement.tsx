import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { Permission } from '../types';
import api from '../services/api';

interface PaymentState {
  status: string;
  allowedTransitions: string[];
  description: string;
}

interface OrderStatusHistory {
  currentStatus: string;
  operations: Array<{
    operationId: string;
    fromStatus: string;
    toStatus: string;
    additionalData: any;
    executedBy: string;
    executedAt: string;
  }>;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    reason: string;
    executedBy: string;
  }>;
}

interface StateTransitionValidation {
  orderId: string;
  currentStatus: string;
  targetStatus: string;
  isValid: boolean;
  reason: string;
  allowedTransitions: string[];
}

const PaymentStateManagement: React.FC = () => {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 状态机信息
  const [stateMachine, setStateMachine] = useState<PaymentState[]>([]);
  
  // 订单状态更新
  const [orderId, setOrderId] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [additionalData, setAdditionalData] = useState('');
  
  // 状态转换验证
  const [validationOrderId, setValidationOrderId] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [validationResult, setValidationResult] = useState<StateTransitionValidation | null>(null);
  
  // 订单历史
  const [historyOrderId, setHistoryOrderId] = useState('');
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistory | null>(null);
  
  // 批量更新
  const [batchUpdates, setBatchUpdates] = useState('');
  const [batchResults, setBatchResults] = useState<any[]>([]);
  
  // 对话框状态
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);

  // 加载状态机信息
  const loadStateMachine = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payment-state/state-machine');
      if (response.data.success) {
        setStateMachine(response.data.data.states);
      }
    } catch (error: any) {
      setError(`加载状态机失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 更新订单状态
  const updateOrderStatus = async () => {
    if (!orderId || !newStatus) {
      setError('请填写订单ID和新状态');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const updateData: any = {};
      if (reason) updateData.reason = reason;
      if (additionalData) {
        try {
          updateData.additionalData = JSON.parse(additionalData);
        } catch {
          updateData.additionalData = { note: additionalData };
        }
      }

      const response = await api.post(`/payment-state/${orderId}/status`, {
        status: newStatus,
        additionalData: updateData.additionalData,
        reason: updateData.reason
      });

      if (response.data.success) {
        setSuccess(`订单状态更新成功: ${response.data.message}`);
        setOrderId('');
        setNewStatus('');
        setReason('');
        setAdditionalData('');
      }
    } catch (error: any) {
      setError(`更新订单状态失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 验证状态转换
  const validateTransition = async () => {
    if (!validationOrderId || !targetStatus) {
      setError('请填写订单ID和目标状态');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/payment-state/${validationOrderId}/validate-transition`, {
        targetStatus
      });

      if (response.data.success) {
        setValidationResult(response.data.data);
        setValidationDialogOpen(true);
      }
    } catch (error: any) {
      setError(`验证状态转换失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取订单历史
  const getOrderHistory = async () => {
    if (!historyOrderId) {
      setError('请填写订单ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/payment-state/${historyOrderId}/history`);
      if (response.data.success) {
        setOrderHistory(response.data.data);
        setHistoryDialogOpen(true);
      }
    } catch (error: any) {
      setError(`获取订单历史失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 批量更新状态
  const batchUpdateStatus = async () => {
    if (!batchUpdates) {
      setError('请填写批量更新数据');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let updates;
      try {
        updates = JSON.parse(batchUpdates);
      } catch {
        setError('批量更新数据格式错误，请使用有效的JSON格式');
        return;
      }

      const response = await api.post('/payment-state/batch-status', { updates });
      if (response.data.success) {
        setBatchResults(response.data.data.results);
        setSuccess(`批量更新完成: ${response.data.message}`);
      }
    } catch (error: any) {
      setError(`批量更新失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 清理过期锁
  const cleanupExpiredLocks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/payment-state/cleanup-locks');
      if (response.data.success) {
        setSuccess(response.data.message);
      }
    } catch (error: any) {
      setError(`清理过期锁失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStateMachine();
  }, []);

  if (!hasPermission(Permission.SYSTEM_MONITORING)) {
    return (
      <Box p={3}>
        <Alert severity="error">您没有权限访问此页面</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        支付状态管理
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        管理支付订单状态，支持状态机验证、分布式锁和幂等性保证
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* 状态机信息 */}
        <Paper sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">状态机信息</Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadStateMachine}
              disabled={loading}
              size="small"
            >
              刷新
            </Button>
          </Box>
          
          <Box maxHeight={400} overflow="auto">
            {stateMachine.map((state) => (
              <Card key={state.status} sx={{ mb: 1 }}>
                <CardContent sx={{ py: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle2" fontWeight="bold">
                      {state.status}
                    </Typography>
                    <Chip 
                      label={`${state.allowedTransitions.length} 个转换`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {state.description}
                  </Typography>
                  <Box mt={1}>
                    <Typography variant="caption" color="textSecondary">
                      允许转换到:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                      {state.allowedTransitions.map((transition) => (
                        <Chip
                          key={transition}
                          label={transition}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>

        {/* 订单状态更新 */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            更新订单状态
          </Typography>
          
          <TextField
            fullWidth
            label="订单ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>新状态</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="新状态"
            >
              {stateMachine.map((state) => (
                <MenuItem key={state.status} value={state.status}>
                  {state.status} - {state.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="额外数据 (JSON格式)"
            value={additionalData}
            onChange={(e) => setAdditionalData(e.target.value)}
            placeholder='{"note": "备注信息"}'
            sx={{ mb: 2 }}
          />
          
          <Button
            fullWidth
            variant="contained"
            onClick={updateOrderStatus}
            disabled={loading || !orderId || !newStatus}
            startIcon={<PlayArrowIcon />}
          >
            更新状态
          </Button>
        </Paper>

        {/* 状态转换验证 */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            验证状态转换
          </Typography>
          
          <TextField
            fullWidth
            label="订单ID"
            value={validationOrderId}
            onChange={(e) => setValidationOrderId(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>目标状态</InputLabel>
            <Select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              label="目标状态"
            >
              {stateMachine.map((state) => (
                <MenuItem key={state.status} value={state.status}>
                  {state.status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={validateTransition}
            disabled={loading || !validationOrderId || !targetStatus}
            startIcon={<CheckCircleIcon />}
          >
            验证转换
          </Button>
        </Paper>

        {/* 订单历史查询 */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            查询订单历史
          </Typography>
          
          <TextField
            fullWidth
            label="订单ID"
            value={historyOrderId}
            onChange={(e) => setHistoryOrderId(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Button
            fullWidth
            variant="outlined"
            onClick={getOrderHistory}
            disabled={loading || !historyOrderId}
            startIcon={<HistoryIcon />}
          >
            查询历史
          </Button>
        </Paper>

        {/* 批量更新 */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            批量更新状态
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="批量更新数据 (JSON格式)"
            value={batchUpdates}
            onChange={(e) => setBatchUpdates(e.target.value)}
            placeholder='[{"orderId": "ORD001", "status": "SUCCESS", "reason": "支付成功"}, {"orderId": "ORD002", "status": "FAILED", "reason": "支付失败"}]'
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={batchUpdateStatus}
            disabled={loading || !batchUpdates}
            startIcon={<PlayArrowIcon />}
            sx={{ mr: 2 }}
          >
            批量更新
          </Button>
          
          <Button
            variant="outlined"
            onClick={cleanupExpiredLocks}
            disabled={loading}
            startIcon={<StopIcon />}
          >
            清理过期锁
          </Button>
          
          {/* 批量更新结果 */}
          {batchResults.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                批量更新结果:
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>订单ID</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>结果</TableCell>
                      <TableCell>操作ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batchResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.orderId}</TableCell>
                        <TableCell>{result.status}</TableCell>
                        <TableCell>
                          <Chip
                            label={result.success ? '成功' : '失败'}
                            color={result.success ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{result.operationId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>

      {/* 状态转换验证对话框 */}
      <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>状态转换验证结果</DialogTitle>
        <DialogContent>
          {validationResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                验证详情
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">订单ID:</Typography>
                  <Typography variant="body1">{validationResult.orderId}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">当前状态:</Typography>
                  <Typography variant="body1">{validationResult.currentStatus}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">目标状态:</Typography>
                  <Typography variant="body1">{validationResult.targetStatus}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">是否有效:</Typography>
                  <Chip
                    label={validationResult.isValid ? '有效' : '无效'}
                    color={validationResult.isValid ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Box>
              
              {!validationResult.isValid && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {validationResult.reason}
                </Alert>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                允许的状态转换
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {validationResult.allowedTransitions.map((status) => (
                  <Chip
                    key={status}
                    label={status}
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 订单历史对话框 */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>订单状态历史</DialogTitle>
        <DialogContent>
          {orderHistory && (
            <Box>
              <Typography variant="h6" gutterBottom>
                当前状态: {orderHistory.currentStatus}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                操作历史
              </Typography>
              <List dense>
                {orderHistory.operations.map((operation, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={`${operation.fromStatus} → ${operation.toStatus}`}
                      secondary={`操作ID: ${operation.operationId} | 执行人: ${operation.executedBy} | 时间: ${new Date(operation.executedAt).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                状态历史
              </Typography>
              <List dense>
                {orderHistory.statusHistory.map((status, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={status.status}
                      secondary={`原因: ${status.reason} | 执行人: ${status.executedBy} | 时间: ${new Date(status.timestamp).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
};

export default PaymentStateManagement;
