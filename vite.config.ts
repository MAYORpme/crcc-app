import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const preview = env.VITE_HASH_ROUTER === '1';
  return {
    base: preview ? './' : '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['icons/favicon.png', 'icons/apple-touch-icon.png', 'images/logo.png', 'images/logo-white.png'],
        manifest: {
          name: 'CRCC · Christ The Renewal Christian Church',
          short_name: 'CRCC',
          description: 'Give, listen to sermons, read Oxygen Class lessons and stay up to date with CRCC.',
          theme_color: '#0A5FA8',
          background_color: '#FFFFFF',
          display: 'standalone',
          orientation: 'portrait',
          start_url: preview ? './' : '/',
          scope: preview ? './' : '/',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Give', url: preview ? './#/give' : '/give', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
            { name: 'Sermons', url: preview ? './#/sermons' : '/sermons', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          ],
        },
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
          // Firebase SDK chunks and large images load on demand, not on first visit (saves members' data).
          globIgnores: ['**/index.esm*.js', '**/og.jpg', '**/maskable-512.png', '**/browser-*.js'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 900,
    },
  };
});
