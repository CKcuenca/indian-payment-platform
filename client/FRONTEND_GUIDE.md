# 前端管理后台使用指南

## 访问地址
- 前端管理后台: http://localhost:3001
- 后端API: http://localhost:3000

## 登录信息
- API密钥: `pk_rzz8igydcme01uhm7`
- 商户ID: `MERCHANT_ME01UHM7`

## 功能说明

### 1. 仪表板 (/)
- 显示商户基本信息
- 显示余额统计
- 显示最近交易趋势图表

### 2. 订单管理 (/orders)
- 查看所有订单
- 按类型和状态筛选
- 查看订单详情

### 3. 交易记录 (/transactions)
- 查看所有交易记录
- 按类型和状态筛选
- 显示余额变化

### 4. API测试 (/test)
- 测试API连接
- 测试创建支付订单
- 查看API响应

## 常见问题

### 1. 无法登录
- 确保后端服务器在运行 (端口3000)
- 检查API密钥是否正确
- 检查浏览器控制台是否有错误

### 2. 数据不显示
- 检查后端API是否正常响应
- 检查网络连接
- 查看浏览器开发者工具的网络面板

### 3. 功能无法使用
- 确保已登录
- 检查API密钥是否有效
- 查看浏览器控制台错误信息

## 开发说明

### 技术栈
- React 18 + TypeScript
- Material-UI (MUI)
- React Router
- Axios
- Recharts (图表)

### 项目结构
```
src/
├── components/     # 通用组件
├── pages/         # 页面组件
├── services/      # API服务
├── types/         # TypeScript类型定义
└── App.tsx        # 主应用组件
```

### 添加新功能
1. 在 `src/pages/` 创建新页面
2. 在 `src/App.tsx` 添加路由
3. 在 `src/services/` 添加API服务
4. 在 `src/types/` 添加类型定义
