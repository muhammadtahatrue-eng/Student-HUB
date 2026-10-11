import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Determine base path:
  // 1. If BASE_URL is set (e.g. from GitHub Actions workflow), use it.
  // 2. If GITHUB_REPOSITORY is present in CI, compute repository subpath: /<repo>/
  // 3. Otherwise default to './' so relative asset paths work uniformly on GitHub Pages and local servers.
  let base = './';
  if (process.env.BASE_URL) {
    base = process.env.BASE_URL;
  } else if (process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    base = repo && !repo.endsWith('.github.io') ? `/${repo}/` : '/';
  }

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
