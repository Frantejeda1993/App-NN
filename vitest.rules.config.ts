import { defineConfig } from 'vitest/config'

// Tests de las reglas de Firestore: corren contra el emulador
// (`npm run test:rules` lo levanta y lo apaga).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
})
