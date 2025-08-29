#!/bin/bash

echo "🔍 检查线上服务器PassPay配置..."

# 连接到服务器并检查数据库
ssh -i /Users/kaka/AWS-Key/indian-payment-key-3.pem ubuntu@13.200.72.14 << 'EOF'
echo "✅ 已连接到服务器"
cd /home/ubuntu/indian-payment-platform

echo "🔍 检查MongoDB状态..."
if pgrep -f "mongod" > /dev/null; then
    echo "✅ MongoDB正在运行"
else
    echo "❌ MongoDB未运行"
    exit 1
fi

echo "🔍 检查PassPay配置..."
node -e "
const mongoose = require('mongoose');
const PaymentConfig = require('./server/models/PaymentConfig');

mongoose.connect('mongodb://localhost:27017/payment-platform')
.then(async () => {
    console.log('✅ 数据库连接成功');
    
    const passpayConfigs = await PaymentConfig.find({'provider.name': 'passpay'});
    console.log('📊 PassPay配置数量:', passpayConfigs.length);
    
    if (passpayConfigs.length > 0) {
        console.log('📋 PassPay配置详情:');
        passpayConfigs.forEach(config => {
            console.log('   - 账户名:', config.accountName);
            console.log('     ID:', config._id);
            console.log('     状态:', config.status);
            console.log('     创建时间:', config.createdAt);
            console.log('     ---');
        });
    } else {
        console.log('✅ 没有找到PassPay配置');
    }
    
    // 显示所有支付配置
    const allConfigs = await PaymentConfig.find();
    console.log('\n📊 所有支付配置数量:', allConfigs.length);
    allConfigs.forEach(config => {
        console.log('   -', config.accountName, '(', config.provider.name, ')');
    });
    
    mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
})
.catch(error => {
    console.error('❌ 数据库操作失败:', error);
    process.exit(1);
});
"

echo "🔍 检查完成"
EOF

echo "✅ 服务器检查完成"

