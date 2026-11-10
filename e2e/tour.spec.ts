import { expect, test, type Page } from '@playwright/test'
import { DEV, deleteDoc, loginAsMember, readDoc, resetData } from './support'

// Pasos sin elemento que resaltar (van centrados a propósito).
const CENTERED = new Set(['bienvenida', 'presupuestos-por-que', 'fin'])

test.beforeEach(async () => {
  await resetData()
  await deleteDoc(`userPrefs/${DEV}`) // usuario que nunca vio el tour
})

/** Recorre todos los pasos: cada uno debe encontrar su elemento en pantalla. */
async function walkTour(page: Page) {
  const overlay = page.locator('[data-tour-step]')
  const seen: string[] = []
  for (let i = 0; i < 30; i++) {
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const id = (await overlay.getAttribute('data-tour-step'))!
    seen.push(id)
    if (!CENTERED.has(id)) await expect(overlay, `el paso "${id}" no encontró su elemento`).toHaveAttribute('data-tour-anchored', 'true')
    // El globo siempre entra completo en la pantalla.
    const box = (await dialog.boundingBox())!
    const vp = page.viewportSize()!
    expect(box.y, `globo fuera de pantalla en "${id}"`).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height, `globo fuera de pantalla en "${id}"`).toBeLessThanOrEqual(vp.height)
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width)
    const next = dialog.getByRole('button', { name: /siguiente|terminar/i })
    const finishing = (await next.textContent())?.includes('Terminar')
    await next.click()
    if (finishing) break
    await expect(overlay).not.toHaveAttribute('data-tour-step', id)
  }
  return seen
}

test('el tour arranca solo la primera vez, recorre todo y se repite desde Ajustes', async ({ page }) => {
  await loginAsMember(page)
  await expect(page.getByRole('dialog', { name: /bienvenido a taller nn/i })).toBeVisible()
  const seen = await walkTour(page)
  expect(seen).toHaveLength(13)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/#\/ajustes$/)

  // Queda guardado en el servidor: al recargar no vuelve.
  await expect.poll(async () => (await readDoc(`userPrefs/${DEV}`))?.tourSeenVersion).toEqual({ integerValue: '1' })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Repetir desde Ajustes; Escape lo cierra.
  await page.getByRole('button', { name: /repetir el tour/i }).click()
  await expect(page.getByRole('dialog', { name: /bienvenido a taller nn/i })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test.describe('en el celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('cada paso encuentra su elemento y el globo entra en la pantalla', async ({ page }) => {
    await loginAsMember(page)
    const overlay = page.locator('[data-tour-step]')
    for (let i = 0; i < 13; i++) {
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const id = (await overlay.getAttribute('data-tour-step'))!
      if (!CENTERED.has(id)) await expect(overlay, `el paso "${id}" no encontró su elemento`).toHaveAttribute('data-tour-anchored', 'true')
      const box = (await dialog.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(390)
      expect(box.y + box.height).toBeLessThanOrEqual(844)
      await dialog.getByRole('button', { name: /siguiente|terminar/i }).click()
      if (i < 12) await expect(overlay).not.toHaveAttribute('data-tour-step', id)
    }
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
