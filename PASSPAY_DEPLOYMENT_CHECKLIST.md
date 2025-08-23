# 🚀 PassPay集成部署检查清单

## 📋 部署前准备

### 1. **PassPay账户信息** ✅
- [ ] 获取PassPay商户ID (mchid)
- [ ] 获取PassPay支付ID (pay_id)
- [ ] 获取PassPay密钥 (secret_key)
- [ ] 确认PassPay账户状态正常

### 2. **服务器环境** ✅
- [ ] Node.js 16+ 已安装
- [ ] MongoDB 4.4+ 已安装并运行
- [ ] 服务器防火墙配置正确
- [ ] 域名和SSL证书配置完成

### 3. **网络配置** ✅
- [ ] 服务器能访问PassPay API (https://api.merchant.passpay.cc)
- [ ] 回调地址能被PassPay访问
- [ ] 端口3000已开放

## 🔧 配置步骤

### 步骤1: 初始化PassPay配置
```bash
# 设置环境变量
export PASSPAY_MCHID="your_real_mchid"
export PASSPAY_PAY_ID="your_real_pay_id"
export PASSPAY_SECRET_KEY="your_real_secret_key"

# 运行配置初始化脚本
node init-passpay-config.js
```

### 步骤2: 验证配置
```bash
# 检查数据库中的配置
mongo payment-platform
db.paymentconfigs.findOne({"provider.name": "passpay"})
```

### 步骤3: 重启服务器
```bash
# 停止当前服务
pm2 stop all

# 启动服务
pm2 start ecosystem.config.js

# 查看日志
pm2 logs
```

## 🧪 功能测试

### 基础功能测试
- [ ] **代收订单创建** - 测试创建支付订单
- [ ] **订单状态查询** - 测试查询订单状态
- [ ] **UTR补单** - 测试UTR提交功能
- [ ] **UPI查询** - 测试UPI状态查询
- [ ] **代付订单创建** - 测试代付功能
- [ ] **余额查询** - 测试余额查询

### 高级功能测试
- [ ] **回调处理** - 测试PassPay回调接收
- [ ] **状态同步** - 测试自动状态同步
- [ ] **手动同步** - 测试手动同步功能
- [ ] **错误处理** - 测试异常情况处理

### 运行完整测试
```bash
# 运行完整功能测试
node test-complete-passpay.js

# 运行回调测试
node test-passpay-callback.js

# 运行集成测试
node test-passpay-integration.js
```

## 🔍 监控和日志

### 日志检查
- [ ] 检查服务器启动日志
- [ ] 检查PassPay API调用日志
- [ ] 检查回调处理日志
- [ ] 检查状态同步日志

### 服务状态检查
```bash
# 检查同步服务状态
curl -X POST http://localhost:3000/api/passpay-sync/status \
  -H "Content-Type: application/json" \
  -d '{"appid":"test","sign":"test"}'

# 检查PassPay配置
curl -X GET http://localhost:3000/api/payment-config
```

## 🚨 常见问题排查

### 1. **PassPay API调用失败**
- [ ] 检查网络连接
- [ ] 验证API密钥和签名
- [ ] 确认API地址正确
- [ ] 检查请求参数格式

### 2. **回调接收失败**
- [ ] 检查回调URL可访问性
- [ ] 验证回调签名
- [ ] 检查服务器防火墙设置
- [ ] 确认回调地址配置正确

### 3. **状态同步失败**
- [ ] 检查同步服务是否启动
- [ ] 验证数据库连接
- [ ] 检查PassPay配置
- [ ] 查看同步服务日志

### 4. **订单状态不一致**
- [ ] 运行手动同步
- [ ] 检查PassPay订单状态
- [ ] 验证本地数据库记录
- [ ] 检查状态映射配置

## 📊 性能指标

### 监控指标
- [ ] API响应时间 < 2秒
- [ ] 回调处理时间 < 1秒
- [ ] 状态同步成功率 > 95%
- [ ] 系统可用性 > 99.9%

### 性能测试
```bash
# 压力测试API接口
ab -n 100 -c 10 -p test-data.json http://localhost:3000/api/pay

# 监控系统资源
htop
iotop
```

## 🔒 安全检查

### 安全配置
- [ ] 所有API接口都有签名验证
- [ ] 回调签名验证正确
- [ ] 敏感信息不暴露在日志中
- [ ] 防火墙规则配置正确

### 权限检查
- [ ] 数据库用户权限最小化
- [ ] 文件系统权限正确
- [ ] 服务运行用户权限合适

## 📈 生产环境优化

### 性能优化
- [ ] 启用PM2集群模式
- [ ] 配置MongoDB连接池
- [ ] 启用Redis缓存（可选）
- [ ] 配置负载均衡（可选）

### 监控告警
- [ ] 配置系统监控
- [ ] 设置异常告警
- [ ] 配置日志轮转
- [ ] 设置备份策略

## ✅ 部署完成检查

### 最终验证
- [ ] 所有功能测试通过
- [ ] 系统日志正常
- [ ] 性能指标达标
- [ ] 安全配置正确
- [ ] 监控告警正常

### 上线确认
- [ ] 生产环境配置完成
- [ ] 功能验证通过
- [ ] 性能测试达标
- [ ] 安全审计通过
- [ ] 运维团队培训完成

---

## 🎯 部署成功标志

当您看到以下信息时，说明PassPay集成部署成功：

```
✅ Connected to MongoDB
✅ Models loaded successfully
✅ Database setup completed
✅ 支付状态同步服务已启动
✅ PassPay状态同步服务已启动
🚀 启动PassPay状态同步服务...
✅ PassPay同步服务已启动，同步间隔: 300秒
```

## 📞 技术支持

如果部署过程中遇到问题：

1. **检查日志文件**：查看服务器和PassPay相关日志
2. **验证配置**：确认PassPay参数和网络配置
3. **运行测试**：使用测试工具验证功能
4. **查看文档**：参考PASSPAY_INTEGRATION_README.md

---

**🎉 恭喜！完成所有检查项后，您的PassPay集成系统就可以正式投入使用了！**
