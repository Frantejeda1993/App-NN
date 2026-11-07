import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { todayIso } from '@/domain/dates'
import { MovementDataSchema } from '@/model'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()
const SHARES = { 'nacho@gmail.com': 5000, 'nahuel@gmail.com': 5000, taller: 0 }

function seed() {
  const api = new FakeDataApi()
  const efectivo = api.seedBox('Efectivo')
  const banco = api.seedBox('Banco')
  const client = api.seedClient({ name: 'Raquel' })
  const cocina = api.seedProject({ title: 'Cocina', clientId: client.id, shares: SHARES, estimatedCostCents: 50000 })
  const bano = api.seedProject({ title: 'Baño', clientId: client.id, shares: SHARES })
  return { api, efectivo, banco, cocina, bano }
}

const movements = (api: FakeDataApi) => [...api.movements.values()]

describe('nuevo movimiento', () => {
  it('registra un cobro de seña en una caja', async () => {
    const { api, efectivo, cocina } = seed()
    renderApp('/billetera/nuevo', api)

    await userEvent.type(await screen.findByLabelText(/importe/i), '1.500')
    await userEvent.selectOptions(screen.getByLabelText(/proyecto/i), cocina.id)
    await userEvent.selectOptions(screen.getByLabelText(/caja donde entra/i), efectivo.id)
    await userEvent.type(screen.getByLabelText(/descripción/i), 'Seña')
    await userEvent.click(screen.getByRole('button', { name: /registrar movimiento/i }))

    await waitFor(() => expect(movements(api)).toHaveLength(1))
    expect(movements(api)[0]).toMatchObject({
      type: 'cobro',
      amountCents: 150000,
      projectId: cocina.id,
      boxId: efectivo.id,
      date: today,
      version: 1,
      createdBy: 'nacho@gmail.com',
    })
  })

  it('valida los campos según el tipo', async () => {
    const { api } = seed()
    renderApp('/billetera/nuevo', api)
    await userEvent.click(await screen.findByRole('button', { name: /registrar movimiento/i }))
    expect(await screen.findByText(/escribí un importe/i)).toBeInTheDocument()
    expect(screen.getByText(/un cobro debe ser de un proyecto/i)).toBeInTheDocument()
    expect(movements(api)).toHaveLength(0)
  })

  it('gasto pagado del bolsillo de un socio: genera deuda y el reintegro la muestra', async () => {
    const { api, efectivo, cocina } = seed()
    const { unmount } = renderApp(`/billetera/nuevo?tipo=gasto_proyecto&proyecto=${cocina.id}`, api)

    await userEvent.type(await screen.findByLabelText(/importe/i), '263,68')
    await userEvent.click(screen.getByLabelText(/lo pagó un socio de su bolsillo/i))
    await userEvent.selectOptions(screen.getByLabelText(/socio que pagó/i), 'nacho@gmail.com')
    await userEvent.type(screen.getByLabelText(/categoría/i), 'Maderas')
    await userEvent.click(screen.getByRole('button', { name: /registrar movimiento/i }))
    await waitFor(() => expect(movements(api)).toHaveLength(1))
    expect(movements(api)[0]).toMatchObject({ paidBy: 'nacho@gmail.com', boxId: null, projectId: cocina.id })
    unmount()

    const r = renderApp('/billetera?tab=movimientos', api)
    expect(await screen.findByText(/el taller les debe/i)).toBeInTheDocument()
    expect(screen.getByText('263,68 €')).toBeInTheDocument()
    r.unmount()

    renderApp('/billetera/nuevo?tipo=reintegro', api)
    await userEvent.selectOptions(await screen.findByLabelText(/^socio \*/i), 'nacho@gmail.com')
    expect(screen.getByText(/el taller le debe 263,68 €/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/importe/i), '263,68')
    await userEvent.selectOptions(screen.getByLabelText(/^caja \*/i), efectivo.id)
    await userEvent.click(screen.getByRole('button', { name: /registrar movimiento/i }))
    await waitFor(() => expect(movements(api)).toHaveLength(2))
  })

  it('gasto repartido entre proyectos: las partes deben sumar el total', async () => {
    const { api, banco, cocina, bano } = seed()
    renderApp('/billetera/nuevo?tipo=gasto_proyecto', api)

    await userEvent.type(await screen.findByLabelText(/importe/i), '100')
    await userEvent.click(screen.getByLabelText(/repartir entre varios proyectos/i))
    await userEvent.selectOptions(screen.getByLabelText('Proyecto 1'), cocina.id)
    await userEvent.type(screen.getByLabelText('Importe proyecto 1'), '30')
    await userEvent.selectOptions(screen.getByLabelText('Proyecto 2'), bano.id)
    await userEvent.type(screen.getByLabelText('Importe proyecto 2'), '60')
    await userEvent.selectOptions(screen.getByLabelText(/^caja \*/i), banco.id)
    await userEvent.click(screen.getByRole('button', { name: /registrar movimiento/i }))
    expect(await screen.findByText(/deben sumar el total/i)).toBeInTheDocument()

    const second = screen.getByLabelText('Importe proyecto 2')
    await userEvent.clear(second)
    await userEvent.type(second, '70')
    await userEvent.click(screen.getByRole('button', { name: /registrar movimiento/i }))
    await waitFor(() => expect(movements(api)).toHaveLength(1))
    expect(movements(api)[0].projectSplits).toEqual([
      { projectId: cocina.id, amountCents: 3000 },
      { projectId: bano.id, amountCents: 7000 },
    ])
  })
})

