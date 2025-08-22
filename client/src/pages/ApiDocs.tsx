import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Api as ApiIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Payment as PaymentIcon,
  Notifications as NotificationsIcon,
  QueryStats as QueryStatsIcon,
} from '@mui/icons-material';

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
      id={`api-tabpanel-${index}`}
      aria-labelledby={`api-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ApiDocs = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
        CashGit 商户API对接文档
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body1">
          欢迎使用CashGit支付平台！本文档将帮助您快速集成我们的支付服务，支持UPI充值、银行代付等功能。
        </Typography>
      </Alert>

      {/* 基础信息 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          基础信息
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>生产环境</Typography>
              <Typography variant="body2" color="text.secondary">
                Base URL: <code>https://cashgit.com/api</code>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                协议: HTTPS
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>沙箱环境</Typography>
              <Typography variant="body2" color="text.secondary">
                Base URL: <code>https://sandbox.cashgit.com/api</code>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                协议: HTTPS
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* 认证方式 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          认证方式
        </Typography>
        <Typography variant="body1" paragraph>
          所有API请求都需要在Header中包含您的API Key进行身份验证：
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
          X-API-Key: your_api_key_here
        </Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          请妥善保管您的API Key，不要泄露给第三方。如果怀疑泄露，请立即联系客服重置。
        </Alert>
      </Paper>

      {/* API接口导航 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ApiIcon color="primary" />
          API接口
        </Typography>
        
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="API接口导航">
          <Tab label="代收充值" icon={<PaymentIcon />} />
          <Tab label="代付提现" icon={<PaymentIcon />} />
          <Tab label="订单查询" icon={<QueryStatsIcon />} />
          <Tab label="回调通知" icon={<NotificationsIcon />} />
        </Tabs>

        {/* 代收充值接口 */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>1. 创建代收订单</Typography>
          <Typography variant="body2" paragraph>
            为玩家创建充值订单，返回支付链接
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>接口地址</Typography>
            <code>POST /api/payment/create</code>
          </Paper>

          <Typography variant="subtitle1" gutterBottom>请求参数</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>参数名</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>必填</TableCell>
                  <TableCell>说明</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>merchantId</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>商户ID</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>amount</TableCell>
                  <TableCell>integer</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>充值金额（分）</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>currency</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>货币代码，默认INR</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>customerEmail</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>玩家邮箱</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>customerPhone</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>玩家手机号</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>returnUrl</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>支付完成后的跳转URL</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>notifyUrl</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>异步通知URL</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>description</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>订单描述</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" gutterBottom>请求示例</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', mb: 2 }}>
{`{
  "merchantId": "MERCHANT_001",
  "amount": 10000,
  "currency": "INR",
  "customerEmail": "player@example.com",
  "customerPhone": "919876543210",
  "returnUrl": "https://yourgame.com/payment/return",
  "notifyUrl": "https://yourgame.com/payment/notify",
  "description": "Rummy game deposit"
}`}
          </Box>

          <Typography variant="subtitle1" gutterBottom>响应示例</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
{`{
  "success": true,
  "data": {
    "orderId": "ORD1234567890",
    "paymentUrl": "https://cashgit.com/pay/abc123",
    "amount": 10000,
    "currency": "INR",
    "status": "PENDING",
    "expiresAt": "2024-01-15T10:30:00Z"
  }
}`}
          </Box>
        </TabPanel>

        {/* 代付提现接口 */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>2. 创建代付订单</Typography>
          <Typography variant="body2" paragraph>
            为玩家创建提现订单，将资金转入指定银行账户
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>接口地址</Typography>
            <code>POST /api/payment/withdraw</code>
          </Paper>

          <Typography variant="subtitle1" gutterBottom>请求参数</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>参数名</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>必填</TableCell>
                  <TableCell>说明</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>merchantId</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>商户ID</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>amount</TableCell>
                  <TableCell>integer</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>提现金额（分）</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>currency</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>货币代码，默认INR</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>bankAccount</TableCell>
                  <TableCell>object</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>银行账户信息</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>customerEmail</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>玩家邮箱</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>customerPhone</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>玩家手机号</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>notifyUrl</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>异步通知URL</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" gutterBottom>银行账户信息结构</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', mb: 2 }}>
{`{
  "accountNumber": "1234567890",
  "ifscCode": "SBIN0001234",
  "accountHolderName": "Player Name",
  "bankName": "State Bank of India"
}`}
          </Box>

          <Typography variant="subtitle1" gutterBottom>请求示例</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
{`{
  "merchantId": "MERCHANT_001",
  "amount": 50000,
  "currency": "INR",
  "bankAccount": {
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234",
    "accountHolderName": "Player Name",
    "bankName": "State Bank of India"
  },
  "customerEmail": "player@example.com",
  "customerPhone": "919876543210",
  "notifyUrl": "https://yourgame.com/withdraw/notify"
}`}
          </Box>
        </TabPanel>

        {/* 订单查询接口 */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>3. 查询订单状态</Typography>
          <Typography variant="body2" paragraph>
            查询订单的当前状态和详细信息
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>接口地址</Typography>
            <code>GET /api/payment/status/:orderId</code>
          </Paper>

          <Typography variant="subtitle1" gutterBottom>请求参数</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>参数名</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>必填</TableCell>
                  <TableCell>说明</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>orderId</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>是</TableCell>
                  <TableCell>订单ID（路径参数）</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" gutterBottom>响应示例</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
{`{
  "success": true,
  "data": {
    "orderId": "ORD1234567890",
    "merchantId": "MERCHANT_001",
    "type": "DEPOSIT",
    "amount": 10000,
    "currency": "INR",
    "status": "SUCCESS",
    "provider": {
      "name": "passpay",
      "transactionId": "TXN_123456"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:05:00Z",
    "paidAt": "2024-01-15T10:05:00Z"
  }
}`}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>4. 批量查询订单</Typography>
          <Typography variant="body2" paragraph>
            分页查询商户的订单列表
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>接口地址</Typography>
            <code>GET /api/payment/orders</code>
          </Paper>

          <Typography variant="subtitle1" gutterBottom>查询参数</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>参数名</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>必填</TableCell>
                  <TableCell>说明</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>page</TableCell>
                  <TableCell>integer</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>页码，默认1</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>limit</TableCell>
                  <TableCell>integer</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>每页数量，默认10，最大100</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>status</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>订单状态筛选</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>type</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>订单类型筛选</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>startDate</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>开始日期（YYYY-MM-DD）</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>endDate</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>否</TableCell>
                  <TableCell>结束日期（YYYY-MM-DD）</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>5. 查询商户余额</Typography>
          <Typography variant="body2" paragraph>
            查询商户账户的当前余额和额度信息
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>接口地址</Typography>
            <code>GET /api/merchant/balance</code>
          </Paper>

          <Typography variant="subtitle1" gutterBottom>请求参数</Typography>
          <Typography variant="body2" paragraph>
            无需参数，系统会自动识别当前商户身份
          </Typography>

          <Typography variant="subtitle1" gutterBottom>响应示例</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
{`{
  "success": true,
  "data": {
    "merchantId": "MERCHANT_001",
    "balance": 1500000,
    "currency": "INR",
    "limits": {
      "dailyLimit": 10000000,
      "monthlyLimit": 100000000,
      "singleTransactionLimit": 5000000
    },
    "usage": {
      "dailyUsed": 2500000,
      "monthlyUsed": 15000000,
      "lastResetDate": "2024-01-01"
    },
    "lastUpdate": "2024-01-15T10:00:00Z"
  }
}`}
          </Box>
        </TabPanel>

        {/* 回调通知接口 */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>6. 异步回调通知</Typography>
          <Typography variant="body2" paragraph>
            当订单状态发生变化时，系统会向您配置的notifyUrl发送POST请求
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            回调通知采用重试机制，如果您的服务器返回非200状态码，系统会在5分钟、15分钟、30分钟后重试，最多重试3次。
          </Alert>

          <Typography variant="subtitle1" gutterBottom>回调请求格式</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', mb: 2 }}>
{`POST /your-notify-url
Content-Type: application/json
X-Signature: signature_here

{
  "orderId": "ORD1234567890",
  "merchantId": "MERCHANT_001",
  "status": "SUCCESS",
  "amount": 10000,
  "currency": "INR",
  "providerTransactionId": "TXN_123456",
  "timestamp": "2024-01-15T10:05:00Z",
  "signature": "calculated_signature"
}`}
          </Box>

          <Typography variant="subtitle1" gutterBottom>回调参数说明</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>参数名</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>说明</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>orderId</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>订单ID</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>merchantId</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>商户ID</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>status</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>订单状态</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>amount</TableCell>
                  <TableCell>integer</TableCell>
                  <TableCell>订单金额（分）</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>currency</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>货币代码</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>providerTransactionId</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>支付商交易ID</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>timestamp</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>时间戳</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>signature</TableCell>
                  <TableCell>string</TableCell>
                  <TableCell>签名验证</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" gutterBottom>回调响应要求</Typography>
          <Typography variant="body2" paragraph>
            您的服务器收到回调后，必须返回HTTP 200状态码和以下JSON格式：
          </Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
{`{
  "success": true,
  "message": "received"
}`}
          </Box>
        </TabPanel>
      </Paper>

      {/* 状态码说明 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="primary" />
          状态码说明
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>订单状态</Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><Chip label="PENDING" size="small" color="warning" /></ListItemIcon>
                <ListItemText primary="待处理" secondary="订单已创建，等待用户支付" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="PROCESSING" size="small" color="info" /></ListItemIcon>
                <ListItemText primary="处理中" secondary="用户已支付，正在处理" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="SUCCESS" size="small" color="success" /></ListItemIcon>
                <ListItemText primary="成功" secondary="支付成功，资金已到账" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="FAILED" size="small" color="error" /></ListItemIcon>
                <ListItemText primary="失败" secondary="支付失败" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="CANCELLED" size="small" color="default" /></ListItemIcon>
                <ListItemText primary="已取消" secondary="用户或系统取消" />
              </ListItem>
            </List>
          </Box>
          
          <Box>
            <Typography variant="h6" gutterBottom>HTTP状态码</Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><Chip label="200" size="small" color="success" /></ListItemIcon>
                <ListItemText primary="成功" secondary="请求处理成功" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="400" size="small" color="warning" /></ListItemIcon>
                <ListItemText primary="请求错误" secondary="参数错误或验证失败" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="401" size="small" color="error" /></ListItemIcon>
                <ListItemText primary="认证失败" secondary="API Key无效或过期" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="403" size="small" color="error" /></ListItemIcon>
                <ListItemText primary="权限不足" secondary="没有访问该接口的权限" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Chip label="500" size="small" color="error" /></ListItemIcon>
                <ListItemText primary="服务器错误" secondary="系统内部错误" />
              </ListItem>
            </List>
          </Box>
        </Box>
      </Paper>

      {/* 错误码说明 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>错误码说明</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>错误码</TableCell>
                <TableCell>说明</TableCell>
                <TableCell>解决方案</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>INVALID_API_KEY</TableCell>
                <TableCell>API Key无效</TableCell>
                <TableCell>检查API Key是否正确，联系客服重置</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>INSUFFICIENT_BALANCE</TableCell>
                <TableCell>余额不足</TableCell>
                <TableCell>充值账户余额</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>DAILY_LIMIT_EXCEEDED</TableCell>
                <TableCell>超出日限额</TableCell>
                <TableCell>等待次日或联系客服调整限额</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>INVALID_AMOUNT</TableCell>
                <TableCell>金额无效</TableCell>
                <TableCell>检查金额是否在允许范围内</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>INVALID_BANK_ACCOUNT</TableCell>
                <TableCell>银行账户信息无效</TableCell>
                <TableCell>检查IFSC代码和账户号码</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 集成示例 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>集成示例</Typography>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Node.js 示例</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
{`const axios = require('axios');

class CashGitAPI {
  constructor(apiKey, baseUrl = 'https://cashgit.com/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async createOrder(orderData) {
    try {
      const response = await axios.post(\`\${this.baseUrl}/payment/create\`, orderData, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || '创建订单失败');
    }
  }

  async getOrderStatus(orderId) {
    try {
      const response = await axios.get(\`\${this.baseUrl}/payment/status/\${orderId}\`, {
        headers: {
          'X-API-Key': this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || '查询订单失败');
    }
  }
}

// 使用示例
const cashgit = new CashGitAPI('your_api_key_here');
cashgit.createOrder({
  merchantId: 'MERCHANT_001',
  amount: 10000,
  customerEmail: 'player@example.com',
  customerPhone: '919876543210',
  returnUrl: 'https://yourgame.com/payment/return'
}).then(result => {
  console.log('订单创建成功:', result);
}).catch(error => {
  console.error('订单创建失败:', error);
});`}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">PHP 示例</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
{`<?php
class CashGitAPI {
    private $apiKey;
    private $baseUrl;

    public function __construct($apiKey, $baseUrl = 'https://cashgit.com/api') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }

    public function createOrder($orderData) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->baseUrl . '/payment/create');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            return json_decode($response, true);
        } else {
            throw new Exception('创建订单失败: ' . $response);
        }
    }
}

// 使用示例
try {
    $cashgit = new CashGitAPI('your_api_key_here');
    $result = $cashgit->createOrder([
        'merchantId' => 'MERCHANT_001',
        'amount' => 10000,
        'customerEmail' => 'player@example.com',
        'customerPhone' => '919876543210',
        'returnUrl' => 'https://yourgame.com/payment/return'
    ]);
    echo "订单创建成功: " . json_encode($result);
} catch (Exception $e) {
    echo "订单创建失败: " . $e->getMessage();
}
?>`}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* 联系信息 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>技术支持</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>联系方式</Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="技术支持邮箱" 
                  secondary="support@cashgit.com"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="商务合作" 
                  secondary="business@cashgit.com"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="紧急联系" 
                  secondary="+91 98765 43210"
                />
              </ListItem>
            </List>
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom>文档更新</Typography>
            <Typography variant="body2" paragraph>
              本文档会定期更新，请关注最新版本。如有疑问或建议，请及时联系我们的技术支持团队。
            </Typography>
            <Typography variant="body2" color="text.secondary">
              最后更新时间: 2024年1月15日
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ApiDocs;
