import fs from 'fs';
import path from 'path';

// Copies dist to docs and root assets so all GitHub Pages deployment options work:
// 1. GitHub Actions (uses ./dist)
// 2. GitHub Pages /docs folder option (uses ./docs)
// 3. GitHub Pages / (root) folder option (uses ./index.html and ./assets)
const distDir = path.resolve('dist');
const docsDir = path.resolve('docs');
const rootAssetsDir = path.resolve('assets');

if (fs.existsSync(distDir)) {
  const distAssetsDir = path.join(distDir, 'assets');

  // Ensure index.css exists in dist/assets if bundle.css was output
  if (fs.existsSync(distAssetsDir)) {
    const bundleCss = path.join(distAssetsDir, 'bundle.css');
    const indexCss = path.join(distAssetsDir, 'index.css');
    if (fs.existsSync(bundleCss) && !fs.existsSync(indexCss)) {
      fs.copyFileSync(bundleCss, indexCss);
    }
  }

  // 1. Ensure .nojekyll in dist
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf-8');

  // 2. Ensure 404.html exists in dist
  const dist404 = path.join(distDir, '404.html');
  const distIndex = path.join(distDir, 'index.html');
  if (!fs.existsSync(dist404) && fs.existsSync(distIndex)) {
    fs.copyFileSync(distIndex, dist404);
  }

  // 3. Mirror dist to docs for GitHub Pages repository /docs deployment option
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

  // 5. Copy built assets to root ./assets for root deployment option
  if (fs.existsSync(distAssetsDir)) {
    if (fs.existsSync(rootAssetsDir)) {
      fs.rmSync(rootAssetsDir, { recursive: true, force: true });
    }
    fs.cpSync(distAssetsDir, rootAssetsDir, { recursive: true });
  }

  console.log('✓ Successfully synced dist/ to docs/ and root assets/ with .nojekyll and 404.html for GitHub Pages.');
}