describe('cajas', () => {
  it('crea cajas y muestra el saldo según los movimientos', async () => {
    const { api, efectivo, banco, cocina } = seed()
    api.seedMovement({ type: 'cobro', amountCents: 50000, date: today, projectId: cocina.id, boxId: efectivo.id })
    api.seedMovement({ type: 'transferencia', amountCents: 20000, date: today, boxId: efectivo.id, toBoxId: banco.id })
    api.seedMovement({ type: 'gasto_proyecto', amountCents: 5000, date: today, projectId: cocina.id, boxId: banco.id })
    renderApp('/billetera?tab=cajas', api)

    const list = await screen.findByRole('list', { name: 'Cajas' })
    expect(within(list).getByText('Efectivo').closest('li')).toHaveTextContent('300,00 €')
    expect(within(list).getByText('Banco').closest('li')).toHaveTextContent('150,00 €')
    expect(screen.getByText(/total:/i)).toHaveTextContent('450,00 €')

    await userEvent.type(screen.getByLabelText(/nueva caja/i), 'Bizum')
    await userEvent.click(screen.getByRole('button', { name: /crear caja/i }))
    expect(await within(list).findByText('Bizum')).toBeInTheDocument()
  })
})

describe('cajas: no desactivar con saldo', () => {
  it('avisa y no desactiva una caja que tiene dinero', async () => {
    const { api, efectivo, cocina } = seed()
    api.seedMovement({ type: 'cobro', amountCents: 50000, date: today, projectId: cocina.id, boxId: efectivo.id })
    renderApp('/billetera?tab=cajas', api)
    const list = await screen.findByRole('list', { name: 'Cajas' })
    const row = within(list).getByText('Efectivo').closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: /desactivar/i }))
    expect(await screen.findByText(/transferí el saldo antes de desactivarla/i)).toBeInTheDocument()
    expect(api.boxes.get(efectivo.id)?.active).toBe(true)
  })
})

