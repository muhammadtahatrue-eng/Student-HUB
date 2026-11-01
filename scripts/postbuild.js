import fs from 'fs';
import path from 'path';

// Syncs dist/ to both docs/ (for GitHub Pages "/docs" folder & GitHub Actions)
// and root /assets + /.nojekyll + /404.html (for GitHub Pages "/ (root)" folder deployment)
const distDir = path.resolve('dist');
const docsDir = path.resolve('docs');
const rootAssetsDir = path.resolve('assets');
const distAssetsDir = path.resolve('dist/assets');

if (fs.existsSync(distDir)) {
  // 1. Sync full build to /docs
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, docsDir, { recursive: true });

  // 2. Sync compiled assets to root /assets so "/ (root)" branch deployments work out-of-the-box
  if (fs.existsSync(distAssetsDir)) {
    if (fs.existsSync(rootAssetsDir)) {
      fs.rmSync(rootAssetsDir, { recursive: true, force: true });
    }
    fs.cpSync(distAssetsDir, rootAssetsDir, { recursive: true });
  }

  // 3. Ensure .nojekyll and 404.html exist at repository root "/"
  const distNoJekyll = path.resolve('dist/.nojekyll');
  const rootNoJekyll = path.resolve('.nojekyll');
  if (fs.existsSync(distNoJekyll)) {
    fs.copyFileSync(distNoJekyll, rootNoJekyll);
  } else {
    fs.writeFileSync(rootNoJekyll, '');
  }

  const dist404 = path.resolve('dist/404.html');
  const root404 = path.resolve('404.html');
  if (fs.existsSync(dist404)) {
    fs.copyFileSync(dist404, root404);
  }

  const distFavicon = path.resolve('dist/favicon.svg');
  const rootFavicon = path.resolve('favicon.svg');
  if (fs.existsSync(distFavicon)) {
    fs.copyFileSync(distFavicon, rootFavicon);
  }

  console.log('✓ Synced production build to /docs and root /assets for GitHub Pages.');
}
