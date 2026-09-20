const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipPath = path.join(distDir, 'auto-text-expander-v1.0.0.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Danh sách các tệp và thư mục cần đóng gói cho Chrome Web Store
const itemsToInclude = [
  'manifest.json',
  'background.js',
  'icons',
  'lib',
  'content',
  'options',
  'popup'
];

const pathsString = itemsToInclude.map(item => `'${path.join(__dirname, item)}'`).join(',');
const psCommand = `powershell -Command "Compress-Archive -Path ${pathsString} -DestinationPath '${zipPath}' -Force"`;

console.log('Đang đóng gói tiện ích mở rộng vào:', zipPath);
try {
  execSync(psCommand, { stdio: 'inherit' });
  const stats = fs.statSync(zipPath);
  console.log(`✓ Đóng gói thành công! Kích thước file: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log('File zip này đã sẵn sàng 100% để tải lên Chrome Web Store Developer Dashboard.');
} catch (error) {
  console.error('Lỗi khi đóng gói file zip:', error);
  process.exit(1);
}
