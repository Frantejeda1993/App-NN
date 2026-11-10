import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { loadCatalogAndTemplates, loginAsMember, resetData, seedProject } from './support'

test.beforeEach(resetData)

/** ¿El lienzo 3D dibujó algo? (varios colores distintos, no un fondo liso). */
async function canvasHasDrawing(page: Page) {
  return page.locator('[aria-label="Vista 3D"] canvas').first().evaluate((c: HTMLCanvasElement) => {
    const tmp = document.createElement('canvas')
    tmp.width = 64
    tmp.height = 64
    const ctx = tmp.getContext('2d')!
    ctx.drawImage(c, 0, 0, 64, 64)
    const data = ctx.getImageData(0, 0, 64, 64).data
    const colors = new Set<string>()
    for (let i = 0; i < data.length; i += 4) colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`)
    return colors.size
  })
}

async function quoteWithTwoItems(page: Page) {
  const projectId = await seedProject()
  await loginAsMember(page)
  await loadCatalogAndTemplates(page)
  await page.goto(`/#/proyectos/${projectId}`)
  await page.getByRole('button', { name: /crear presupuesto/i }).click()
  for (const name of ['Bajo cocina 60', 'Placard 2 puertas con cajones']) {
    const select = page.getByLabel('Agregar desde plantilla')
    await select.selectOption((await select.locator('option', { hasText: name }).getAttribute('value'))!)
    await page.getByRole('button', { name: /agregar mueble/i }).click()
  }
  await page.getByRole('button', { name: /guardar presupuesto/i }).click()
  await expect(page.getByText('Cambios sin guardar')).toHaveCount(0)
}

test('el visor 3D dibuja los muebles y abre las puertas', async ({ page }) => {
  await quoteWithTwoItems(page)

  await page.getByRole('button', { name: /ver todos en 3d/i }).click()
  const dialog = page.getByRole('dialog', { name: /vista 3d/i })
  await expect(dialog.locator('canvas')).toBeVisible()
  await expect(dialog.getByText('Placard 2 puertas con cajones')).toBeVisible() // etiqueta sobre el mueble
  await expect.poll(() => canvasHasDrawing(page), { timeout: 15_000 }).toBeGreaterThan(8)

  await dialog.getByRole('button', { name: /abrir puertas/i }).click()
  await expect(dialog.getByRole('button', { name: /cerrar puertas/i })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')

  // En la ventana del mueble, la pestaña 3D sigue lo que se edita.
  await page.getByRole('button', { name: /editar bajo cocina 60/i }).click()
  await page.getByRole('tab', { name: /vista 3d/i }).click()
  await expect.poll(() => canvasHasDrawing(page), { timeout: 15_000 }).toBeGreaterThan(8)
})

test('el PDF puede incluir la vista 3D', async ({ page }) => {
  await quoteWithTwoItems(page)
  const download = async () => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /descargar pdf/i }).click()])
    return (await readFile((await d.path())!)).length
  }
  const with3d = await download()
  await page.getByLabel(/incluir vista 3d/i).uncheck()
  const without = await download()
  expect(with3d).toBeGreaterThan(without + 20_000) // la imagen pesa
})
