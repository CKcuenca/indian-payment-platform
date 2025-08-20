// 测试印度时间设置

// 设置时区
process.env.TZ = 'Asia/Kolkata';

console.log('=== 印度时间测试 ===');
console.log('时区设置:', process.env.TZ);
console.log('当前时间:', new Date().toString());
console.log('ISO时间:', new Date().toISOString());
console.log('本地时间字符串:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

// 测试不同时间戳
const now = Date.now();
console.log('\n=== 时间戳测试 ===');
console.log('当前时间戳:', now);
console.log('转换为日期:', new Date(now).toString());
console.log('转换为ISO:', new Date(now).toISOString());

// 测试历史时间
const yesterday = new Date(now - 24 * 60 * 60 * 1000);
console.log('\n=== 历史时间测试 ===');
console.log('昨天时间:', yesterday.toString());
console.log('昨天ISO:', yesterday.toISOString());

console.log('\n=== 测试完成 ==='); 