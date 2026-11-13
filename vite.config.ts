/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sirve la app en /<repo>/ ; el workflow define VITE_BASE.
const base = process.env.VITE_BASE ?? '/'

/**
 * Content-Security-Policy (defensa en profundidad contra XSS). GitHub Pages no
 * permite cabeceras, así que va como <meta> (frame-ancestors no funciona ahí: el
 * anti-clickjacking lo hace src/lib/frameGuard.ts). Solo en el build: en
 * desarrollo Vite necesita scripts en línea y conectarse a los emuladores.
 * Scripts: solo los propios y los de Google que usa el login con popup.
 */
function cspPlugin(): Plugin {
  const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN
  const authFrame = authDomain ? ` https://${authDomain}` : ''
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://apis.google.com https://www.gstatic.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://apis.google.com",
    `frame-src https://*.firebaseapp.com https://*.web.app https://accounts.google.com https://apis.google.com${authFrame}`,
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    // Tailwind/React usan atributos style (posiciones del tour, canvas 3D, avisos).
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Taller NN',
        short_name: 'Taller',
        description: 'Gestión de proyectos, billetera y presupuestos del taller',
        lang: 'es',
        theme_color: '#78350f',
        background_color: '#efe7dc',
        display: 'standalone',
        // Generados a partir del logo del taller (fondo crema #efe7dc; el maskable con margen de seguridad).
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cachea el "app shell" para que la app abra sin conexión.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // jsPDF y three.js se importan recién al usarlos: se pre-empaquetan al arrancar
  // para que el servidor de desarrollo no recargue la página en ese momento.
  optimizeDeps: { include: ['jspdf', 'jspdf-autotable', 'three', '@react-three/fiber', '@react-three/drei'] },
  build: {
    rollupOptions: {
      output: {
        // Firebase en su propio chunk: cambia poco y queda en caché entre deploys.
        manualChunks: (id) => (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase') ? 'firebase' : undefined),
      },
    },
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Los tests de pantallas con muchos clics tardan más de 5 s con la suite completa en paralelo.
    testTimeout: 20000,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/lib/firebase.ts',
        'src/auth/firebaseAuthService.ts',
        'src/test/**',
        'src/components/ui/**',
      ],
    },
  },
})
