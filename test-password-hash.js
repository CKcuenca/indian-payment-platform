const bcrypt = require('bcryptjs');

// 测试密码哈希
const password = 'test123456';
const hash = '$2a$12$LDN25GeKp0Rr4AGA0XiLT.khUMNgHFpGYK5986RR3ZoA2IxVWfJ1y';

console.log('🔍 测试密码哈希\n');

console.log('密码:', password);
console.log('哈希:', hash);
console.log('哈希类型:', hash.startsWith('$2a$') ? 'bcrypt $2a$' : hash.startsWith('$2b$') ? 'bcrypt $2b$' : '未知');

// 测试密码验证
bcrypt.compare(password, hash).then(isValid => {
  console.log('密码验证结果:', isValid);
  
  if (isValid) {
    console.log('✅ 密码验证成功');
  } else {
    console.log('❌ 密码验证失败');
    
    // 尝试生成新的哈希
    console.log('\n🔄 生成新的哈希...');
    bcrypt.genSalt(12).then(salt => {
      return bcrypt.hash(password, salt);
    }).then(newHash => {
      console.log('新哈希:', newHash);
      console.log('新哈希类型:', newHash.startsWith('$2a$') ? 'bcrypt $2a$' : newHash.startsWith('$2b$') ? 'bcrypt $2b$' : '未知');
      
      // 测试新哈希
      return bcrypt.compare(password, newHash);
    }).then(isNewValid => {
      console.log('新哈希验证结果:', isNewValid);
    });
  }
}).catch(error => {
  console.error('❌ 密码验证出错:', error);
});