describe('detalle: si el servidor rechaza, no se pierde lo escrito', () => {
  it('reabre la edición con lo que se había escrito', async () => {
    const { api, efectivo, cocina } = seed()
    const m = api.seedMovement({ type: 'cobro', amountCents: 50000, date: today, projectId: cocina.id, boxId: efectivo.id })
    renderApp(`/billetera/movimientos/${m.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))
    const amount = screen.getByLabelText(/importe/i)
    await userEvent.clear(amount)
    await userEvent.type(amount, '777')
    api.failNextWrite = Object.assign(new Error('denied'), { code: 'permission-denied' })
    // El fake simula la escritura con writeVersion; forzamos el rechazo a nivel API.
    const original = api.updateMovement.bind(api)
    api.updateMovement = (...args) => {
      const r = original(...args)
      const committed = Promise.reject(Object.assign(new Error('denied'), { code: 'permission-denied' }))
      committed.catch(() => {})
      return { id: r.id, committed }
    }
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByText(/no se pudo guardar/i)).toBeInTheDocument()
    expect(await screen.findByLabelText(/importe/i)).toHaveValue('777,00')
  })
})

describe('detalle: editar, eliminar e historial', () => {
  it('editar crea una nueva versión y el historial muestra el cambio', async () => {
    const { api, efectivo, cocina } = seed()
    const m = api.seedMovement({ type: 'cobro', amountCents: 50000, date: today, projectId: cocina.id, boxId: efectivo.id })
    renderApp(`/billetera/movimientos/${m.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))
    const amount = screen.getByLabelText(/importe/i)
    await userEvent.clear(amount)
    await userEvent.type(amount, '600')
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    const history = await screen.findByRole('list', { name: /historial del movimiento/i })
    await waitFor(() => expect(within(history).getByText(/importe: 500,00 € → 600,00 €/i)).toBeInTheDocument())
    expect(api.movements.get(m.id)).toMatchObject({ amountCents: 60000, version: 2 })
  })

  it('si otro socio lo edita mientras tanto, avisa y no pisa su cambio', async () => {
    const { api, efectivo, cocina } = seed()
    const m = api.seedMovement({ type: 'cobro', amountCents: 50000, date: today, projectId: cocina.id, boxId: efectivo.id })
    renderApp(`/billetera/movimientos/${m.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))
    act(() => {
      const current = api.movements.get(m.id)!
      api.updateMovement(current, { ...MovementDataSchema.parse(current), amountCents: 55000 }, 'nahuel@gmail.com')
    })
    const amount = screen.getByLabelText(/importe/i)
    await userEvent.clear(amount)
    await userEvent.type(amount, '700')
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByText(/otro socio modificó este movimiento/i)).toBeInTheDocument()
    expect(api.movements.get(m.id)).toMatchObject({ amountCents: 55000, version: 2, updatedBy: 'nahuel@gmail.com' })
  })

  it('eliminar pide motivo, deja el movimiento tachado y fuera de la lista', async () => {
    const { api, efectivo, cocina } = seed()
    const m = api.seedMovement({ type: 'cobro', amountCents: 50000, date: today, projectId: cocina.id, boxId: efectivo.id, description: 'Seña duplicada' })
    const { unmount } = renderApp(`/billetera/movimientos/${m.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /eliminar/i }))
    const confirm = screen.getAllByRole('button', { name: /^eliminar$/i }).at(-1)!
    expect(confirm).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/motivo/i), 'Cargado dos veces')
    await userEvent.click(confirm)

    await waitFor(() => expect(api.movements.get(m.id)).toMatchObject({ deleted: true, deletedReason: 'Cargado dos veces', version: 2 }))
    expect(await screen.findByText(/motivo de la baja/i)).toBeInTheDocument()
    unmount()

    renderApp('/billetera?tab=movimientos', api)
    expect(await screen.findByText(/no hay movimientos con estos filtros/i)).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText(/mostrar eliminados/i))
    expect(screen.getByText(/seña duplicada/i)).toBeInTheDocument()
  })

  it('un gasto pendiente se marca como pagado desde una caja', async () => {
    const { api, banco, cocina } = seed()
    const m = api.seedMovement({ type: 'gasto_proyecto', status: 'pendiente_pago', amountCents: 12000, date: today, projectId: cocina.id })
    renderApp(`/billetera/movimientos/${m.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /marcar pagado/i }))
    await userEvent.selectOptions(screen.getByLabelText(/pagado desde/i), `box:${banco.id}`)
    await userEvent.click(screen.getByRole('button', { name: /confirmar pago/i }))
    await waitFor(() => expect(api.movements.get(m.id)).toMatchObject({ status: 'pagado', boxId: banco.id, version: 2 }))
  })
})

describe('cobros y gastos en la ficha del proyecto', () => {
  it('muestra los movimientos del proyecto, totales y estimado vs. real', async () => {
    const { api, efectivo, cocina, bano } = seed()
    api.seedMovement({ type: 'cobro', amountCents: 150000, date: today, projectId: cocina.id, boxId: efectivo.id })
    api.seedMovement({ type: 'gasto_proyecto', amountCents: 40000, date: today, projectId: cocina.id, boxId: efectivo.id })
    api.seedMovement({
      type: 'gasto_proyecto',
      amountCents: 30000,
      date: today,
      boxId: efectivo.id,
      projectSplits: [
        { projectId: cocina.id, amountCents: 20000 },
        { projectId: bano.id, amountCents: 10000 },
      ],
    })
    renderApp(`/proyectos/${cocina.id}`, api)

    const totals = await screen.findByLabelText(/totales del proyecto/i)
    expect(within(totals).getByText('Cobrado').nextSibling).toHaveTextContent('1500,00 €')
    expect(within(totals).getByText('Gastado').nextSibling).toHaveTextContent('600,00 €')
    expect(within(totals).getByText(/estimado vs\. real/i).nextSibling).toHaveTextContent('600,00 € / 500,00 €')
    expect(screen.getByRole('list', { name: /movimientos del proyecto/i }).children).toHaveLength(3)
    expect(screen.getByRole('link', { name: /registrar cobro/i })).toHaveAttribute(
      'href',
      `/billetera/nuevo?tipo=cobro&proyecto=${cocina.id}&volver=proyecto`,
    )
  })
})
