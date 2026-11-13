/**
 * Regresiones de la revisión de código del editor de presupuestos.
 */
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Quote } from '@/data/api'
import type { QuoteData } from '@/model'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const ME = 'nacho@gmail.com'
const PARTNER = 'nahuel@gmail.com'

const item = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  widthMm: 1000,
  heightMm: 1000,
  depthMm: 250,
  back: null,
  finalPriceCents: 10000,
  ...over,
})

function dataOf(q: Quote): QuoteData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdBy, createdAt, updatedBy, updatedAt, ...data } = q
  return structuredClone(data) as QuoteData
}

describe('editor de presupuestos — revisión', () => {
  it('editar un mueble mientras otro socio quita otro guarda en el mueble correcto (por id, no por posición)', async () => {
    const api = new FakeDataApi()
    const q = api.seedQuote({ title: 'Placard', items: [item('i1', 'Alto'), item('i2', 'Medio'), item('i3', 'Bajo')] })
    renderApp(`/presupuestos/${q.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: 'Editar Bajo' }))

    // Mientras tanto otro socio quita el primero.
    act(() => {
      const stored = api.quotes.get(q.id)!
      api.updateQuote(q.id, { ...dataOf(stored), items: dataOf(stored).items.slice(1) }, PARTNER)
    })

    const name = screen.getByLabelText(/nombre del mueble/i)
    await userEvent.clear(name)
    await userEvent.type(name, 'Bajo nuevo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar mueble' }))
    await userEvent.click(screen.getByRole('button', { name: /guardar presupuesto/i }))

    await waitFor(() => expect(api.quotes.get(q.id)!.items.map((i) => i.name)).toEqual(['Medio', 'Bajo nuevo']))
  })

  it('marcar una compra no guarda otros cambios sin guardar del presupuesto', async () => {
    const api = new FakeDataApi()
    api.createMaterial({ name: 'Melamina blanca', sheetWidthMm: 2000, sheetHeightMm: 1000, thicknessMm: 19, sheetPriceCents: 4000, wasteFactor: 1 }, ME)
    const materialId = [...api.materials.keys()][0]
    const q = api.seedQuote({
      title: 'Cocina',
      status: 'aceptado',
      items: [item('i1', 'Alacena', { structure: { materialId } }), item('i2', 'Bajo', { structure: { materialId } })],
    })
    renderApp(`/presupuestos/${q.id}`, api)

    // Cambio sin guardar: desmarca un mueble como aceptado.
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Aceptado: Bajo' }))
    expect(screen.getByText(/cambios sin guardar/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: /melamina blanca/i }))

    await waitFor(() => expect(api.quotes.get(q.id)!.purchased).toHaveLength(1))
    expect(api.quotes.get(q.id)!.items.every((i) => i.accepted)).toBe(true)
    // El cambio local sigue pendiente (no se perdió ni se guardó solo).
    expect(screen.getByText(/cambios sin guardar/i)).toBeInTheDocument()
    expect(screen.queryByText(/otro socio cambió/i)).not.toBeInTheDocument()
  })

  it('dos guardados sobre la misma versión: el segundo se rechaza (concurrencia optimista)', async () => {
    const api = new FakeDataApi()
    const q = api.seedQuote({ title: 'Cocina' })
    const base = dataOf(api.quotes.get(q.id)!)
    await expect(api.updateQuote(q.id, { ...base, notes: 'A' }, ME).committed).resolves.toBeUndefined()
    await expect(api.updateQuote(q.id, { ...base, notes: 'B' }, PARTNER).committed).rejects.toThrow()
    expect(api.quotes.get(q.id)!.notes).toBe('A')
    expect(api.quotes.get(q.id)!.rev).toBe(1)
  })

  it('el presupuesto y su proyecto se guardan juntos: si el proyecto está desactualizado no se guarda ninguno', async () => {
    const api = new FakeDataApi()
    const c = api.seedClient({ name: 'Ana' })
    const p = api.seedProject({ title: 'Cocina', clientId: c.id, shares: { [ME]: 10000 } })
    const q = api.seedQuote({ title: 'Cocina', projectId: p.id, status: 'enviado' })
    const staleProject = { ...api.projects.get(p.id)! }
    api.updateProject(p.id, { ...staleProject, notes: 'cambio de otro socio' }, PARTNER)

    const res = api.updateQuote(q.id, { ...dataOf(api.quotes.get(q.id)!), status: 'aceptado' }, ME, {
      id: p.id,
      next: { ...staleProject, acceptedQuoteId: q.id },
    })
    await expect(res.committed).rejects.toThrow()
    expect(api.quotes.get(q.id)!.status).toBe('enviado')
    expect(api.projects.get(p.id)!.acceptedQuoteId).toBeNull()
  })

  it('vaciar la seña no la deja en 0 %', async () => {
    const api = new FakeDataApi()
    const q = api.seedQuote({ title: 'Cocina', depositBp: 3000 })
    renderApp(`/presupuestos/${q.id}`, api)
    const deposit = await screen.findByLabelText(/seña/i)
    await userEvent.clear(deposit)
    expect(screen.getByText(/un número entre 0 y 100/i)).toBeInTheDocument()
    await userEvent.type(deposit, '40')
    await userEvent.click(screen.getByRole('button', { name: /guardar presupuesto/i }))
    await waitFor(() => expect(api.quotes.get(q.id)!.depositBp).toBe(4000))
  })
})
