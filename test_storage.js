// 简单的测试脚本来验证数据持久化
console.log('测试数据持久化功能...');

// 检查应用数据目录
const fs = require('fs');
const path = require('path');
const os = require('os');

// 获取可能的数据存储位置
const possiblePaths = [
  path.join(os.homedir(), '.local', 'share', 'blueprint-plan', 'data.json'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'blueprint-plan', 'data.json'),
  path.join(os.homedir(), 'Library', 'Application Support', 'blueprint-plan', 'data.json'),
  './data.json',
  './src-tauri/target/debug/data.json'
];

console.log('检查可能的数据文件位置:');
possiblePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ 找到数据文件: ${filePath}`);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`   计划数量: ${data.plans ? data.plans.length : 0}`);
      if (data.plans && data.plans.length > 0) {
        console.log(`   最新计划: ${data.plans[data.plans.length - 1].title}`);
      }
    } catch (e) {
      console.log(`   读取数据失败: ${e.message}`);
    }
  } else {
    console.log(`❌ 未找到: ${filePath}`);
  }
}); 