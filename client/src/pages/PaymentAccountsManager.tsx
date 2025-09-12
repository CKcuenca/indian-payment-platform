import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

import api from '../services/api';

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
  };
  status: 'active' | 'inactive';
  environment: string;
  description?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// 字段配置接口
interface FieldConfig {
  label: string;
  required: boolean;
  type?: string;
  defaultValue?: string;
  readOnly?: boolean;
}

// 支持双类型的支付商配置
const DUAL_TYPE_PROVIDERS = {
  passpay: {
    name: 'passpay',
    displayName: 'PassPay',
    supportedTypes: ['native', 'wakeup'] as const,
    fields: {
      native: {
        accountId: { label: '原生商户号', required: true },
        payId: { label: 'PayID', required: true, defaultValue: '12', readOnly: true },
        secretKey: { label: '原生密钥', required: true, type: 'password' }
      } as Record<string, FieldConfig>,
      wakeup: {
        accountId: { label: '唤醒商户号', required: true },
        payId: { label: 'PayID', required: true, defaultValue: '10', readOnly: true },
        secretKey: { label: '唤醒密钥', required: true, type: 'password' }
      } as Record<string, FieldConfig>
    }
  },
  dhpay: {
    name: 'dhpay',
    displayName: 'DhPay',
    supportedTypes: ['native', 'wakeup'] as const,
    fields: {
      native: {
        accountId: { label: '原生商户ID', required: true },
        secretKey: { label: '原生密钥', required: true, type: 'password' }
      } as Record<string, FieldConfig>,
      wakeup: {
        accountId: { label: '唤醒商户ID', required: true },
        secretKey: { label: '唤醒密钥', required: true, type: 'password' }
      } as Record<string, FieldConfig>
    }
  },
  unispay: {
    name: 'unispay',
    displayName: 'UniSpay',
    supportedTypes: ['native', 'wakeup'] as const,
    fields: {
      native: {
        mchNo: { label: '原生商户号', required: true },
        secretKey: { label: '原生密钥', required: true, type: 'password' }
      } as Record<string, FieldConfig>,
      wakeup: {
        mchNo: { label: '唤醒商户号', required: true },
        secretKey: { label: '唤醒密钥', required: true, type: 'password' }
      } as Record<string, FieldConfig>
    }
  }
};

