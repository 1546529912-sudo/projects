import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import path from 'node:path';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      // 按 /api/{backend} 前缀分流到 4 个后端
      '/api/shop': { target: 'http://localhost:8001', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/shop/, '/api/v1') },
      '/api/pim':  { target: 'http://localhost:8002', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/pim/,  '/api/v1') },
      '/api/oms':  { target: 'http://localhost:8003', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/oms/,  '/api/v1') },
      '/api/wms':  { target: 'http://localhost:8004', changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/wms/,  '/api/v1') },
      // 4 个后端 health
      '/health/shop': { target: 'http://localhost:8001', changeOrigin: true, rewrite: () => '/health' },
      '/health/pim':  { target: 'http://localhost:8002', changeOrigin: true, rewrite: () => '/health' },
      '/health/oms':  { target: 'http://localhost:8003', changeOrigin: true, rewrite: () => '/health' },
      '/health/wms':  { target: 'http://localhost:8004', changeOrigin: true, rewrite: () => '/health' },
      // 退货凭证（shop-backend, iter-15）— 必须放在 /uploads 通用规则之前（longest-prefix 优先）
      '/uploads/refund-evid': { target: 'http://localhost:8001', changeOrigin: true },
      // PIM 上传图片：直出 /uploads/260527/xxx.jpg
      '/uploads':     { target: 'http://localhost:8002', changeOrigin: true },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@/styles/element.scss" as *;',
      },
    },
  },
});
