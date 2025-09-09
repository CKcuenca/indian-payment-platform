# 🌿 分支部署策略

## 📋 当前部署配置

### **分支策略**
| 分支 | 部署目标 | 触发条件 | 用途 |
|------|----------|----------|------|
| `main` | 测试环境 | 自动部署 | 开发测试 |
| `develop` | 测试环境 | 自动部署 | 功能开发 |
| `production` | 生产环境 | 自动部署 | 生产发布 |

### **工作流配置**
- **`deploy-test.yml`**: 部署到测试环境 (main/develop分支)
- **`deploy.yml`**: 部署到生产环境 (production分支)

## 🚀 推荐部署流程

### **1. 日常开发流程**
```bash
# 1. 在develop分支开发
git checkout develop
git pull origin develop

# 2. 开发功能
# ... 编写代码 ...

# 3. 提交到develop分支
git add .
git commit -m "新功能开发"
git push origin develop

# 4. 自动部署到测试环境
# GitHub Actions会自动部署到 test.cashgit.com
```

### **2. 测试验证流程**
```bash
# 1. 测试通过后，合并到main分支
git checkout main
git pull origin main
git merge develop
git push origin main

# 2. 自动部署到测试环境
# GitHub Actions会自动部署到 test.cashgit.com

# 3. 在测试环境进行最终验证
# 访问: https://test.cashgit.com
```

### **3. 生产发布流程**
```bash
# 1. 创建production分支
git checkout main
git checkout -b production
git push origin production

# 2. 自动部署到生产环境
# GitHub Actions会自动部署到 cashgit.com

# 3. 验证生产环境
# 访问: https://cashgit.com
```

## 🔧 当前配置状态

### **已配置的工作流**
- ✅ **测试环境自动部署**: main/develop → test.cashgit.com
- ✅ **生产环境自动部署**: production → cashgit.com

### **部署验证**
- 测试环境: https://test.cashgit.com/api/health
- 生产环境: https://cashgit.com/api/health

## ⚠️ 重要说明

1. **main分支**: 现在只部署到测试环境，不会影响生产环境
2. **production分支**: 需要手动创建，用于生产环境部署
3. **安全性**: 生产环境部署需要明确的production分支推送
4. **回滚**: 如有问题，可以快速回滚到之前的production分支

## 🎯 使用建议

1. **日常开发**: 使用develop分支，自动部署到测试环境
2. **功能测试**: 合并到main分支，在测试环境验证
3. **生产发布**: 创建production分支，部署到生产环境
4. **紧急修复**: 可以直接在production分支修复并部署


