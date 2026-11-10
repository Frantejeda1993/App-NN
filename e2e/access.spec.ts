import { expect, test } from '@playwright/test'
import { loginAsMember, login, resetData } from './support'

test.beforeEach(resetData)

test('un socio de la lista entra y ve el inicio', async ({ page }) => {
  await loginAsMember(page)
  await expect(page.getByRole('navigation', { name: /principal/i }).getByRole('link', { name: 'Presupuestos' })).toBeVisible()
})

test('un email que no está en la lista no entra', async ({ page }) => {
  await login(page, 'intruso@ejemplo.test')
  await expect(page.getByRole('alert')).toContainText(/intruso@ejemplo\.test no tiene acceso/i)
  await expect(page.getByRole('heading', { name: /hola/i })).toHaveCount(0)
})
