import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { listDocs, loadCatalogAndTemplates, loginAsMember, resetData, seedProject } from './support'

test.beforeEach(resetData)

/** Presupuesto del proyecto con el "Bajo cocina 60" (puertas con bisagras de Esteba), enviado y aceptado. */
async function acceptedQuote(page: Page, projectId: string) {
  await page.goto(`/#/proyectos/${projectId}`)
  await page.getByRole('button', { name: /crear presupuesto/i }).click()
  const select = page.getByLabel('Agregar desde plantilla')
  await select.selectOption((await select.locator('option', { hasText: 'Bajo cocina 60' }).getAttribute('value'))!)
  await page.getByRole('button', { name: /agregar mueble/i }).click()
  await page.getByRole('button', { name: /guardar presupuesto/i }).click()
  await expect(page.getByText('Cambios sin guardar')).toHaveCount(0)
  await page.getByRole('button', { name: /marcar enviado/i }).click()
  await page.getByRole('button', { name: /aceptado \(todo\)/i }).click()
  await expect(page.getByRole('heading', { name: /lista de compras/i })).toBeVisible()
}

test('lista de compras: marcar comprado y registrar el gasto del proveedor', async ({ page }) => {
  const projectId = await seedProject()
  await loginAsMember(page)
  await loadCatalogAndTemplates(page)
  await acceptedQuote(page, projectId)

  const esteba = page.getByRole('region', { name: /proveedor esteba/i })
  await expect(esteba).toContainText('4 u')
  await esteba.getByRole('checkbox', { name: /bisagra/i }).check()
  await expect(esteba).toContainText('1/1 comprado')
  await expect.poll(async () => JSON.stringify((await listDocs('quotes'))[0]?.fields.purchased ?? null)).toContain('hw:')

  // Lo comprado se comparte: sigue marcado al recargar.
  await page.reload()
  await expect(page.getByRole('region', { name: /proveedor esteba/i }).getByRole('checkbox', { name: /bisagra/i })).toBeChecked()

  await page.getByRole('region', { name: /proveedor esteba/i }).getByRole('link', { name: /registrar gasto/i }).click()
  await expect(page.getByLabel(/descripción/i)).toHaveValue('Compra de materiales – Esteba')
  await page.getByLabel(/^caja \*/i).selectOption({ label: 'Banco' })
  await page.getByRole('button', { name: /registrar movimiento/i }).click()

  // Vuelve al proyecto y el gasto aparece en sus movimientos.
  await expect(page.getByRole('heading', { name: 'Cocina Ana' })).toBeVisible()
  await expect(page.getByText('Compra de materiales – Esteba')).toBeVisible()
})

test('el PDF del presupuesto se descarga con nombre legible y es un PDF válido', async ({ page }) => {
  const projectId = await seedProject()
  await loginAsMember(page)
  await loadCatalogAndTemplates(page)
  await acceptedQuote(page, projectId)

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /descargar pdf/i }).click()])
  expect(download.suggestedFilename()).toBe('Presupuesto - Ana Pérez - Cocina Ana.pdf')
  const bytes = await readFile((await download.path())!)
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  expect(bytes.length).toBeGreaterThan(20_000) // incluye el logo
})
