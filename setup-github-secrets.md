# 🔑 GitHub Actions Secrets 配置指南

## 📋 需要配置的Secrets

### 1. 访问GitHub仓库设置
1. 打开项目仓库: https://github.com/CKcuenca/indian-payment-platform
2. 点击 **Settings** 标签
3. 左侧菜单选择 **Secrets and variables** → **Actions**
4. 点击 **New repository secret**

### 2. 添加以下Secrets

| Secret名称 | 值 | 说明 |
|------------|-----|------|
| `EC2_HOST` | `13.200.72.14` | 服务器IP地址 |
| `EC2_USERNAME` | `ubuntu` | SSH用户名 |
| `EC2_SSH_KEY` | SSH私钥内容 | 完整的SSH私钥 |
| `EC2_PORT` | `22` | SSH端口 |

### 3. SSH私钥获取方法

```bash
# 在本地执行，获取私钥内容
cat /Users/kaka/AWS-Key/indian-payment-key-3.pem
```

**注意:** 复制完整的私钥内容，包括：
```
-----BEGIN RSA PRIVATE KEY-----
[私钥内容]
-----END RSA PRIVATE KEY-----
```

### 4. 验证配置

配置完成后，GitHub Actions会自动使用这些Secrets进行部署。

## 🚀 测试自动部署

配置完成后，可以通过以下方式测试：

1. **推送代码触发部署**
```bash
git add .
git commit -m "测试自动部署"
git push origin main
```

2. **查看部署状态**
- 访问: https://github.com/CKcuenca/indian-payment-platform/actions
- 查看最新的workflow运行状态

3. **验证部署结果**
- 测试环境: https://test.cashgit.com/api/health
- 生产环境: https://cashgit.com/api/health




