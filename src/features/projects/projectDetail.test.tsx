import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const SHARES = { 'nacho@gmail.com': 5000, 'nahuel@gmail.com': 5000, taller: 0 }

function seed() {
  const api = new FakeDataApi()
  const raquel = api.seedClient({ name: 'Raquel' })
  const p = api.seedProject({ title: 'Cocina', clientId: raquel.id, shares: SHARES })
  return { api, p }
}

describe('ficha del proyecto: estado y presupuestos', () => {
  it('mientras se edita no se puede cambiar el estado (evita el falso conflicto al guardar)', async () => {
    const { api, p } = seed()
    renderApp(`/proyectos/${p.id}`, api)

    const status = await screen.findByLabelText(/cambiar estado/i)
    expect(status).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect(status).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.getByLabelText(/cambiar estado/i)).toBeEnabled()
  })

  it('doble click en "Crear presupuesto" crea un solo borrador', async () => {
    const { api, p } = seed()
    renderApp(`/proyectos/${p.id}`, api)

    const create = await screen.findByRole('button', { name: /crear presupuesto/i })
    await waitFor(() => expect(create).toBeEnabled())
    await userEvent.dblClick(create)
    await waitFor(() => expect(api.quotes.size).toBe(1))
    expect([...api.quotes.values()][0]).toMatchObject({ projectId: p.id, status: 'borrador' })
  })
})
