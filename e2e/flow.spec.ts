import { expect, test, type Page } from '@playwright/test'
import { euros, kpi, loadCatalogAndTemplates, loginAsMember, resetData } from './support'

test.beforeEach(resetData)

/** Agrega un mueble desde plantilla con precio final a mano (importes deterministas). */
async function addTemplateItem(page: Page, template: string, price: string) {
  const select = page.getByLabel('Agregar desde plantilla')
  const value = await select.locator('option', { hasText: template }).getAttribute('value')
  await select.selectOption(value!)
  await page.getByLabel(/precio final del mueble/i).fill(price)
  await page.getByRole('button', { name: /agregar mueble/i }).click()
  await expect(page.getByRole('list', { name: /muebles del presupuesto/i }).getByText(template)).toBeVisible()
}

test('del cliente al cobro: presupuesto aceptado en parte alimenta lo pendiente de cobro', async ({ page }) => {
  await loginAsMember(page)
  await loadCatalogAndTemplates(page)

  // Cliente y proyecto
  await page.goto('/#/clientes/nuevo')
  await page.getByLabel(/^nombre/i).fill('Ana Pérez')
  await page.getByRole('button', { name: /crear cliente/i }).click()
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()

  await page.goto('/#/proyectos/nuevo')
  await page.getByLabel(/^título/i).fill('Cocina Ana')
  await page.getByLabel(/^cliente/i).selectOption({ label: 'Ana Pérez' })
  await page.getByRole('button', { name: /crear proyecto/i }).click()
  await expect(page.getByRole('heading', { name: 'Cocina Ana' })).toBeVisible()

  // Presupuesto desde el proyecto, con dos muebles de plantilla
  await page.getByRole('button', { name: /crear presupuesto/i }).click()
  await expect(page.getByRole('heading', { name: /cocina ana/i })).toBeVisible()
  await addTemplateItem(page, 'Bajo cocina 60', '1000')
  await addTemplateItem(page, 'Alto cocina 60', '500')
  await page.getByRole('button', { name: /guardar presupuesto/i }).click()
  await expect(page.getByText('Cambios sin guardar')).toHaveCount(0)

  // Enviado → cuenta como "enviado sin respuesta"
  await page.getByRole('button', { name: /marcar enviado/i }).click()
  await expect(page.getByText('Enviado', { exact: true })).toBeVisible()
  const quoteUrl = page.url()
  await page.goto('/#/billetera')
  await expect(kpi(page, 'Presupuestos enviados (sin respuesta)')).toHaveText(euros('1.500,00'))

  // Aceptado en parte (sin el alto) → pasa a "por cobrar"
  await page.goto(quoteUrl)
  await page.getByRole('checkbox', { name: /aceptado: alto cocina 60/i }).uncheck()
  await page.getByRole('button', { name: /aceptado parcial/i }).click()
  await expect(page.getByText('Aceptado parcial', { exact: true })).toBeVisible()
  await expect(page.getByText('Total aceptado').locator('xpath=following-sibling::span[1]')).toHaveText(euros('1.000,00'))

  await page.goto('/#/billetera')
  await expect(kpi(page, 'Por cobrar de presupuestos aceptados')).toHaveText(euros('1.000,00'))
  await expect(kpi(page, 'Presupuestos enviados (sin respuesta)')).toHaveText(euros('0,00'))

  // Seña de 300 € desde el proyecto → baja lo pendiente
  await page.goto(quoteUrl)
  await page.getByRole('link', { name: 'Cocina Ana' }).first().click()
  await page.getByRole('link', { name: /registrar cobro/i }).click()
  await page.getByLabel(/^importe/i).fill('300')
  await page.getByLabel(/caja donde entra/i).selectOption({ label: 'Banco' })
  await page.getByLabel(/descripción/i).fill('Seña')
  await page.getByRole('button', { name: /registrar movimiento/i }).click()
  await expect(page.getByRole('heading', { name: 'Cocina Ana' })).toBeVisible()

  await page.goto('/#/billetera')
  await expect(kpi(page, 'Por cobrar de presupuestos aceptados')).toHaveText(euros('700,00'))
  await expect(kpi(page, 'Dinero en cajas')).toHaveText(euros('300,00'))
})
