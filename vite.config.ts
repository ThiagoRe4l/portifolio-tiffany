import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { bundleReportPlugin } from './scripts/bundle-report-plugin.ts';
import { contentDevPlugin } from './scripts/content-dev-plugin.ts';

export default defineConfig({
  plugins: [react(), bundleReportPlugin(), contentDevPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    manifest: true,
  },
});
