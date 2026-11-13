import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDays, todayIso } from '@/domain/dates'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()
const SHARES = { 'nacho@gmail.com': 5000, 'nahuel@gmail.com': 5000, taller: 0 }

function seed() {
  const api = new FakeDataApi()
  const raquel = api.seedClient({ name: 'Raquel', phone: '610602069' })
  const cocina = api.seedProject({ title: 'Cocina', clientId: raquel.id, shares: SHARES })
  const placard = api.seedProject({ title: 'Placard', clientId: raquel.id, shares: SHARES })
  const add = (date: string, note: string, projectId: string | null) =>
    api.addContact(api.clients.get(raquel.id)!, { date, channel: 'whatsapp', note, projectId }, null, 'nahuel@gmail.com')
  add(addDays(today, -10), 'Primera visita cocina', cocina.id)
  add(addDays(today, -5), 'Consulta placard', placard.id)
  add(addDays(today, -2), 'Le mandé fotos de la cocina', cocina.id)
  add(addDays(today, -1), 'Saludo general', null)
  return { api, raquel, cocina, placard }
}

describe('contactos en la ficha del proyecto', () => {
  it('por defecto muestra solo los del proyecto, del más reciente al más antiguo', async () => {
    const { api, cocina } = seed()
    renderApp(`/proyectos/${cocina.id}`, api)

    const list = await screen.findByRole('list', { name: 'Contactos del proyecto' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Le mandé fotos de la cocina')
    expect(items[1]).toHaveTextContent('Primera visita cocina')
    expect(within(list).queryByText('Consulta placard')).not.toBeInTheDocument()
    expect(within(list).queryByText('Saludo general')).not.toBeInTheDocument()
    expect(items[0]).toHaveTextContent(/por nahuel/i)
  })

  it('el check muestra todos los contactos del cliente y marca los de este proyecto', async () => {
    const { api, cocina } = seed()
    renderApp(`/proyectos/${cocina.id}`, api)

    await userEvent.click(await screen.findByRole('checkbox', { name: /ver todos los contactos del cliente/i }))
    const list = screen.getByRole('list', { name: 'Contactos del proyecto' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Saludo general'),
      expect.stringContaining('Le mandé fotos de la cocina'),
      expect.stringContaining('Consulta placard'),
      expect.stringContaining('Primera visita cocina'),
    ])
    expect(within(items[1]).getByText('Este proyecto')).toBeInTheDocument()
    expect(within(items[3]).getByText('Este proyecto')).toBeInTheDocument()
    expect(within(items[0]).queryByText('Este proyecto')).not.toBeInTheDocument()
    expect(within(items[2]).queryByText('Este proyecto')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: /ver todos los contactos del cliente/i }))
    expect(within(screen.getByRole('list', { name: 'Contactos del proyecto' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('sin contactos del proyecto muestra un texto vacío', async () => {
    const api = new FakeDataApi()
    const raquel = api.seedClient({ name: 'Raquel' })
    const p = api.seedProject({ title: 'Cocina', clientId: raquel.id, shares: SHARES })
    renderApp(`/proyectos/${p.id}`, api)
    expect(await screen.findByText(/todavía no hay contactos registrados para este proyecto/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /ver todos los contactos del cliente/i }))
    expect(screen.getByText(/todavía no hay contactos con este cliente/i)).toBeInTheDocument()
  })

  it('un contacto nuevo queda vinculado al proyecto y aparece en la lista', async () => {
    const { api, raquel, cocina } = seed()
    renderApp(`/proyectos/${cocina.id}`, api)

    await userEvent.type(await screen.findByLabelText(/qué se habló/i), 'Visita para medir')
    await userEvent.click(screen.getByRole('button', { name: /registrar contacto/i }))

    await waitFor(() =>
      expect(api.contacts.get(raquel.id)).toContainEqual(
        expect.objectContaining({ note: 'Visita para medir', projectId: cocina.id, date: today, createdBy: 'nacho@gmail.com' }),
      ),
    )
    const list = screen.getByRole('list', { name: 'Contactos del proyecto' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Visita para medir')
    expect(api.clients.get(raquel.id)?.lastContactAt).toBe(today)
  })
})
