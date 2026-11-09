import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const ME = 'nacho@gmail.com'

function setup() {
  const api = new FakeDataApi()
  const client = api.seedClient({ name: 'Ana Pérez' })
  const project = api.seedProject({
    title: 'Cocina Ana',
    clientId: client.id,
    shares: { [ME]: 5000, taller: 5000 },
  })
  // Placa de 2 m² a 40 €.
  api.createMaterial(
    {
      name: 'Melamina blanca',
      sheetWidthMm: 2000,
      sheetHeightMm: 1000,
      thicknessMm: 19,
      sheetPriceCents: 4000,
      wasteFactor: 1,
    },
    ME,
  )
  const materialId = [...api.materials.keys()][0]
  return { api, client, project, materialId }
}

const item = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  name: 'Bajo 100',
  widthMm: 1000,
  heightMm: 1000,
  depthMm: 250,
  back: null,
  finalPriceCents: 10000,
  ...over,
})

describe('presupuestos', () => {
  it('se crea desde el proyecto, vinculado a él y a su cliente', async () => {
    const { api, project, client } = setup()
    renderApp(`/proyectos/${project.id}`, api)
    await userEvent.click(await screen.findByRole('button', { name: /crear presupuesto/i }))

    expect(await screen.findByRole('heading', { name: /cocina ana/i })).toBeInTheDocument()
    const q = [...api.quotes.values()][0]
    expect(q).toMatchObject({
      projectId: project.id,
      clientId: client.id,
      status: 'borrador',
      version: 1,
    })
    expect(q.validUntil).not.toBeNull()
  })

  it('agrega un mueble, calcula placas enteras y guarda los totales', async () => {
    const { api, materialId } = setup()
    const q = api.seedQuote({ title: 'Placard' })
    renderApp(`/presupuestos/${q.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /mueble en blanco/i }))
    await userEvent.type(screen.getByLabelText(/nombre del mueble/i), 'Caja')
    for (const [label, v] of [
      [/^ancho/i, '1000'],
      [/^alto/i, '1000'],
      [/^profundidad/i, '250'],
    ] as const) {
      await userEvent.clear(screen.getByLabelText(label))
      await userEvent.type(screen.getByLabelText(label), v)
    }
    await userEvent.selectOptions(screen.getByLabelText(/^estructura/i), materialId)
    await userEvent.selectOptions(screen.getByLabelText(/^trasera/i), '__none')
    await userEvent.click(screen.getByRole('button', { name: /agregar mueble/i }))

    const list = screen.getByRole('list', { name: /muebles del presupuesto/i })
    expect(within(list).getByText('Caja')).toBeInTheDocument()
    // estructura = 1 m² → 1 placa
    expect(within(screen.getByRole('list', { name: /placas por material/i })).getByText(/1 placa/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /guardar presupuesto/i }))
    await waitFor(() => expect(api.quotes.get(q.id)!.items).toHaveLength(1))
    const saved = api.quotes.get(q.id)!
    expect(saved.totals.totalCents).toBeGreaterThanOrEqual(4000)
    expect(saved.totals.totalCents).toBe(saved.totals.acceptedTotalCents)
  })

  it('valida el mueble antes de agregarlo', async () => {
    const { api } = setup()
    const q = api.seedQuote({ title: 'Placard' })
    renderApp(`/presupuestos/${q.id}`, api)
    await userEvent.click(await screen.findByRole('button', { name: /mueble en blanco/i }))
    await userEvent.click(screen.getByRole('button', { name: /agregar mueble/i }))
    expect(await screen.findByText(/revisá los datos del mueble/i)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /muebles del presupuesto/i })).toBeEmptyDOMElement()
  })

  it('enviar y aceptar en parte actualiza el proyecto y el total aceptado', async () => {
    const { api, project } = setup()
    const q = api.seedQuote({
      title: 'Cocina',
      projectId: project.id,
      items: [item(), item({ id: 'i2', name: 'Alto 100', finalPriceCents: 5000 })],
    })
    renderApp(`/presupuestos/${q.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /marcar enviado/i }))
    await waitFor(() => expect(api.quotes.get(q.id)!.status).toBe('enviado'))
    await waitFor(() => expect(api.projects.get(project.id)!.quotedAt).not.toBeNull())
    // Enviado: ya no se edita el contenido.
    expect(screen.getByLabelText(/^título/i)).toBeDisabled()

    await userEvent.click(await screen.findByRole('checkbox', { name: /aceptado: alto 100/i }))
    await userEvent.click(screen.getByRole('button', { name: /aceptado parcial/i }))

    await waitFor(() => expect(api.quotes.get(q.id)!.status).toBe('aceptado_parcial'))
    const saved = api.quotes.get(q.id)!
    expect(saved.totals).toMatchObject({
      totalCents: 15000,
      acceptedTotalCents: 10000,
    })
    expect(saved.items[1].accepted).toBe(false)
    await waitFor(() => expect(api.projects.get(project.id)!.acceptedQuoteId).toBe(q.id))
  })

  it('crea una nueva versión en borrador', async () => {
    const { api } = setup()
    const q = api.seedQuote({
      title: 'Cocina',
      status: 'enviado',
      sentAt: '2026-11-01',
      items: [item()],
    })
    renderApp(`/presupuestos/${q.id}`, api)
    await userEvent.click(await screen.findByRole('button', { name: /nueva versión/i }))

    await waitFor(() => expect(api.quotes.size).toBe(2))
    const v2 = [...api.quotes.values()].find((x) => x.id !== q.id)!
    expect(v2).toMatchObject({
      version: 2,
      parentQuoteId: q.id,
      status: 'borrador',
      sentAt: null,
    })
    expect(await screen.findByText('v2')).toBeInTheDocument()
  })

  it('la lista filtra por estado y busca por cliente', async () => {
    const { api, project, client } = setup()
    api.seedQuote({
      title: 'Borrador cocina',
      projectId: project.id,
      clientId: client.id,
    })
    api.seedQuote({ title: 'Baño viejo', status: 'rechazado' })
    renderApp('/presupuestos', api)

    const list = await screen.findByRole('list', { name: /^presupuestos$/i })
    expect(within(list).getByText(/borrador cocina/i)).toBeInTheDocument()
    expect(within(list).queryByText(/baño viejo/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /todos/i }))
    await userEvent.type(screen.getByLabelText(/buscar presupuestos/i), 'ana')
    expect(within(screen.getByRole('list', { name: /^presupuestos$/i })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('lista de compras: por proveedor, marca comprado y precarga el gasto', async () => {
    const { api, project } = setup()
    api.seedBox('Banco')
    api.createHardware({ name: 'Bisagra 110°', kind: 'bisagra', unit: 'u', priceCents: 460, supplier: 'Esteba' }, ME)
    const hingeId = [...api.hardware.keys()][0]
    const q = api.seedQuote({
      title: 'Cocina',
      projectId: project.id,
      status: 'aceptado',
      items: [item({ quantity: 2, doors: { count: 2, hinges: [{ hardwareId: hingeId, qty: 4 }] } }), item({ id: 'i2', accepted: false, doors: { count: 1, hinges: [{ hardwareId: hingeId, qty: 50 }] } })],
    })
    renderApp(`/presupuestos/${q.id}`, api)

    const esteba = await screen.findByRole('region', { name: /proveedor esteba/i })
    // Solo lo aceptado: 4 bisagras × 2 muebles.
    expect(esteba).toHaveTextContent('8 u')
    expect(esteba).toHaveTextContent('36,80 €')

    await userEvent.click(within(esteba).getByRole('checkbox', { name: /bisagra 110°/i }))
    await waitFor(() => expect(api.quotes.get(q.id)!.purchased).toEqual([`hw:${hingeId}`]))
    expect(within(esteba).getByText(/1\/1 comprado/)).toBeInTheDocument()

    await userEvent.click(within(esteba).getByRole('link', { name: /registrar gasto/i }))
    expect(await screen.findByRole('heading', { name: /nuevo movimiento/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('36,80')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/compra de materiales – esteba/i)).toBeInTheDocument()
  })

  it('la lista de compras no aparece en un borrador', async () => {
    const { api } = setup()
    const q = api.seedQuote({ title: 'Cocina', items: [item()] })
    renderApp(`/presupuestos/${q.id}`, api)
    expect(await screen.findByRole('heading', { name: /cocina/i })).toBeInTheDocument()
    expect(screen.queryByText(/lista de compras/i)).not.toBeInTheDocument()
  })
})
