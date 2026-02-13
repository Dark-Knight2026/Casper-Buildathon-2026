import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite"
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
  server: {
    proxy: {
      '/api/cspr-cloud': {
        target: 'https://api.testnet.cspr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cspr-cloud/, ''),
        headers: {
          authorization: env.VITE_CSPR_CLOUD_API_KEY || '',
        },
      },
      '/api/casper-rpc': {
        target: 'https://node.testnet.cspr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/casper-rpc/, '/rpc'),
        headers: {
          authorization: env.VITE_CSPR_CLOUD_API_KEY || '',
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', '/images/RealEstate.jpg', '/images/RealEstate.jpg'],
      manifest: {
        name: 'KeyChain Real Estate',
        short_name: 'KeyChain',
        description: 'Modern real estate management platform',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/images/photo1765087143.jpg',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/PWAIcon.jpg',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/images/PWAIcon.jpg',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk optimization - split by usage pattern
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          'vendor-forms': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
          ],
          'vendor-charts': ['recharts'],
          'vendor-utils': [
            'date-fns',
            'clsx',
            'tailwind-merge',
          ],
          'vendor-dnd': [
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
          ],
        },
      },
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Enable source maps for debugging (can be disabled in production)
    sourcemap: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
    exclude: ['@radix-ui/react-icons'],
  },
    // Test configuration
  test: {
    deps: {
      inline: ['casper-js-sdk']
    }
  },

};

});