export default function PaymentAccountsManager() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  
  const [formData, setFormData] = useState({
    accountName: '',
    providerName: '',
    type: 'native' as 'native' | 'wakeup',
    accountId: '',
    payId: '',
    secretKey: '',
    mchNo: '',
    environment: 'production',
    description: '',
    priority: 1,
    status: 'active' as 'active' | 'inactive'
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

      const saveData = {
        accountName: formData.accountName,
        provider: {
          name: formData.providerName,
          type: formData.type,
          subType: formData.type === 'native' ? 'third_party' : 'wakeup',
          ...(formData.accountId && { accountId: formData.accountId }),
          ...(formData.payId && { payId: formData.payId }),
          ...(formData.secretKey && { secretKey: formData.secretKey }),
          ...(formData.mchNo && { mchNo: formData.mchNo })
        },
        environment: formData.environment,
        description: formData.description,
        priority: formData.priority,
        status: formData.status
      };

      if (editingAccount) {
        await api.put(`/api/payment-config/${editingAccount._id}`, saveData);
      } else {
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
    if (!window.confirm('确认删除此支付配置吗？')) return;
    
    try {
      await api.delete(`/api/payment-config/${account._id}`);
      loadAccounts();
    } catch (error: any) {
      console.error('删除失败:', error);
      setError(error.response?.data?.error || '删除失败');
    }
  };

  // 支付商变化处理
  const handleProviderChange = (provider: string) => {
    const providerConfig = DUAL_TYPE_PROVIDERS[provider as keyof typeof DUAL_TYPE_PROVIDERS];
    if (providerConfig) {
      const defaultType = providerConfig.supportedTypes[0];
      const typeFields = providerConfig.fields[defaultType];
      
      setFormData(prev => ({
        ...prev,
        providerName: provider,
        type: defaultType,
        payId: 'payId' in typeFields ? (typeFields as any).payId?.defaultValue || '' : '',
        accountId: '',
        secretKey: '',
        mchNo: ''
      }));
    }
  };

  // 类型变化处理
  const handleTypeChange = (type: 'native' | 'wakeup') => {
    const providerConfig = DUAL_TYPE_PROVIDERS[formData.providerName as keyof typeof DUAL_TYPE_PROVIDERS];
    if (providerConfig && providerConfig.supportedTypes.includes(type)) {
      const typeFields = providerConfig.fields[type];
      
      setFormData(prev => ({
        ...prev,
        type,
        payId: 'payId' in typeFields ? (typeFields as any).payId?.defaultValue || '' : prev.payId,
        accountId: '',
        secretKey: '',
        mchNo: ''
      }));
    }
  };

  // 切换密钥显示
  const toggleSecretVisibility = (accountId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const getCurrentProviderConfig = () => {
    return DUAL_TYPE_PROVIDERS[formData.providerName as keyof typeof DUAL_TYPE_PROVIDERS];
  };

  const getCurrentTypeFields = (): Record<string, FieldConfig> | undefined => {
    const providerConfig = getCurrentProviderConfig();
    return providerConfig?.fields[formData.type];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          支付账户管理 (双类型)
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
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>账户名称</TableCell>
              <TableCell>支付商</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>环境</TableCell>
              <TableCell>配置参数</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  暂无支付配置
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account._id}>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {account.accountName}
                    </Typography>
                    {account.description && (
                      <Typography variant="body2" color="text.secondary">
                        {account.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={
                      DUAL_TYPE_PROVIDERS[account.provider.name as keyof typeof DUAL_TYPE_PROVIDERS]?.displayName || 
                      account.provider.name
                    } size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={account.provider.type === 'native' ? '原生' : '唤醒'}
                      color={account.provider.type === 'native' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={account.status === 'active' ? '启用' : '禁用'}
                      color={account.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{account.environment}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {account.provider.accountId && (
                        <Typography variant="body2">
                          商户号: ***{account.provider.accountId.slice(-4)}
                        </Typography>
                      )}
                      {account.provider.payId && (
                        <Typography variant="body2">
                          PayID: {account.provider.payId}
                        </Typography>
                      )}
                      {account.provider.mchNo && (
                        <Typography variant="body2">
                          mchNo: ***{account.provider.mchNo.slice(-4)}
                        </Typography>
                      )}
                      {account.provider.secretKey && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            密钥: {showSecrets[account._id] ? account.provider.secretKey : '***'}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => toggleSecretVisibility(account._id)}
                            startIcon={showSecrets[account._id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          >
                            {showSecrets[account._id] ? '隐藏' : '显示'}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
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
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 配置对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAccount ? '编辑支付配置' : '添加支付配置'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="账户名称"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>支付商</InputLabel>
              <Select
                value={formData.providerName}
                label="支付商"
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {Object.values(DUAL_TYPE_PROVIDERS).map((config) => (
                  <MenuItem key={config.name} value={config.name}>
                    {config.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.providerName && getCurrentProviderConfig() && (
              <FormControl fullWidth required>
                <InputLabel>通道类型</InputLabel>
                <Select
                  value={formData.type}
                  label="通道类型"
                  onChange={(e) => handleTypeChange(e.target.value as 'native' | 'wakeup')}
                >
                  {getCurrentProviderConfig()?.supportedTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type === 'native' ? '原生通道' : '唤醒通道'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* 动态字段渲染 */}
            {formData.providerName && formData.type && getCurrentTypeFields() && (
              <>
                {Object.entries(getCurrentTypeFields()!).map(([fieldName, fieldConfig]) => (
                  <TextField
                    key={fieldName}
                    fullWidth
                    label={fieldConfig.label}
                    type={fieldConfig.type || 'text'}
                    value={formData[fieldName as keyof typeof formData] as string}
                    onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
                    required={fieldConfig.required}
                    InputProps={{
                      readOnly: fieldConfig.readOnly
                    }}
                  />
                ))}
              </>
            )}

            <Divider />

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

            <TextField
              fullWidth
              label="优先级"
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              inputProps={{ min: 1, max: 10 }}
            />

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

            <TextField
              fullWidth
              label="描述"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="可选的配置描述信息"
            />

            {formData.providerName && formData.type && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{formData.type === 'native' ? '原生通道' : '唤醒通道'}配置说明：</strong>
                  <br />
                  • 不同通道类型需要使用独立的商户参数
                  <br />
                  • 请根据{getCurrentProviderConfig()?.displayName}提供的文档填写对应参数
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
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