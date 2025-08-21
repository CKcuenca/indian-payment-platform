const mongoose = require('mongoose');
const PaymentStateManager = require('../services/payment-state-manager');

/**
 * 测试支付状态管理器
 */
async function testPaymentStateManager() {
  try {
    console.log('🚀 开始测试支付状态管理器...');
    
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/payment-platform');
    console.log('✅ 数据库连接成功');
    
    // 创建状态管理器实例
    const stateManager = new PaymentStateManager();
    
    // 测试1: 状态机信息
    console.log('\n📋 测试1: 获取状态机信息');
    const stateMachine = PaymentStateManager.STATE_MACHINE;
    console.log(`状态机包含 ${Object.keys(stateMachine).length} 个状态`);
    
    // 测试2: 状态转换验证
    console.log('\n🔄 测试2: 状态转换验证');
    const validTransitions = [
      { from: 'PENDING', to: 'PROCESSING' },
      { from: 'PROCESSING', to: 'SUCCESS' },
      { from: 'SUCCESS', to: 'REFUNDED' },
      { from: 'PENDING', to: 'FAILED' }
    ];
    
    for (const transition of validTransitions) {
      const validation = stateManager.validateStateTransition(
        transition.from, 
        transition.to, 
        { status: transition.from }
      );
      console.log(`${transition.from} -> ${transition.to}: ${validation.valid ? '✅' : '❌'} ${validation.reason || ''}`);
    }
    
    // 测试3: 无效状态转换
    console.log('\n❌ 测试3: 无效状态转换验证');
    const invalidTransitions = [
      { from: 'SUCCESS', to: 'PENDING' },
      { from: 'FAILED', to: 'SUCCESS' },
      { from: 'REFUNDED', to: 'PROCESSING' }
    ];
    
    for (const transition of invalidTransitions) {
      const validation = stateManager.validateStateTransition(
        transition.from, 
        transition.to, 
        { status: transition.from }
      );
      console.log(`${transition.from} -> ${transition.to}: ${validation.valid ? '✅' : '❌'} ${validation.reason || ''}`);
    }
    
    // 测试4: 操作ID生成
    console.log('\n🔑 测试4: 操作ID生成');
    const operationId1 = stateManager.generateOperationId('TEST001', 'SUCCESS', { reason: 'Payment completed' });
    const operationId2 = stateManager.generateOperationId('TEST001', 'SUCCESS', { reason: 'Payment completed' });
    console.log(`操作ID1: ${operationId1}`);
    console.log(`操作ID2: ${operationId2}`);
    console.log(`操作ID是否唯一: ${operationId1 !== operationId2 ? '✅' : '❌'}`);
    
    // 测试5: 分布式锁
    console.log('\n🔒 测试5: 分布式锁功能');
    const orderId = 'TEST_LOCK_001';
    const operationId = 'OP_001';
    
    // 获取锁
    const lockResult1 = await stateManager.acquireLock(orderId, operationId);
    console.log(`获取锁结果: ${lockResult1.success ? '✅' : '❌'} ${lockResult1.reason || ''}`);
    
    // 尝试获取同一个锁（应该失败）
    const lockResult2 = await stateManager.acquireLock(orderId, 'OP_002');
    console.log(`重复获取锁结果: ${lockResult2.success ? '✅' : '❌'} ${lockResult2.reason || ''}`);
    
    // 释放锁
    const releaseResult = await stateManager.releaseLock(`payment_lock:${orderId}`, operationId);
    console.log(`释放锁结果: ${releaseResult.success ? '✅' : '❌'}`);
    
    // 测试6: 清理过期锁
    console.log('\n🧹 测试6: 清理过期锁');
    const cleanupResult = await stateManager.cleanupExpiredLocks();
    console.log(`清理结果: ${cleanupResult.success ? '✅' : '❌'} 清理了 ${cleanupResult.cleanedCount} 个过期锁`);
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行测试
if (require.main === module) {
  testPaymentStateManager();
}

module.exports = testPaymentStateManager;
