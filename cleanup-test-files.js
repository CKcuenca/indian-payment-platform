const fs = require('fs');
const path = require('path');

// 要清理的文件模式
const patternsToClean = [
  'test-*.js',
  'check-*.js', 
  'create-*.js',
  'debug-*.js',
  'cleanup-*.js',
  'fix-*.js',
  'reset-*.js',
  'unlock-*.js',
  'update-*.js',
  'delete-*.js',
  'recreate-*.js',
  'simple-*.js'
];

// 要保留的重要文件
const keepFiles = [
  'test-business-flow-final.js', // 最新的业务流程测试
  'test-providers-individual.js', // 最新的提供商测试
  'cleanup-test-files.js' // 这个清理脚本本身
];

// 要保留的目录
const keepDirs = [
  'node_modules',
  'client',
  'server',
  'docs',
  'logs',
  '.git'
];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!keepDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function matchesPattern(filename, pattern) {
  const regex = pattern.replace(/\*/g, '.*');
  return new RegExp(`^${regex}$`).test(filename);
}

function shouldKeepFile(filename) {
  const basename = path.basename(filename);
  
  // 检查是否在保留列表中
  if (keepFiles.includes(basename)) {
    return true;
  }
  
  // 检查是否匹配要清理的模式
  for (const pattern of patternsToClean) {
    if (matchesPattern(basename, pattern)) {
      return false;
    }
  }
  
  return true;
}

function cleanupFiles() {
  console.log('🧹 开始清理测试和调试文件...');
  
  const allFiles = getAllFiles('.');
  const filesToDelete = [];
  const filesToKeep = [];
  
  allFiles.forEach(file => {
    if (shouldKeepFile(file)) {
      filesToKeep.push(file);
    } else {
      filesToDelete.push(file);
    }
  });
  
  console.log(`\n📊 清理统计:`);
  console.log(`总文件数: ${allFiles.length}`);
  console.log(`保留文件: ${filesToKeep.length}`);
  console.log(`删除文件: ${filesToDelete.length}`);
  
  if (filesToDelete.length === 0) {
    console.log('\n✅ 没有需要清理的文件！');
    return;
  }
  
  console.log(`\n🗑️ 将要删除的文件:`);
  filesToDelete.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  // 确认删除
  console.log(`\n⚠️ 确认删除 ${filesToDelete.length} 个文件？(y/N)`);
  
  // 在Node.js环境中，我们直接执行删除
  // 在实际使用中，你可能想要添加确认逻辑
  
  let deletedCount = 0;
  let errorCount = 0;
  
  filesToDelete.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(`✅ 已删除: ${file}`);
      deletedCount++;
    } catch (error) {
      console.log(`❌ 删除失败: ${file} - ${error.message}`);
      errorCount++;
    }
  });
  
  console.log(`\n🎉 清理完成！`);
  console.log(`成功删除: ${deletedCount} 个文件`);
  if (errorCount > 0) {
    console.log(`删除失败: ${errorCount} 个文件`);
  }
  
  // 显示保留的重要文件
  console.log(`\n📋 保留的重要文件:`);
  filesToKeep.filter(file => {
    const basename = path.basename(file);
    return keepFiles.includes(basename);
  }).forEach(file => {
    console.log(`  ✅ ${file}`);
  });
}

// 运行清理
cleanupFiles();
