import { expect, test, type Page } from '@playwright/test'
import { loadCatalogAndTemplates, loginAsMember, resetData, seedProject } from './support'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
test.beforeEach(resetData)

async function noHorizontalScroll(page: Page) {
  const { scroll, client, offenders } = await page.evaluate(() => {
    const client = document.documentElement.clientWidth
    // Los elementos más profundos que se salen por la derecha: indican al culpable.
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => el.getBoundingClientRect().right > client + 0.5 && ![...el.children].some((c) => c.getBoundingClientRect().right > client + 0.5))
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} "${(el.textContent ?? '').trim().slice(0, 30)}" → ${Math.round(el.getBoundingClientRect().right)}px`)
    return { scroll: document.documentElement.scrollWidth, client, offenders }
  })
  expect(scroll, `scroll horizontal en ${page.url()}: ${offenders.join(' | ')}`).toBeLessThanOrEqual(client)
}

test('en el celular se navega con el menú inferior y nada desborda a lo ancho', async ({ page }) => {
  const projectId = await seedProject()
  await loginAsMember(page)
  await loadCatalogAndTemplates(page)

  const nav = page.getByRole('navigation', { name: /principal móvil/i })
  await expect(nav).toBeVisible()
  await expect(page.getByRole('navigation', { name: /^principal$/i })).toBeHidden()

  for (const [label, heading] of [
    ['Clientes', /clientes/i],
    ['Proyectos', /proyectos/i],
    ['Billetera', /billetera/i],
    ['Presupuestos', /presupuestos/i],
  ] as const) {
    await nav.getByRole('link', { name: label }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await noHorizontalScroll(page)
  }

  // Pantallas más cargadas: proyecto y editor de presupuesto con un mueble.
  await page.goto(`/#/proyectos/${projectId}`)
  await expect(page.getByRole('heading', { name: 'Cocina Ana' })).toBeVisible()
  await noHorizontalScroll(page)
  await page.getByRole('button', { name: /crear presupuesto/i }).click()
  const select = page.getByLabel('Agregar desde plantilla')
  await select.selectOption((await select.locator('option', { hasText: 'Placard 2 puertas con cajones' }).getAttribute('value'))!)
  await noHorizontalScroll(page)
  await page.getByRole('button', { name: /agregar mueble/i }).click()
  await expect(page.getByRole('list', { name: /muebles del presupuesto/i })).toContainText('Placard 2 puertas con cajones')
  await noHorizontalScroll(page)

  // El editor de plantillas usa el mismo editor de mueble.
  await page.goto('/#/catalogo/plantillas/nueva')
  await expect(page.getByRole('heading', { name: /nueva plantilla/i })).toBeVisible()
  await noHorizontalScroll(page)
})
