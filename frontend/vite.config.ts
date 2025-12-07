// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // React 插件
  plugins: [react()],

  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // 开发服务器配置
  server: {
    port: 5173,      // 前端默认端口
    host: '0.0.0.0',      // 允许外部访问
    open: true,      // 启动时自动打开浏览器
    cors: true,      // 允许跨域

    // 代理配置
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/api/, ''), // 如需路径重写
      },
    },

    // 修复 HMR 在 Windows 或特殊文件系统下的重复刷新问题
    hmr: {
      overlay: true,
      clientPort: 5173, // 前端端口
    },

    watch: {
      usePolling: true, // 使用轮询模式监控文件
      interval: 100,    // 文件轮询间隔 (ms)
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'store-vendor': ['zustand'],
          'style-vendor': ['styled-components'],
          'utils-vendor': ['axios'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  // CSS 配置
  css: {
    preprocessorOptions: {
      // 如果使用 scss/sass，可以配置全局变量
      // scss: { additionalData: `@import "@/styles/variables.scss";` }
    },
  },

  // 环境变量前缀
  envPrefix: 'VITE_',

  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'styled-components',
      'axios',
    ],
  },
});
