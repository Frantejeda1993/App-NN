import { expect, test } from '@playwright/test'
import { euros, kpi, loginAsMember, readDoc, resetData, seedProject } from './support'

test.beforeEach(resetData)

test('un movimiento se edita con historial y se elimina con motivo sin perderse', async ({ page }) => {
  const projectId = await seedProject()
  await loginAsMember(page)

  // Alta de un cobro
  await page.goto(`/#/billetera/nuevo?tipo=cobro&proyecto=${projectId}`)
  await page.getByLabel(/^importe/i).fill('500')
  await page.getByLabel(/caja donde entra/i).selectOption({ label: 'Banco' })
  await page.getByLabel(/descripción/i).fill('Seña cocina')
  await page.getByRole('button', { name: /registrar movimiento/i }).click()
  await page.goto('/#/billetera?tab=movimientos')
  await page.getByRole('link', { name: /seña cocina/i }).click()
  const detailUrl = page.url()
  const id = detailUrl.split('/').pop()!

  // Edición: 500 → 450, queda en el historial
  await page.getByRole('button', { name: /editar/i }).click()
  await page.getByLabel(/^importe/i).fill('450')
  await page.getByRole('button', { name: /guardar cambios/i }).click()
  const history = page.getByRole('list', { name: /historial del movimiento/i })
  await expect(history.getByRole('listitem').filter({ hasText: /editado|modificado/i }).first()).toContainText(/500,00\s€\s→\s450,00\s€/)
  await expect.poll(async () => (await readDoc(`movements/${id}`))?.version).toEqual({ integerValue: '2' })

  // Baja con motivo: no se borra, queda marcado y en el historial
  await page.getByRole('button', { name: /^eliminar/i }).first().click()
  await page.getByLabel(/motivo/i).fill('Cargado dos veces')
  await page.getByRole('button', { name: /^eliminar$/i }).last().click()
  await expect(page.getByText(/motivo de la baja/i)).toBeVisible()
  await expect(history).toContainText(/cargado dos veces/i)
  // La pantalla se actualiza con la escritura local; el servidor la confirma un instante después.
  await expect.poll(async () => (await readDoc(`movements/${id}`))?.deleted).toEqual({ booleanValue: true })

  // Fuera de los saldos y de la lista (salvo "mostrar eliminados")
  await page.goto('/#/billetera')
  await expect(kpi(page, 'Dinero en cajas')).toHaveText(euros('0,00'))
  await page.goto('/#/billetera?tab=movimientos')
  await expect(page.getByRole('link', { name: /seña cocina/i })).toHaveCount(0)
  await page.getByLabel(/mostrar eliminados/i).check()
  await expect(page.getByRole('link', { name: /seña cocina/i })).toBeVisible()
})
