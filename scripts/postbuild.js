import fs from 'fs';
import path from 'path';

// Copies dist to docs and ensures .nojekyll & 404.html so all GitHub Pages deployment options work:
// 1. GitHub Actions (uses ./dist)
// 2. GitHub Pages /docs folder option (uses ./docs)
// 3. gh-pages branch (uses ./dist)
const distDir = path.resolve('dist');
const docsDir = path.resolve('docs');
const rootAssetsDir = path.resolve('assets');

if (fs.existsSync(distDir)) {
  const distAssetsDir = path.join(distDir, 'assets');

  // 1. Ensure .nojekyll in dist and root
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');
  fs.writeFileSync(path.resolve('.nojekyll'), '', 'utf-8');

  // 2. Ensure 404.html exists in dist
  const dist404 = path.join(distDir, '404.html');
  const distIndex = path.join(distDir, 'index.html');
  const public404 = path.resolve('public/404.html');

  if (fs.existsSync(public404)) {
    fs.copyFileSync(public404, dist404);
  } else if (!fs.existsSync(dist404) && fs.existsSync(distIndex)) {
    fs.copyFileSync(distIndex, dist404);
  }

  // 3. Mirror dist to docs for GitHub Pages repository /docs deployment option
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, docsDir, { recursive: true });

  // 4. Ensure .nojekyll and 404.html in docs
  fs.writeFileSync(path.join(docsDir, '.nojekyll'), '', 'utf-8');
  if (fs.existsSync(dist404)) {
    fs.copyFileSync(dist404, path.join(docsDir, '404.html'));
  }

  // 5. Mirror built assets to root ./assets as well
  if (fs.existsSync(distAssetsDir)) {
    if (fs.existsSync(rootAssetsDir)) {
      fs.rmSync(rootAssetsDir, { recursive: true, force: true });
    }
    fs.cpSync(distAssetsDir, rootAssetsDir, { recursive: true });
  }

  console.log('✓ Successfully synced dist/ to docs/, updated .nojekyll and 404.html for GitHub Pages.');
}
