# 前端访问说明

## 当前状态
- 后端服务器运行在: http://localhost:3000
- 前端开发服务器运行在: http://localhost:3001

## 访问步骤
1. 打开浏览器访问: http://localhost:3001
2. 使用以下测试账户登录:
   - 用户名: admin
   - 密码: Yyw11301107*
3. 登录后应该能看到左侧菜单中的"支付账户配置"和"支付数据统计"

## 新功能说明

### 支付账户配置页面
- 路径: /payment-account-config
- 功能: 管理支付账户的额度设置
- 权限: 需要 VIEW_PAYMENT_CONFIG 权限

### 支付数据统计页面  
- 路径: /payment-data
- 功能: 查看支付账户的统计数据
- 权限: 需要 SYSTEM_MONITORING 权限

## 权限修复
已修复Login.tsx中的权限设置问题，现在管理员用户应该能看到所有菜单项。

## 测试账户
- 管理员: admin / Yyw11301107* (有所有权限)
- 运营人员: operator / operator123 (无支付配置权限)
- 商户: merchant / merchant123 (只有查看自己订单的权限)
