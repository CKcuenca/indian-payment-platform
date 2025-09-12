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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import api from '../services/api';
import { 
  DUAL_TYPE_PAYMENT_CONFIGS,
  getDualTypeProviderConfig,
  getProviderTypeConfig,
  getDualTypeFieldLabel,
  getDualTypeFieldHelper,
  isDualTypeFieldRequired,
  shouldShowDualTypeField,
  isTypeSupported
} from '../config/paymentProviderConfigsNew';

interface PaymentAccount {
  _id: string;
  accountName: string;
  provider: {
    name: string;
    type: 'native' | 'wakeup';
    accountId?: string;
    payId?: string;
    secretKey?: string;
    mchNo?: string;
    apiKey?: string;
  };
  status: 'active' | 'inactive';
  environment: string;
  description?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  accountName: string;
  providerName: string;
  type: 'native' | 'wakeup';
  accountId: string;
  payId: string;
  secretKey: string;
  mchNo: string;
  apiKey: string;
  environment: string;
  description: string;
  priority: number;
  status: 'active' | 'inactive';
}

export default function PaymentConfigDualType() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [formData, setFormData] = useState<FormData>({
    accountName: '',
    providerName: '',
    type: 'native',
    accountId: '',
    payId: '',
    secretKey: '',
    mchNo: '',
    apiKey: '',
    environment: 'production',
    description: '',
    priority: 1,
    status: 'active'
  });

  // 加载支付账户列表
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/payment-config');
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error: any) {
      console.error('加载支付账户失败:', error);
      setError('加载支付账户失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // 打开新增对话框
  const handleAdd = () => {
    setEditingAccount(null);
    setFormData({
      accountName: '',
      providerName: '',
      type: 'native',
      accountId: '',
      payId: '',
      secretKey: '',
      mchNo: '',
      apiKey: '',
      environment: 'production',
      description: '',
      priority: 1,
      status: 'active'
    });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (account: PaymentAccount) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.accountName,
      providerName: account.provider.name,
      type: account.provider.type,
      accountId: account.provider.accountId || '',
      payId: account.provider.payId || '',
      secretKey: account.provider.secretKey || '',
      mchNo: account.provider.mchNo || '',
      apiKey: account.provider.apiKey || '',
      environment: account.environment,
      description: account.description || '',
      priority: account.priority,
      status: account.status
    });
    setDialogOpen(true);
  };

  // 保存配置
  const handleSave = async () => {
    try {
      if (!formData.accountName || !formData.providerName) {
        setError('请填写必填字段');
        return;
      }

      const typeConfig = getProviderTypeConfig(formData.providerName, formData.type);
      if (!typeConfig) {
        setError('不支持的支付商类型');
        return;
      }

      // 构建保存数据
      const saveData = {
        accountName: formData.accountName,
        provider: {
          name: formData.providerName,
          type: formData.type,
          subType: typeConfig.subType,
          ...(formData.accountId && { accountId: formData.accountId }),
          ...(formData.payId && { payId: formData.payId }),
          ...(formData.secretKey && { secretKey: formData.secretKey }),
          ...(formData.mchNo && { mchNo: formData.mchNo }),
          ...(formData.apiKey && { apiKey: formData.apiKey })
        },
        environment: formData.environment,
        description: formData.description,
        priority: formData.priority,
        status: formData.status
      };

      if (editingAccount) {
        // 更新
        await api.put(`/api/payment-config/${editingAccount._id}`, saveData);
      } else {
        // 新增
        await api.post('/api/payment-config', saveData);
      }

      setDialogOpen(false);
      loadAccounts();
      setError(null);
    } catch (error: any) {
      console.error('保存失败:', error);
      setError(error.response?.data?.error || '保存失败');
    }
  };

  // 删除配置
  const handleDelete = async (account: PaymentAccount) => {
    if (!confirm('确认删除此支付配置吗？')) return;
    
    try {
      await api.delete(`/api/payment-config/${account._id}`);
      loadAccounts();
    } catch (error: any) {
      console.error('删除失败:', error);
      setError(error.response?.data?.error || '删除失败');
    }
  };

  // 支付商改变时的处理
  const handleProviderChange = (newProvider: string) => {
    const providerConfig = getDualTypeProviderConfig(newProvider);
    if (providerConfig) {
      const defaultType = providerConfig.supportedTypes[0];
      const typeConfig = getProviderTypeConfig(newProvider, defaultType);
      
      setFormData(prev => ({
        ...prev,
        providerName: newProvider,
        type: defaultType,
        ...typeConfig?.defaultValues
      }));
    }
  };

  // 类型改变时的处理
  const handleTypeChange = (newType: 'native' | 'wakeup') => {
    if (!isTypeSupported(formData.providerName, newType)) return;
    
    const typeConfig = getProviderTypeConfig(formData.providerName, newType);
    setFormData(prev => ({
      ...prev,
      type: newType,
      ...typeConfig?.defaultValues
    }));
  };

  // 按支付商分组账户
  const groupedAccounts = accounts.reduce((groups: Record<string, PaymentAccount[]>, account) => {
    const key = account.provider.name;
    if (!groups[key]) groups[key] = [];
    groups[key].push(account);
    return groups;
  }, {});

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          支付配置管理 (双类型)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={loading}
        >
          添加支付账户
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          {Object.keys(groupedAccounts).length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                暂无支付配置，点击上方按钮添加配置
              </Typography>
            </Paper>
          ) : (
            Object.entries(groupedAccounts).map(([providerName, providerAccounts]) => {
              const providerConfig = getDualTypeProviderConfig(providerName);
              return (
                <Paper key={providerName} sx={{ mb: 3, p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon />
                    {providerConfig?.displayName || providerName}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {providerAccounts.map((account) => (
                      <Grid item xs={12} md={6} key={account._id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6">
                                {account.accountName}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  label={account.provider.type === 'native' ? '原生' : '唤醒'} 
                                  color={account.provider.type === 'native' ? 'primary' : 'secondary'}
                                  size="small"
                                />
                                <Chip 
                                  label={account.status === 'active' ? '启用' : '禁用'} 
                                  color={account.status === 'active' ? 'success' : 'default'}
                                  size="small"
                                />
                              </Box>
                            </Box>
                            
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                              环境: {account.environment} | 优先级: {account.priority}
                            </Typography>
                            
                            {account.description && (
                              <Typography variant="body2" sx={{ mb: 2 }}>
                                {account.description}
                              </Typography>
                            )}
                            
                            <Divider sx={{ mb: 2 }} />
                            
                            <Typography variant="body2" color="textSecondary">
                              配置参数:
                            </Typography>
                            <List dense>
                              {account.provider.accountId && (
                                <ListItem sx={{ py: 0.5, px: 0 }}>
                                  <ListItemText 
                                    primary="商户号" 
                                    secondary={`***${account.provider.accountId.slice(-4)}`}
                                  />
                                </ListItem>
                              )}
                              {account.provider.payId && (
                                <ListItem sx={{ py: 0.5, px: 0 }}>
                                  <ListItemText 
                                    primary="PayID" 
                                    secondary={account.provider.payId}
                                  />
                                </ListItem>
                              )}
                              {account.provider.mchNo && (
                                <ListItem sx={{ py: 0.5, px: 0 }}>
                                  <ListItemText 
                                    primary="商户号(mchNo)" 
                                    secondary={`***${account.provider.mchNo.slice(-4)}`}
                                  />
                                </ListItem>
                              )}
                            </List>
                          </CardContent>
                          
                          <CardActions>
                            <Button 
                              size="small" 
                              startIcon={<EditIcon />}
                              onClick={() => handleEdit(account)}
                            >
                              编辑
                            </Button>
                            <Button 
                              size="small" 
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDelete(account)}
                            >
                              删除
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              );
            })
          )}
        </Box>
      )}

      {/* 配置对话框 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAccount ? '编辑支付配置' : '添加支付配置'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              {/* 基础信息 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="账户名称"
                  value={formData.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                  required
                />
              </Grid>

              {/* 支付商选择 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>支付商</InputLabel>
                  <Select
                    value={formData.providerName}
                    label="支付商"
                    onChange={(e) => handleProviderChange(e.target.value)}
                  >
                    {Object.values(DUAL_TYPE_PAYMENT_CONFIGS).map((config) => (
                      <MenuItem key={config.name} value={config.name}>
                        {config.displayName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 类型选择 */}
              {formData.providerName && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>通道类型</InputLabel>
                    <Select
                      value={formData.type}
                      label="通道类型"
                      onChange={(e) => handleTypeChange(e.target.value as 'native' | 'wakeup')}
                    >
                      {getDualTypeProviderConfig(formData.providerName)?.supportedTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type === 'native' ? '原生通道' : '唤醒通道'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* 动态字段 */}
              {formData.providerName && formData.type && (
                <>
                  {shouldShowDualTypeField(formData.providerName, formData.type, 'accountId') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={getDualTypeFieldLabel(formData.providerName, formData.type, 'accountId')}
                        value={formData.accountId}
                        onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                        required={isDualTypeFieldRequired(formData.providerName, formData.type, 'accountId')}
                        helperText={getDualTypeFieldHelper(formData.providerName, formData.type, 'accountId')}
                      />
                    </Grid>
                  )}

                  {shouldShowDualTypeField(formData.providerName, formData.type, 'payId') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={getDualTypeFieldLabel(formData.providerName, formData.type, 'payId')}
                        value={formData.payId}
                        onChange={(e) => setFormData(prev => ({ ...prev, payId: e.target.value }))}
                        required={isDualTypeFieldRequired(formData.providerName, formData.type, 'payId')}
                        helperText={getDualTypeFieldHelper(formData.providerName, formData.type, 'payId')}
                        InputProps={{
                          readOnly: formData.providerName === 'passpay' // PassPay的PayID自动设置
                        }}
                      />
                    </Grid>
                  )}

                  {shouldShowDualTypeField(formData.providerName, formData.type, 'mchNo') && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={getDualTypeFieldLabel(formData.providerName, formData.type, 'mchNo')}
                        value={formData.mchNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, mchNo: e.target.value }))}
                        required={isDualTypeFieldRequired(formData.providerName, formData.type, 'mchNo')}
                        helperText={getDualTypeFieldHelper(formData.providerName, formData.type, 'mchNo')}
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={getDualTypeFieldLabel(formData.providerName, formData.type, 'secretKey')}
                      type="password"
                      value={formData.secretKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                      required={isDualTypeFieldRequired(formData.providerName, formData.type, 'secretKey')}
                      helperText={getDualTypeFieldHelper(formData.providerName, formData.type, 'secretKey')}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>环境</InputLabel>
                      <Select
                        value={formData.environment}
                        label="环境"
                        onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value }))}
                      >
                        <MenuItem value="sandbox">测试环境</MenuItem>
                        <MenuItem value="production">生产环境</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="优先级"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.status === 'active'}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            status: e.target.checked ? 'active' : 'inactive' 
                          }))}
                        />
                      }
                      label="启用此配置"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="描述"
                      multiline
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="可选的配置描述信息"
                    />
                  </Grid>

                  {/* 显示配置说明 */}
                  {getProviderTypeConfig(formData.providerName, formData.type)?.specialNotes && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          {formData.type === 'native' ? '原生通道' : '唤醒通道'}配置说明：
                        </Typography>
                        <List dense>
                          {getProviderTypeConfig(formData.providerName, formData.type)?.specialNotes?.map((note, index) => (
                            <ListItem key={index} sx={{ py: 0, px: 0 }}>
                              <Typography variant="body2">{note}</Typography>
                            </ListItem>
                          ))}
                        </List>
                      </Alert>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.accountName || !formData.providerName}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}