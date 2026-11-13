/**
 * Configuración inicial de la billetera y reparto del fondo común del taller.
 */
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { todayIso } from '@/domain/dates'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()
const NACHO = 'nacho@gmail.com'
const NAHUEL = 'nahuel@gmail.com'

/** Proyecto 100 % del taller con 900 € cobrados en la caja Banco. */
function seed() {
  const api = new FakeDataApi()
  const caja = api.seedBox('Banco')
  const client = api.seedClient({ name: 'Abraham' })
  const p = api.seedProject({ title: 'Mesa', clientId: client.id, shares: { taller: 10000 } })
  api.seedMovement({ type: 'cobro', amountCents: 90000, date: today, projectId: p.id, boxId: caja.id })
  return { api, caja }
}

const kpi = (label: RegExp) => screen.getByText(label).nextElementSibling
const row = (name: RegExp) => screen.getByRole('row', { name })

describe('reparto del fondo común del taller', () => {
  it('pregunta cuánto sacar, muestra el cálculo equitativo y lo pasa a los socios sin mover las cajas', async () => {
    const { api } = seed()
    renderApp('/billetera', api)

    expect(await screen.findByText(/fondo común del taller/i)).toBeInTheDocument()
    expect(kpi(/^fondo común del taller$/i)).toHaveTextContent('900,00 €')
    await userEvent.click(screen.getByRole('link', { name: /repartir entre socios/i }))

    const form = await screen.findByRole('form', { name: /reparto del fondo del taller/i })
    await userEvent.type(within(form).getByLabelText(/cuánto querés repartir/i), '600')
    const calc = within(form).getByRole('list', { name: /cálculo del reparto/i })
    expect(calc).toHaveTextContent(/Nacho\s*300,00 €/)
    expect(calc).toHaveTextContent(/Nahuel\s*300,00 €/)
    expect(within(form).getByText(/al taller le quedan 300,00 €/i)).toBeInTheDocument()

    await userEvent.click(within(form).getByRole('button', { name: /registrar reparto/i }))

    await waitFor(() => expect([...api.movements.values()].filter((m) => m.type === 'reparto')).toHaveLength(2))
    const repartos = [...api.movements.values()].filter((m) => m.type === 'reparto')
    expect(repartos.map((m) => [m.memberEmail, m.amountCents, m.boxId]).sort()).toEqual([
      [NACHO, 30000, null],
      [NAHUEL, 30000, null],
    ])

    // De vuelta en el resumen: cajas igual, el taller bajó y cada socio subió.
    expect(await screen.findByText(/dinero en cajas/i)).toBeInTheDocument()
    expect(kpi(/dinero en cajas/i)).toHaveTextContent('900,00 €')
    expect(kpi(/^fondo común del taller$/i)).toHaveTextContent('300,00 €')
    expect(row(/nacho/i)).toHaveTextContent(/300,00 €$/)
    expect(screen.getByRole('status')).not.toHaveTextContent(/no cuadra/i)
  })

  it('no deja repartir más que el fondo disponible', async () => {
    const { api } = seed()
    renderApp('/billetera/nuevo?tipo=reparto', api)
    const form = await screen.findByRole('form', { name: /reparto del fondo del taller/i })
    await userEvent.type(within(form).getByLabelText(/cuánto querés repartir/i), '1000')
    await userEvent.click(within(form).getByRole('button', { name: /registrar reparto/i }))
    expect(await within(form).findByText(/supera el fondo común/i)).toBeInTheDocument()
    expect([...api.movements.values()].some((m) => m.type === 'reparto')).toBe(false)
  })

  it('se puede repartir solo entre algunos socios', async () => {
    const { api } = seed()
    renderApp('/billetera/nuevo?tipo=reparto', api)
    const form = await screen.findByRole('form', { name: /reparto del fondo del taller/i })
    await userEvent.click(within(form).getByRole('checkbox', { name: /nahuel/i }))
    await userEvent.type(within(form).getByLabelText(/cuánto querés repartir/i), '100')
    await userEvent.click(within(form).getByRole('button', { name: /registrar reparto/i }))
    await waitFor(() => expect([...api.movements.values()].filter((m) => m.type === 'reparto')).toHaveLength(1))
    expect([...api.movements.values()].find((m) => m.type === 'reparto')).toMatchObject({ memberEmail: NACHO, amountCents: 10000 })
  })
})

describe('configuración inicial de la billetera', () => {
  it('carga saldos iniciales de cajas y socios, y el resumen los suma', async () => {
    const { api, caja } = seed()
    renderApp('/billetera?tab=inicial', api)

    await userEvent.type(await screen.findByLabelText('Banco'), '500')
    await userEvent.type(screen.getByLabelText('Aportes: Nacho'), '300')
    await userEvent.type(screen.getByLabelText('Proyectos: Taller (fondo común)'), '200')
    expect(screen.getByRole('status')).toHaveTextContent(/suma de todos: 500,00 €/i)
    await userEvent.click(screen.getByRole('button', { name: /guardar configuración inicial/i }))

    await waitFor(() => expect(api.openingExists).toBe(true))
    expect(api.opening.boxes).toEqual({ [caja.id]: 50000 })
    expect(api.opening.people[NACHO]).toMatchObject({ aportes: 30000 })
    expect(api.opening.people.taller).toMatchObject({ projects: 20000 })

    await userEvent.click(screen.getByRole('tab', { name: /resumen/i }))
    expect(kpi(/dinero en cajas/i)).toHaveTextContent('1400,00 €')
    expect(row(/nacho/i)).toHaveTextContent(/300,00 €$/)
    expect(screen.getByRole('status')).not.toHaveTextContent(/no cuadra/i)
  })

  it('la deuda inicial con un socio aparece en el reintegro', async () => {
    const { api } = seed()
    api.saveOpeningBalances({ date: null, boxes: {}, notes: '', people: { [NAHUEL]: { projects: 0, general: 0, aportes: 0, retiros: 0, debt: 4500 } } })
    renderApp('/billetera?tab=movimientos', api)
    expect(await screen.findByText(/el taller les debe/i)).toBeInTheDocument()
    expect(screen.getByText(/nahuel/i, { selector: 'li' })).toHaveTextContent('45,00 €')
  })

  it('el resumen sugiere cargarla si todavía no existe', async () => {
    renderApp('/billetera', seed().api)
    expect(await screen.findByRole('link', { name: /cargá la configuración inicial/i })).toHaveAttribute('href', '/billetera?tab=inicial')
  })
})
