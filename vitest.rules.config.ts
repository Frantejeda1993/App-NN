import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Tests de las reglas de Firestore y de la capa de datos: corren contra el
// emulador (`npm run test:rules` lo levanta y lo apaga).
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
    // Conectarse al emulador recién levantado puede tardar más de 10 s.
    hookTimeout: 60000,
    fileParallelism: false,
  },
})
