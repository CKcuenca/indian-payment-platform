# UNISPAY 唤醒支付部署检查清单

## 部署前检查

### 1. 代码完整性检查
- [ ] UNISPAY 支付提供商服务已创建 (`server/services/payment-providers/unispay-provider.js`)
- [ ] 支付配置模型已更新，支持 UNISPAY 提供商
- [ ] 支付管理器已集成 UNISPAY 提供商
- [ ] UNISPAY 支付路由已创建 (`server/routes/unispay-payment.js`)
- [ ] 主应用已注册 UNISPAY 路由
- [ ] 前端测试页面已创建 (`client/src/pages/UnispayPaymentTest.tsx`)
- [ ] 支付管理页面已添加 UNISPAY 配置选项

### 2. 配置文件检查
- [ ] 环境变量配置文件已创建 (`unispay-env-example.txt`)
- [ ] 数据库连接配置正确
- [ ] UNISPAY API 配置正确（商户号、API密钥、签名密钥）
- [ ] 环境设置正确（测试/生产）

### 3. 依赖检查
- [ ] 所有必要的 npm 包已安装
- [ ] 数据库连接正常
- [ ] 服务器可以正常启动

## 部署步骤

### 1. 环境配置
```bash
# 复制环境变量配置文件
cp unispay-env-example.txt .env

# 编辑配置文件，填入实际的 UNISPAY 配置
nano .env
```

### 2. 数据库初始化
```bash
# 运行 UNISPAY 配置初始化脚本
node server/scripts/init-unispay-config.js
```

### 3. 服务器启动
```bash
# 启动服务器
npm start

# 或者使用 PM2
pm2 start ecosystem.config.js
```

### 4. 功能测试
```bash
# 运行 UNISPAY 支付测试脚本
node test-unispay-payment.js
```

## 测试检查项

### 1. API 接口测试
- [ ] 创建唤醒支付订单接口正常
- [ ] 查询订单状态接口正常
- [ ] 异步通知回调接口正常
- [ ] 获取支付配置接口正常

### 2. 签名验证测试
- [ ] 请求签名生成正确
- [ ] 通知签名验证正确
- [ ] 签名算法符合 UNISPAY 要求

### 3. 支付流程测试
- [ ] 订单创建成功
- [ ] UPI 转账信息正确显示
- [ ] 订单状态查询正常
- [ ] 异步通知处理正确

### 4. 错误处理测试
- [ ] 参数验证错误处理
- [ ] 网络错误处理
- [ ] 签名验证失败处理
- [ ] 数据库错误处理

## 生产环境检查

### 1. 安全配置
- [ ] 生产环境 API 密钥已配置
- [ ] 签名密钥已安全保存
- [ ] 网络访问限制已配置
- [ ] 日志记录已配置

### 2. 性能配置
- [ ] 数据库连接池已优化
- [ ] 请求超时设置合理
- [ ] 错误重试机制已配置
- [ ] 监控告警已设置

### 3. 备份配置
- [ ] 数据库备份策略已配置
- [ ] 配置文件备份已设置
- [ ] 日志文件轮转已配置

## 监控和告警

### 1. 系统监控
- [ ] 服务器资源监控
- [ ] 数据库性能监控
- [ ] API 响应时间监控
- [ ] 错误率监控

### 2. 业务监控
- [ ] 支付成功率监控
- [ ] 订单处理时间监控
- [ ] 异步通知成功率监控
- [ ] 交易金额监控

### 3. 告警设置
- [ ] 系统错误告警
- [ ] 支付失败告警
- [ ] 网络异常告警
- [ ] 数据库异常告警

## 故障排查

### 1. 常见问题
- [ ] 签名验证失败
- [ ] 网络连接超时
- [ ] 数据库连接失败
- [ ] 异步通知失败

### 2. 日志查看
```bash
# 查看服务器日志
tail -f server/server.log

# 查看 PM2 日志
pm2 logs

# 查看数据库日志
tail -f logs/database-optimizer.log
```

### 3. 调试模式
```bash
# 启动调试模式
NODE_ENV=development DEBUG=* npm start

# 或使用调试脚本
node server/index-debug.js
```

## 回滚计划

### 1. 代码回滚
```bash
# 回滚到上一个版本
git reset --hard HEAD~1

# 或回滚到指定版本
git reset --hard <commit-hash>
```

### 2. 配置回滚
```bash
# 恢复配置文件
cp .env.backup .env

# 重启服务
pm2 restart all
```

### 3. 数据库回滚
```bash
# 恢复数据库备份
mongorestore --db payment-platform backup/

# 或回滚配置
node server/scripts/rollback-unispay-config.js
```

## 联系信息

### 技术支持
- 开发团队: dev@company.com
- 运维团队: ops@company.com
- 紧急联系: emergency@company.com

### 文档资源
- UNISPAY 官方文档: [文档链接]
- 项目 Wiki: [Wiki 链接]
- API 文档: [API 文档链接]

---

**注意**: 部署完成后，请及时更新此检查清单，记录实际部署状态和遇到的问题。
