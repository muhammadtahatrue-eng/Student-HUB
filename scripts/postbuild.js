import fs from 'fs';
import path from 'path';

// Copies dist to docs so GitHub Pages "/docs" folder option works directly
const distDir = path.resolve('dist');
const docsDir = path.resolve('docs');

if (fs.existsSync(distDir)) {
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, docsDir, { recursive: true });
  console.log('✓ Successfully synced dist/ to docs/ for GitHub Pages /docs folder deployment.');
}
