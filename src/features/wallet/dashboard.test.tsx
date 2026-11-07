import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayIso } from '@/domain/dates'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()
const NACHO = 'nacho@gmail.com'
const NAHUEL = 'nahuel@gmail.com'

function seed() {
  const api = new FakeDataApi()
  const caja = api.seedBox('Banco')
  const client = api.seedClient({ name: 'Abraham' })
  const cocina = api.seedProject({
    title: 'Cocina',
    clientId: client.id,
    status: 'en_proceso',
    shares: { [NACHO]: 4000, [NAHUEL]: 4000, taller: 2000 },
  })
  const alquiler = api.seedGeneralExpense({ name: 'Alquiler', kind: 'fijo', category: 'Taller', amountCents: 20000, dayOfMonth: 1, shares: { [NACHO]: 5000, [NAHUEL]: 5000 } })
  // Cobro 1000, gasto 300 pagado, gasto 100 pendiente, router 50 pagado por Nacho.
  api.seedMovement({ type: 'cobro', amountCents: 100000, date: today, projectId: cocina.id, boxId: caja.id })
  api.seedMovement({ type: 'gasto_proyecto', amountCents: 30000, date: today, projectId: cocina.id, boxId: caja.id })
  api.seedMovement({ type: 'gasto_proyecto', status: 'pendiente_pago', amountCents: 10000, date: today, projectId: cocina.id })
  api.seedMovement({ type: 'gasto_proyecto', amountCents: 5000, date: today, projectId: cocina.id, paidBy: NACHO })
  api.seedMovement({ type: 'gasto_general', amountCents: 20000, date: today, generalExpenseId: alquiler.id, boxId: caja.id })
  api.seedMovement({ type: 'retiro', amountCents: 10000, date: today, memberEmail: NAHUEL, boxId: caja.id })
  api.seedQuote({ title: 'Cocina v1', projectId: cocina.id, status: 'aceptado', totals: { subtotalCents: 250000, totalCents: 250000, acceptedTotalCents: 250000 } })
  api.seedQuote({ title: 'Baño', status: 'enviado', totals: { subtotalCents: 80000, totalCents: 80000, acceptedTotalCents: 80000 } })
  return api
}

const kpi = (label: RegExp) => screen.getByText(label).nextElementSibling

describe('Resumen de la billetera', () => {
  it('es la pestaña por defecto y muestra los totales', async () => {
    renderApp('/billetera', seed())
    // Cajas: 1000 − 300 − 200 − 100 = 400
    expect(await screen.findByText(/dinero en cajas/i)).toBeInTheDocument()
    expect(kpi(/dinero en cajas/i)).toHaveTextContent('400,00 €')
    expect(kpi(/gastos pendientes de pago/i)).toHaveTextContent('100,00 €')
    expect(kpi(/el taller debe a socios/i)).toHaveTextContent('50,00 €')
    expect(kpi(/disponible real/i)).toHaveTextContent('250,00 €')
    // Aceptado 2500 − cobrado 1000; enviado 800.
    expect(kpi(/por cobrar de presupuestos aceptados/i)).toHaveTextContent('1500,00 €')
    expect(kpi(/presupuestos enviados/i)).toHaveTextContent('800,00 €')
  })

  it('reparte a cada socio y al taller, y la suma cuadra con cajas − pendientes', async () => {
    renderApp('/billetera', seed())
    const table = await screen.findByRole('table', { name: /reparto por socio/i })
    // Ganancia cocina = 1000 − 300 − 100 − 50 = 550 → 220 / 220 / 110.
    const row = (name: string | RegExp) => within(table).getByRole('rowheader', { name }).closest('tr')!
    // Nacho: 220 − 100 (alquiler) + 50 (le deben) = 170
    expect(row('Nacho')).toHaveTextContent('170,00 €')
    // Nahuel: 220 − 100 − 100 (retiro) = 20
    expect(row('Nahuel')).toHaveTextContent('20,00 €')
    expect(row(/taller/i)).toHaveTextContent('110,00 €')
    // 170 + 20 + 110 = 300 = 400 − 100
    expect(screen.getByRole('status')).toHaveTextContent(/suma de todos: 300,00 € = cajas 400,00 € − pendientes 100,00 €/i)
  })

  it('muestra el cobro por proyecto con % cobrado', async () => {
    renderApp('/billetera', seed())
    const table = await screen.findByRole('table', { name: /cobro por proyecto/i })
    const row = within(table).getByRole('rowheader', { name: /cocina/i }).closest('tr')!
    expect(row).toHaveTextContent('2500,00 €')
    expect(row).toHaveTextContent('1000,00 €')
    expect(row).toHaveTextContent('1500,00 €')
    expect(row).toHaveTextContent('40 %')
  })

  it('sin datos no se rompe', async () => {
    renderApp('/billetera', new FakeDataApi())
    expect(await screen.findByText(/todavía no hay cobros ni presupuestos aceptados/i)).toBeInTheDocument()
    expect(kpi(/dinero en cajas/i)).toHaveTextContent('0,00 €')
  })
})
