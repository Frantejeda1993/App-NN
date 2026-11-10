import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas de punta a punta contra los emuladores de Firebase (mismas reglas que
 * producción). Correr con `npm run test:e2e`, que levanta los emuladores; la app
 * se sirve en un puerto propio (5175) para no chocar con `dev:emulators`.
 * Comparten el emulador: un solo worker, cada prueba empieza con datos limpios.
 */
const PORT = 5175

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --mode emulator --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
