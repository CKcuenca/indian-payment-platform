import React, { useState } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Smartphone,
  AccountBalanceWallet
} from '@mui/icons-material';


// 支付账户类型定义
interface PaymentAccount {
  _id: string;
  accountName: string;
  provider: {
    name: string;
    type: string;
    subType: string;
    accountId: string;
    apiKey: string;
    secretKey: string;
    environment: string;
    // UniSpay专用字段
    mchNo?: string;
  };
  description: string;
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    singleTransactionLimit: number;
    minTransactionAmount: number;
  };
  fees: {
    transactionFee: number;
    fixedFee: number;
  };
  priority: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentManagementNew() {
  const [error, setError] = useState<string | null>(null);
  
  // 支付账户状态
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 获取支付账户列表
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: 替换为真实的API调用
      // const response = await api.get('/payment-config');
      // if (response.data.success) {
      //   setAccounts(response.data.data);
      // }
      
      // 临时设置为空数组，等待API集成
      setAccounts([]);
      
    } catch (err: any) {
      setError(err.message || '获取支付账户失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 组件加载时获取数据
  React.useEffect(() => {
    fetchAccounts();
  }, []);
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState({
    accountName: '',
    providerName: '',
    type: 'native',
    subType: 'third_party', // 新增：子类型 (third_party, fourth_party)
    accountId: '',
    apiKey: '',
    secretKey: '',
    environment: 'sandbox',
    // UniSpay专用字段
    mchNo: '',
    description: '',
    dailyLimit: 1000000,
    monthlyLimit: 10000000,
    singleTransactionLimit: 100000,
    minTransactionAmount: 100,
    transactionFee: 0.5,
    fixedFee: 0,
    priority: 1,
    status: 'ACTIVE'
  });



  const handleAddAccount = () => {
    setEditingAccount(null);
    setFormData({
      accountName: '',
      providerName: '',
      type: 'native',
      subType: 'third_party',
      accountId: '',
      apiKey: '',
      secretKey: '',
      environment: 'sandbox',
      // UniSpay专用字段
      mchNo: '',
      description: '',
      dailyLimit: 1000000,
      monthlyLimit: 10000000,
      singleTransactionLimit: 100000,
      minTransactionAmount: 100,
      transactionFee: 0.5,
      fixedFee: 0,
      priority: 1,
      status: 'ACTIVE'
    });
    setDialogOpen(true);
  };

  const handleEdit = (account: PaymentAccount) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.accountName,
      providerName: account.provider.name,
      type: account.provider.type,
      subType: account.provider.subType || 'third_party', // 从账户数据获取子类型，如果没有则默认为third_party
      accountId: account.provider.accountId,
      apiKey: account.provider.apiKey,
      secretKey: account.provider.secretKey,
      environment: account.provider.environment,
      // UniSpay专用字段
      mchNo: account.provider.mchNo || '',
      description: account.description || '',
      dailyLimit: account.limits.dailyLimit,
      monthlyLimit: account.limits.monthlyLimit,
      singleTransactionLimit: account.limits.singleTransactionLimit,
      minTransactionAmount: account.limits.minTransactionAmount,
      transactionFee: account.fees.transactionFee,
      fixedFee: account.fees.fixedFee,
      priority: account.priority,
      status: account.status
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const accountData = {
        accountName: formData.accountName,
        provider: {
          name: formData.providerName,
          type: formData.type,
          subType: formData.subType, // 添加子类型
          accountId: formData.accountId,
          apiKey: formData.apiKey,
          secretKey: formData.secretKey,
          environment: formData.environment,
          // UniSpay专用字段
          mchNo: formData.mchNo
        },
        description: formData.description,
        limits: {
          dailyLimit: formData.dailyLimit,
          monthlyLimit: formData.monthlyLimit,
          singleTransactionLimit: formData.singleTransactionLimit,
          minTransactionAmount: formData.minTransactionAmount
        },
        fees: {
          transactionFee: formData.transactionFee,
          fixedFee: formData.fixedFee
        },
        priority: formData.priority,
        status: formData.status
      };

      if (editingAccount) {
        // 更新现有账户
        setAccounts(prev => prev.map(account => 
          account._id === editingAccount._id 
            ? { ...account, ...accountData, updatedAt: new Date().toISOString() }
            : account
        ));
      } else {
        // 添加新账户
        const newAccount = {
          _id: Date.now().toString(),
          ...accountData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setAccounts(prev => [...prev, newAccount]);
      }
      
      setDialogOpen(false);
      setError(null);
    } catch (err) {
      setError('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (accountId: string) => {
    if (window.confirm('确定要删除这个支付账户吗？')) {
      try {
        setError(null);
        
        // TODO: 调用删除API
        // await api.delete(`/payment-config/${accountId}`);
        
        // 临时从本地状态中删除
        setAccounts(prev => prev.filter(account => account._id !== accountId));
        
      } catch (err: any) {
        setError(err.message || '删除失败');
      }
    }
  };



  const getProviderColor = (providerName: string) => {
    const colors: {[key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'} = {
      // 3方支付商
      'airpay': 'primary',
      'cashfree': 'secondary',
      'razorpay': 'success',
      'paytm': 'warning',
      // 4方平台
      'passpay': 'info',
      '4party_platform1': 'info',
      '4party_platform2': 'info',
      '4party_platform3': 'info',
      // 唤醒支付商
      'unispay': 'error'
    };
    return colors[providerName.toLowerCase()] || 'default';
  };

  const getTypeLabel = (type: string) => {
    const labels: {[key: string]: string} = {
      'native': '原生',
      'wakeup': '唤醒'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'wakeup') {
      return <Smartphone color="primary" />;
    }
    return <AccountBalanceWallet color="secondary" />;
  };



  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          支付管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAccount}
          sx={{ borderRadius: 2 }}
        >
          添加支付账户
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}



      {/* 支付账户列表 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          支付账户管理
        </Typography>
        
        {accounts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无支付账户
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              点击上方"添加支付账户"按钮开始配置
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>账户名称</TableCell>
                  <TableCell>支付商</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>环境</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>优先级</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account._id}>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={account.provider.name}
                            color={getProviderColor(account.provider.name)}
                            size="small"
                          />
                          {account.provider.type === 'native' && (
                            <Chip
                              label={account.provider.subType === 'third_party' ? '3方' : '4方'}
                              color={account.provider.subType === 'third_party' ? 'success' : 'info'}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        {/* 显示UniSpay的商户号信息 */}
                        {account.provider.name === 'unispay' && account.provider.mchNo && (
                          <Typography variant="caption" color="text.secondary">
                            商户号: {account.provider.mchNo}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTypeIcon(account.provider.type)}
                        <Typography variant="body2">
                          {getTypeLabel(account.provider.type)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.provider.environment}
                        color={account.provider.environment === 'production' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={account.status}
                        color={account.status === 'ACTIVE' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{account.priority}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small" onClick={() => handleEdit(account)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(account._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* 添加/编辑账户对话框 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          pb: 2,
          flexShrink: 0,
          backgroundColor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          <Typography variant="h6" component="div">
            {editingAccount ? '编辑支付账户' : '添加支付账户'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={() => setDialogOpen(false)}
              variant="outlined"
              size="small"
            >
              取消
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
              size="small"
              form="payment-account-form"
            >
              {loading ? <CircularProgress size={16} /> : '保存'}
            </Button>
          </Box>
        </DialogTitle>
        <form id="payment-account-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 基本信息 */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  基本信息
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="账户名称"
                    value={formData.accountName}
                    onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth required>
                    <InputLabel>支付商类型</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        console.log('选择支付商类型:', newType);
                        
                        setFormData(prev => {
                          const currentProvider = prev.providerName;
                          
                          // 检查当前选中的支付商是否在新类型中可用
                          let shouldResetProvider = false;
                          if (newType === 'native') {
                            shouldResetProvider = !['airpay', 'cashfree', 'razorpay', 'paytm', 'passpay', '4party_platform1', '4party_platform2', '4party_platform3'].includes(currentProvider);
                          } else if (newType === 'wakeup') {
                            shouldResetProvider = !['unispay'].includes(currentProvider);
                          }
                          
                          const newState = {
                            ...prev, 
                            type: newType, 
                            subType: newType === 'wakeup' ? 'wakeup' : 'third_party', // 重置子类型
                            providerName: shouldResetProvider ? '' : currentProvider
                          };
                          
                          console.log('类型切换后新状态:', newState);
                          return newState;
                        });
                      }}
                    >
                      <MenuItem value="native">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccountBalanceWallet color="secondary" />
                          原生支付商
                        </Box>
                      </MenuItem>
                      <MenuItem value="wakeup">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Smartphone color="primary" />
                          唤醒支付商
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                {/* 原生支付商的子类型选择 */}
                {formData.type === 'native' && (
                  <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                    <FormControl fullWidth required>
                      <InputLabel>分支类型</InputLabel>
                      <Select
                        value={formData.subType}
                        onChange={(e) => {
                          const newSubType = e.target.value;
                          console.log('选择分支类型:', newSubType);
                          
                          setFormData(prev => {
                            const currentProvider = prev.providerName;
                            
                            // 检查当前选中的支付商是否在新子类型中可用
                            let shouldResetProvider = false;
                            if (newSubType === 'third_party') {
                              shouldResetProvider = !['airpay', 'cashfree', 'razorpay', 'paytm'].includes(currentProvider);
                            } else if (newSubType === 'fourth_party') {
                              shouldResetProvider = !['passpay', '4party_platform1', '4party_platform2', '4party_platform3'].includes(currentProvider);
                            }
                            
                            const newState = {
                              ...prev,
                              subType: newSubType,
                              providerName: shouldResetProvider ? '' : currentProvider
                            };
                            
                            console.log('分支类型切换后新状态:', newState);
                            return newState;
                          });
                        }}
                      >
                        <MenuItem value="third_party">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountBalanceWallet color="primary" />
                            3方支付商
                          </Box>
                        </MenuItem>
                        <MenuItem value="fourth_party">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountBalanceWallet color="secondary" />
                            4方平台
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth required>
                    <InputLabel>支付商</InputLabel>
                    <Select
                      value={formData.providerName}
                      onChange={(e) => {
                        const selectedProvider = e.target.value;
                        console.log('选择支付商:', selectedProvider);
                        console.log('选择前状态:', formData);
                        
                        setFormData(prev => {
                          const newState = { ...prev, providerName: selectedProvider };
                          console.log('选择后新状态:', newState);
                          return newState;
                        });
                      }}
                      disabled={!formData.type || !formData.subType}
                    >
                      {formData.type === 'native' ? (
                        formData.subType === 'third_party' ? [
                          <MenuItem key="airpay" value="airpay">AirPay (3方)</MenuItem>,
                          <MenuItem key="cashfree" value="cashfree">CashFree (3方)</MenuItem>,
                          <MenuItem key="razorpay" value="razorpay">Razorpay (3方)</MenuItem>,
                          <MenuItem key="paytm" value="paytm">Paytm (3方)</MenuItem>
                        ] : formData.subType === 'fourth_party' ? [
                          <MenuItem key="passpay" value="passpay">PassPay (4方平台)</MenuItem>,
                          <MenuItem key="4party_platform1" value="4party_platform1">4方平台1 (统一API)</MenuItem>,
                          <MenuItem key="4party_platform2" value="4party_platform2">4方平台2 (统一API)</MenuItem>,
                          <MenuItem key="4party_platform3" value="4party_platform3">4方平台3 (统一API)</MenuItem>
                        ] : [
                          <MenuItem key="no-subtype" value="" disabled>请先选择分支类型</MenuItem>
                        ]
                      ) : formData.type === 'wakeup' ? [
                        <MenuItem key="unispay" value="unispay">UniSpay (唤醒)</MenuItem>
                      ] : [
                        <MenuItem key="no-type" value="" disabled>请先选择支付商类型</MenuItem>
                      ]}
                    </Select>
                    {/* 调试信息 */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      当前类型: {formData.type} | 子类型: {formData.subType} | 支付商: {formData.providerName || '未选择'}
                    </Typography>
                  </FormControl>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth required>
                    <InputLabel>环境</InputLabel>
                    <Select
                      value={formData.environment}
                      onChange={(e) => setFormData({...formData, environment: e.target.value})}
                    >
                      <MenuItem value="sandbox">沙箱环境</MenuItem>
                      <MenuItem value="production">生产环境</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* 配置信息 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  配置信息
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="账户ID"
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    required
                  />
                </Box>
                
                {/* API密钥 - 除了UniSpay外都需要 */}
                {formData.providerName !== 'unispay' && (
                  <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                    <TextField
                      fullWidth
                      label="API密钥 (用于身份认证)"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                      helperText="用于API身份认证，UniSpay不需要"
                      required
                    />
                  </Box>
                )}
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="密钥 (用于签名验证)"
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({...formData, secretKey: e.target.value})}
                    helperText="用于API签名验证，请保密"
                    required
                  />
                </Box>
                
                {/* UniSpay专用字段 - 仅在选择UniSpay时显示 */}
                {formData.providerName === 'unispay' && (
                  <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                    <TextField
                      fullWidth
                      label="商户号 (mchNo)"
                      value={formData.mchNo}
                      onChange={(e) => setFormData({...formData, mchNo: e.target.value})}
                      helperText="UniSpay提供的商户号，用于API调用"
                      required
                    />
                  </Box>
                )}
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="优先级"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Box>
              </Box>

              {/* 限额配置 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  限额配置
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="日限额"
                    type="number"
                    value={formData.dailyLimit}
                    onChange={(e) => setFormData({...formData, dailyLimit: parseInt(e.target.value)})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="月限额"
                    type="number"
                    value={formData.monthlyLimit}
                    onChange={(e) => setFormData({...formData, monthlyLimit: parseInt(e.target.value)})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="单笔限额"
                    type="number"
                    value={formData.singleTransactionLimit}
                    onChange={(e) => setFormData({...formData, singleTransactionLimit: parseInt(e.target.value)})}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="最小交易金额"
                    type="number"
                    value={formData.minTransactionAmount}
                    onChange={(e) => setFormData({...formData, minTransactionAmount: parseInt(e.target.value)})}
                    required
                  />
                </Box>
              </Box>

              {/* 费率配置 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  费率配置
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="交易费率 (%)"
                    type="number"
                    value={formData.transactionFee}
                    onChange={(e) => setFormData({...formData, transactionFee: parseFloat(e.target.value)})}
                    inputProps={{ step: 0.01, min: 0 }}
                    required
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="固定费用"
                    type="number"
                    value={formData.fixedFee}
                    onChange={(e) => setFormData({...formData, fixedFee: parseFloat(e.target.value)})}
                    inputProps={{ step: 0.01, min: 0 }}
                  />
                </Box>
              </Box>

              {/* 状态配置 */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  状态配置
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.status === 'ACTIVE'}
                        onChange={(e) => setFormData({
                          ...formData, 
                          status: e.target.checked ? 'ACTIVE' : 'INACTIVE'
                        })}
                      />
                    }
                    label="启用账户"
                  />
                </Box>
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="描述"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </Box>

            </Box>
          </DialogContent>
        </form>
      </Dialog>
    </Box>
  );
}
