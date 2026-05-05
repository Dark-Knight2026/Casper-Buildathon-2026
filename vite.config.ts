import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite"
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const wasmIntegrityPlugin = {
  name: 'wasm-integrity-check',
  buildStart() {
    const wasmPath = path.resolve(__dirname, 'public/proxy_caller.wasm');
    const servicePath = path.resolve(__dirname, 'src/services/ico/proxyCallerService.ts');

    const serviceSource = fs.readFileSync(servicePath, 'utf-8');
    const match = serviceSource.match(/EXPECTED_WASM_HASH\s*=\s*'([a-f0-9]{64})'/);
    if (!match) {
      throw new Error('wasm-integrity-check: could not find EXPECTED_WASM_HASH in proxyCallerService.ts');
    }
    const expectedHash = match[1];

    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(wasmPath)).digest('hex');

    if (actualHash !== expectedHash) {
      throw new Error(
        `wasm-integrity-check: hash mismatch for public/proxy_caller.wasm\n` +
        `  expected: ${expectedHash}\n` +
        `  actual:   ${actualHash}\n` +
        `The WASM file may have been tampered with — update EXPECTED_WASM_HASH or restore the file.`
      );
    }
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
  server: {
    // lvh.me is a wildcard DNS that resolves to 127.0.0.1 — required for CSPRClick
    // wallet SDK which enforces a specific subdomain in the Host header.
    // localhost access still works: Vite unconditionally allows loopback (127.0.0.1)
    // connections regardless of allowedHosts.
    //
    // host: '127.0.0.1' forces IPv4 binding. Default 'localhost' resolves to ::1 (IPv6)
    // on macOS, but lvh.me's DNS only returns an A record (127.0.0.1) — without this,
    // browsers hitting http://lvh.me:5173 get ECONNREFUSED.
    host: '127.0.0.1',
    allowedHosts: ['lvh.me'],
    proxy: {
      '/api/cspr-cloud': {
        target: 'https://api.testnet.cspr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cspr-cloud/, ''),
        headers: {
          authorization: env.CSPR_CLOUD_API_KEY || '',
        },
      },
      '/api/casper-rpc': {
        target: 'https://node.testnet.cspr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/casper-rpc/, '/rpc'),
        headers: {
          authorization: env.CSPR_CLOUD_API_KEY || '',
        },
      },
      '/api/v1': {
        target: env.VITE_BACKEND_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, '/api/v3'),
      },
    },
  },
  plugins: [
    // CSPR.click wallet SDK requires a secure context (HTTPS) at runtime —
    // WebCrypto APIs and the wallet provider's WSS handshake refuse to
    // initialize over plain http://. basicSsl serves a self-signed cert in
    // dev so the SDK can boot without standing up a real cert chain.
    basicSsl(),
    wasmIntegrityPlugin,
    nodePolyfills({
      // Tradeoff: this ships ~Node-shim code into every prod chunk that touches
      // the wallet/blockchain stack. Required because csprclick-web-sdk's
      // transitive deps assume a Node runtime — eventsource uses util.inherits,
      // casper-js-sdk pulls in buffer/stream/crypto. Without these polyfills
      // Vite serves empty modules and pages crash silently with "util.inherits
      // is not a function". The `include` list is intentionally narrow (only
      // the built-ins the SDK actually touches) so we don't drag in the full
      // polyfill bundle. Revisit if/when @make-software ships a browser-native
      // build of the SDK.
      include: ['util', 'buffer', 'stream', 'process', 'events', 'crypto', 'http', 'https', 'url'],
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
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
        navigateFallbackDenylist: [/^\/api\//, /^\/docs\//, /\.pdf$/],
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