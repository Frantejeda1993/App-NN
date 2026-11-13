import { screen, within } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { addDays, todayIso } from '@/domain/dates'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()
const SHARES = { 'nacho@gmail.com': 5000, 'nahuel@gmail.com': 5000 }

describe('Inicio: avisos de contacto', () => {
  it('sin clientes para contactar muestra el mensaje tranquilo', async () => {
    const api = new FakeDataApi()
    api.seedClient({ name: 'Raquel', lastContactAt: addDays(today, -2) })
    renderApp('/', api)
    expect(await screen.findByText(/no hay clientes para contactar hoy/i)).toBeInTheDocument()
  })

  it('separa los vencidos de los que llevan mucho sin contacto y respeta el seguimiento', async () => {
    const api = new FakeDataApi()
    api.settings = { ...api.settings, contactAlertDays: 14 }
    const hoy = api.seedClient({ name: 'Raquel', nextContactAt: today, lastContactAt: addDays(today, -3) })
    api.seedClient({ name: 'Abraham', nextContactAt: addDays(today, -5), lastContactAt: addDays(today, -20) })
    api.seedClient({ name: 'Futuro', nextContactAt: addDays(today, 3), lastContactAt: addDays(today, -30) })
    const viejo = api.seedClient({ name: 'Lucía', lastContactAt: addDays(today, -30) })
    api.seedClient({ name: 'Reciente', lastContactAt: addDays(today, -10) })
    api.seedClient({ name: 'Sin seguimiento', followUp: false, nextContactAt: addDays(today, -1), lastContactAt: addDays(today, -60) })
    renderApp('/', api)

    const due = await screen.findByRole('list', { name: 'Contactar hoy o vencidos' })
    const dueNames = within(due)
      .getAllByRole('link')
      .map((a) => a.textContent)
    // El más vencido primero.
    expect(dueNames).toEqual([expect.stringContaining('Abraham'), expect.stringContaining('Raquel')])
    expect(within(due).getByRole('link', { name: /raquel/i })).toHaveAttribute('href', `/clientes/${hoy.id}`)

    const stale = screen.getByRole('list', { name: 'Sin contacto hace más de 14 días' })
    expect(within(stale).getAllByRole('link')).toHaveLength(1)
    expect(within(stale).getByRole('link', { name: /lucía/i })).toHaveAttribute('href', `/clientes/${viejo.id}`)

    for (const name of ['Futuro', 'Reciente', 'Sin seguimiento']) {
      expect(screen.queryByText(name)).not.toBeInTheDocument()
    }
  })
})

describe('Inicio: gastos fijos por pagar', () => {
  function seedExpenses() {
    const api = new FakeDataApi()
    const box = api.seedBox('Efectivo')
    const old = Timestamp.fromDate(new Date(2025, 0, 1))
    const add = (data: Record<string, unknown>) => {
      const g = api.seedGeneralExpense({ category: 'Taller', amountCents: 25000, shares: SHARES, ...data })
      api.generalExpenses.set(g.id, { ...g, createdAt: old })
      return g
    }
    return { api, box, add }
  }

  it('lista los fijos activos que ya vencieron este mes, con el link para pagar', async () => {
    const { api, add } = seedExpenses()
    const alquiler = add({ name: 'Alquiler', kind: 'fijo', dayOfMonth: 1 })
    add({ name: 'Broca', kind: 'esporadico' })
    add({ name: 'Internet', kind: 'fijo', dayOfMonth: 1, active: false })
    renderApp('/', api)

    const list = await screen.findByRole('list', { name: /gastos fijos por pagar este mes/i })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText(/alquiler/i)).toBeInTheDocument()
    expect(within(list).getByText(/vence el día 1/i)).toBeInTheDocument()
    expect(within(list).getByRole('link', { name: /registrar pago/i })).toHaveAttribute(
      'href',
      `/billetera/nuevo?tipo=gasto_general&gasto=${alquiler.id}`,
    )
  })

  it('no aparece si el pago de este mes ya está registrado', async () => {
    const { api, box, add } = seedExpenses()
    const alquiler = add({ name: 'Alquiler', kind: 'fijo', dayOfMonth: 1 })
    api.seedMovement({ type: 'gasto_general', amountCents: 25000, date: today, generalExpenseId: alquiler.id, boxId: box.id })
    renderApp('/', api)

    expect(await screen.findByRole('heading', { name: /hola/i })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /gastos fijos por pagar este mes/i })).not.toBeInTheDocument()
  })
})
