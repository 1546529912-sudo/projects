import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 开发时若 VITE_API_BASE_URL 指向「同源 /api/v1」，请求会打到 Vite，需转发到后端
      // 走 docker 上的 nginx (8080)，由它再转给容器内的 crm-api:3001（API 端口未对主机暴露）
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
