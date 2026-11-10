import { expect, test } from '@playwright/test'
import { DEV, loginAsMember, login, resetData, setMemberActive } from './support'

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

test('si desactivan al socio con la sesión abierta, sale y ve el aviso', async ({ page }) => {
  await loginAsMember(page)
  await setMemberActive(DEV, false)
  // Cierra sesión, borra los datos del dispositivo (recarga) y muestra el aviso.
  await expect(page.getByRole('alert')).toContainText(/dev@taller\.test no tiene acceso/i, { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /entrar con google/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /hola, dev/i })).toHaveCount(0)
})
