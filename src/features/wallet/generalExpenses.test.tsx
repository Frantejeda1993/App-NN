import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { todayIso } from '@/domain/dates'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()
const SHARES = { 'nacho@gmail.com': 5000, 'nahuel@gmail.com': 5000 }

function seed() {
  const api = new FakeDataApi()
  const efectivo = api.seedBox('Efectivo')
  return { api, efectivo }
}

describe('gastos generales', () => {
  it('crea un gasto fijo con reparto', async () => {
    const { api } = seed()
    renderApp('/billetera/gastos/nuevo?tipo=fijo', api)

    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Alquiler del taller')
    await userEvent.type(screen.getByLabelText(/importe habitual/i), '250')
    await userEvent.selectOptions(screen.getByLabelText(/vence el día/i), '1')
    await userEvent.click(screen.getByRole('button', { name: /crear gasto fijo/i }))

    const fixed = await screen.findByRole('list', { name: 'Gastos fijos' })
    expect(within(fixed).getByText('Alquiler del taller')).toBeInTheDocument()
    // Creado hoy: si su día ya pasó este mes, recién vence el mes que viene.
    expect([...api.generalExpenses.values()][0]).toMatchObject({
      kind: 'fijo',
      amountCents: 25000,
      dayOfMonth: 1,
      shares: { 'nacho@gmail.com': 5000, 'nahuel@gmail.com': 5000, taller: 0 },
    })
  })

  it('no deja guardar un reparto que no suma 100 %', async () => {
    const { api } = seed()
    renderApp('/billetera/gastos/nuevo?tipo=fijo', api)
    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Luz')
    await userEvent.type(screen.getByLabelText(/importe habitual/i), '80')
    const nacho = screen.getByLabelText('Nacho')
    await userEvent.clear(nacho)
    await userEvent.type(nacho, '30')
    await userEvent.click(screen.getByRole('button', { name: /crear gasto fijo/i }))
    expect(await screen.findByText(/no se puede guardar/i)).toBeInTheDocument()
    expect(api.generalExpenses.size).toBe(0)
  })

  it('el recordatorio de Inicio lleva al pago ya completo y desaparece al pagar', async () => {
    const { api, efectivo } = seed()
    const g = api.seedGeneralExpense({ name: 'Alquiler', kind: 'fijo', category: 'Taller', amountCents: 25000, dayOfMonth: 1, shares: SHARES })
    // Gasto que existe desde hace meses.
    api.generalExpenses.set(g.id, { ...g, createdAt: Timestamp.fromDate(new Date(2025, 0, 1)) })
    const home = renderApp('/', api)

    const due = await screen.findByRole('list', { name: /gastos fijos por pagar este mes/i })
    expect(within(due).getByText(/alquiler/i)).toBeInTheDocument()
    expect(within(due).getByRole('link', { name: /registrar pago/i })).toHaveAttribute(
      'href',
      `/billetera/nuevo?tipo=gasto_general&gasto=${g.id}`,
    )
    home.unmount()

    renderApp(`/billetera/nuevo?tipo=gasto_general&gasto=${g.id}`, api)
    expect(await screen.findByLabelText(/gasto general \*/i)).toHaveValue(g.id)
    expect(screen.getByLabelText(/importe/i)).toHaveValue('250,00')
    expect(screen.getByLabelText(/categoría/i)).toHaveValue('Taller')
    await userEvent.selectOptions(screen.getByLabelText(/^caja \*/i), efectivo.id)
    await userEvent.click(screen.getByRole('button', { name: /registrar movimiento/i }))

    await waitFor(() => expect(api.movements.size).toBe(1))
    expect([...api.movements.values()][0]).toMatchObject({
      type: 'gasto_general',
      generalExpenseId: g.id,
      amountCents: 25000,
      boxId: efectivo.id,
      date: today,
    })
    expect(await screen.findByText(/pagado este mes/i)).toBeInTheDocument()
  })

  it('un gasto esporádico se crea y pasa directo al pago', async () => {
    const { api } = seed()
    renderApp('/billetera/gastos/nuevo?tipo=esporadico', api)

    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Router Dewalt')
    await userEvent.type(screen.getByLabelText(/^importe/i), '263,68')
    await userEvent.click(screen.getByRole('button', { name: /crear y registrar pago/i }))

    expect(await screen.findByRole('heading', { name: /nuevo movimiento/i })).toBeInTheDocument()
    const g = [...api.generalExpenses.values()][0]
    expect(g).toMatchObject({ kind: 'esporadico', dayOfMonth: null, category: 'Herramientas' })
    expect(screen.getByLabelText(/gasto general \*/i)).toHaveValue(g.id)
    expect(screen.getByLabelText(/importe/i)).toHaveValue('263,68')
  })

  it('el pago del gasto general puede salir del bolsillo de un socio (genera deuda)', async () => {
    const { api } = seed()
    const g = api.seedGeneralExpense({ name: 'Broca 35mm', kind: 'esporadico', category: 'Herramientas', amountCents: 4048, shares: SHARES })
    renderApp(`/billetera/nuevo?tipo=gasto_general&gasto=${g.id}`, api)

    await userEvent.click(await screen.findByLabelText(/lo pagó un socio de su bolsillo/i))
    await userEvent.selectOptions(screen.getByLabelText(/socio que pagó/i), 'nacho@gmail.com')
    await userEvent.click(screen.getByRole('button', { name: /registrar movimiento/i }))
    await waitFor(() => expect([...api.movements.values()][0]).toMatchObject({ paidBy: 'nacho@gmail.com', boxId: null }))
  })

  it('al cambiar de gasto se actualiza lo que completó la app, no lo que escribió el usuario', async () => {
    const { api } = seed()
    const alquiler = api.seedGeneralExpense({ name: 'Alquiler', kind: 'fijo', category: 'Taller', amountCents: 80000, dayOfMonth: 1, shares: SHARES })
    const luz = api.seedGeneralExpense({ name: 'Luz', kind: 'fijo', category: 'Servicios', amountCents: 6500, dayOfMonth: 1, shares: SHARES })
    renderApp(`/billetera/nuevo?tipo=gasto_general&gasto=${alquiler.id}`, api)

    const description = await screen.findByLabelText(/descripción/i)
    await userEvent.clear(description)
    await userEvent.type(description, 'Alquiler + expensas')
    await userEvent.selectOptions(screen.getByLabelText(/gasto general \*/i), luz.id)

    expect(screen.getByLabelText(/importe/i)).toHaveValue('65,00')
    expect(screen.getByLabelText(/categoría/i)).toHaveValue('Servicios')
    expect(screen.getByLabelText(/descripción/i)).toHaveValue('Alquiler + expensas')
  })

  it('se desactiva y deja de pedir pago', async () => {
    const { api } = seed()
    const g = api.seedGeneralExpense({ name: 'Internet', kind: 'fijo', category: 'Servicios', amountCents: 3000, dayOfMonth: 1, shares: SHARES })
    renderApp('/billetera?tab=gastos', api)

    const fixed = await screen.findByRole('list', { name: 'Gastos fijos' })
    await userEvent.click(within(fixed).getByRole('button', { name: /desactivar/i }))
    await waitFor(() => expect(api.generalExpenses.get(g.id)?.active).toBe(false))
    expect(within(fixed).queryByRole('link', { name: /registrar pago/i })).not.toBeInTheDocument()
  })
})
