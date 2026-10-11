import fs from 'fs';
import path from 'path';

// Copies dist to docs so GitHub Pages "/docs" folder option works directly
const distDir = path.resolve('dist');
const docsDir = path.resolve('docs');

if (fs.existsSync(distDir)) {
  // 1. Ensure .nojekyll in dist so GitHub Pages does not ignore files starting with underscore
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');

  // 2. Ensure 404.html exists in dist. If public/404.html didn't copy, duplicate index.html as 404.html
  const dist404 = path.join(distDir, '404.html');
  const distIndex = path.join(distDir, 'index.html');
  if (!fs.existsSync(dist404) && fs.existsSync(distIndex)) {
    fs.copyFileSync(distIndex, dist404);
  }

  // 3. Mirror dist to docs for GitHub Pages repository root/docs deployment option
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, docsDir, { recursive: true });

  // 4. Also ensure .nojekyll and 404.html in docs
  fs.writeFileSync(path.join(docsDir, '.nojekyll'), '', 'utf-8');
  if (fs.existsSync(path.join(distDir, '404.html'))) {
    fs.copyFileSync(path.join(distDir, '404.html'), path.join(docsDir, '404.html'));
  } else if (fs.existsSync(distIndex)) {
    fs.copyFileSync(distIndex, path.join(docsDir, '404.html'));
  }

  console.log('✓ Successfully synced dist/ to docs/ with .nojekyll and 404.html for GitHub Pages.');
}
