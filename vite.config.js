import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { copyFile } from 'wpsjs/vite_plugins';

export default defineConfig({
  base: './',
  plugins: [
    copyFile({
      src: 'manifest.xml',
      dest: 'manifest.xml',
    }),
    vue()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    proxy: {
      // 开发时代理到目标 API
      '/proxy': {
        target: 'http://localhost:3890',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }
});
