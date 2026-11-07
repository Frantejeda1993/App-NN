import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDays, todayIso } from '@/domain/dates'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()
const SHARES = { 'nacho@gmail.com': 5000, 'nahuel@gmail.com': 5000, taller: 0 }

function seed() {
  const api = new FakeDataApi()
  const raquel = api.seedClient({ name: 'Raquel', phone: '610602069', lastContactAt: addDays(today, -4) })
  const abraham = api.seedClient({ name: 'Abraham' })
  return { api, raquel, abraham }
}

describe('lista de proyectos', () => {
  it('filtra por estado y busca por cliente', async () => {
    const { api, raquel, abraham } = seed()
    api.seedProject({ title: 'Cocina', clientId: raquel.id, status: 'en_proceso', shares: SHARES })
    api.seedProject({ title: 'Placard', clientId: abraham.id, status: 'cobrado', shares: SHARES })
    renderApp('/proyectos', api)

    const list = await screen.findByRole('list', { name: 'Proyectos' })
    expect(within(list).getByText('Cocina')).toBeInTheDocument()
    expect(within(list).queryByText('Placard')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Finalizados' }))
    expect(screen.getByText('Placard')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Todos' }))
    await userEvent.type(screen.getByRole('searchbox', { name: /buscar proyectos/i }), 'raquel')
    expect(screen.getByText('Cocina')).toBeInTheDocument()
    expect(screen.queryByText('Placard')).not.toBeInTheDocument()
  })

  it('marca la entrega vencida', async () => {
    const { api, raquel } = seed()
    api.seedProject({ title: 'Cocina', clientId: raquel.id, status: 'en_proceso', promisedDeliveryAt: addDays(today, -1), shares: SHARES })
    renderApp('/proyectos', api)
    expect(await screen.findByText(/\(vencida\)/)).toBeInTheDocument()
  })
})

describe('alta de proyecto', () => {
  it('desde el cliente, con el cliente elegido y reparto por defecto en partes iguales', async () => {
    const { api, raquel } = seed()
    renderApp(`/proyectos/nuevo?cliente=${raquel.id}`, api)

    expect(await screen.findByLabelText(/cliente \*/i)).toHaveValue(raquel.id)
    expect(screen.getByLabelText('Nacho')).toHaveValue('50')
    expect(screen.getByLabelText('Nahuel')).toHaveValue('50')
    expect(screen.getByLabelText(/taller/i)).toHaveValue('0')

    await userEvent.type(screen.getByLabelText(/título/i), 'Cocina en L')
    await userEvent.type(screen.getByLabelText(/gastos estimados/i), '1.760,50')
    await userEvent.click(screen.getByRole('button', { name: /crear proyecto/i }))

    expect(await screen.findByRole('heading', { name: 'Cocina en L' })).toBeInTheDocument()
    const saved = [...api.projects.values()][0]
    expect(saved).toMatchObject({
      clientId: raquel.id,
      status: 'pendiente',
      requestedAt: today,
      estimatedCostCents: 176050,
      shares: SHARES,
      createdBy: 'nacho@gmail.com',
    })
  })

  it('no deja guardar si la participación no suma 100 %', async () => {
    const { api, raquel } = seed()
    renderApp(`/proyectos/nuevo?cliente=${raquel.id}`, api)

    await userEvent.type(await screen.findByLabelText(/título/i), 'Cocina')
    const nacho = screen.getByLabelText('Nacho')
    await userEvent.clear(nacho)
    await userEvent.type(nacho, '40')
    expect(screen.getByRole('status')).toHaveTextContent(/faltan 10 %/i)

    await userEvent.click(screen.getByRole('button', { name: /crear proyecto/i }))
    expect(await screen.findByText(/no se puede guardar/i)).toBeInTheDocument()
    expect(api.projects.size).toBe(0)

    const taller = screen.getByLabelText(/taller/i)
    await userEvent.clear(taller)
    await userEvent.type(taller, '10')
    expect(screen.getByRole('status')).toHaveTextContent(/total 100 %/i)
    await userEvent.click(screen.getByRole('button', { name: /crear proyecto/i }))
    await waitFor(() => expect(api.projects.size).toBe(1))
    expect([...api.projects.values()][0].shares).toEqual({ 'nacho@gmail.com': 4000, 'nahuel@gmail.com': 5000, taller: 1000 })
  })

  it('usa el reparto por defecto configurado en Ajustes', async () => {
    const { api, raquel } = seed()
    api.settings = { ...api.settings, defaultShares: { 'nacho@gmail.com': 4000, 'nahuel@gmail.com': 4000, taller: 2000 } }
    renderApp(`/proyectos/nuevo?cliente=${raquel.id}`, api)
    expect(await screen.findByLabelText(/taller/i)).toHaveValue('20')
  })
})

describe('ficha del proyecto', () => {
  it('muestra cliente, participación y permite cambiar el estado', async () => {
    const { api, raquel } = seed()
    const p = api.seedProject({ title: 'Cocina', clientId: raquel.id, shares: { 'nacho@gmail.com': 6000, 'nahuel@gmail.com': 3000, taller: 1000 } })
    renderApp(`/proyectos/${p.id}`, api)

    expect(await screen.findByRole('heading', { name: 'Cocina' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Raquel' })).toHaveAttribute('href', `/clientes/${raquel.id}`)
    const shares = screen.getByRole('list', { name: 'Participación' })
    expect(within(shares).getByText('Nacho').nextSibling).toHaveTextContent('60 %')
    expect(within(shares).getByText(/taller/i).nextSibling).toHaveTextContent('10 %')

    await userEvent.selectOptions(screen.getByLabelText(/cambiar estado/i), 'entregado')
    await waitFor(() => expect(api.projects.get(p.id)).toMatchObject({ status: 'entregado', deliveredAt: today }))
  })

  it('editar conserva estado y datos que no están en el formulario', async () => {
    const { api, raquel } = seed()
    const p = api.seedProject({ title: 'Cocina', clientId: raquel.id, status: 'en_proceso', acceptedQuoteId: 'q1', shares: SHARES })
    renderApp(`/proyectos/${p.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))
    const title = screen.getByLabelText(/título/i)
    await userEvent.clear(title)
    await userEvent.type(title, 'Cocina grande')
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByRole('heading', { name: 'Cocina grande' })).toBeInTheDocument()
    expect(api.projects.get(p.id)).toMatchObject({ status: 'en_proceso', acceptedQuoteId: 'q1' })
  })

  it('si otro socio cambia el proyecto mientras se edita, avisa y no pisa su cambio', async () => {
    const { api, raquel } = seed()
    const p = api.seedProject({ title: 'Cocina', clientId: raquel.id, notes: '', shares: SHARES })
    renderApp(`/proyectos/${p.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))
    // Otro socio guarda notas mientras tanto (un milisegundo después, para que cambie la versión).
    await new Promise((r) => setTimeout(r, 2))
    act(() => {
      api.updateProject(p.id, { ...api.projects.get(p.id)!, notes: 'Cambio de Nahuel' }, 'nahuel@gmail.com')
    })
    const title = screen.getByLabelText(/título/i)
    await userEvent.clear(title)
    await userEvent.type(title, 'Mi cambio')
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByText(/otro socio modificó este proyecto/i)).toBeInTheDocument()
    expect(api.projects.get(p.id)).toMatchObject({ title: 'Cocina', notes: 'Cambio de Nahuel' })
  })

  it('volver a "en proceso" borra la fecha de entrega', async () => {
    const { api, raquel } = seed()
    const p = api.seedProject({ title: 'Cocina', clientId: raquel.id, status: 'entregado', deliveredAt: today, shares: SHARES })
    renderApp(`/proyectos/${p.id}`, api)
    await userEvent.selectOptions(await screen.findByLabelText(/cambiar estado/i), 'en_proceso')
    await waitFor(() => expect(api.projects.get(p.id)).toMatchObject({ status: 'en_proceso', deliveredAt: null }))
  })

  it('un contacto registrado desde el proyecto queda vinculado y se ve en el cliente', async () => {
    const { api, raquel } = seed()
    const p = api.seedProject({ title: 'Cocina', clientId: raquel.id, shares: SHARES })
    const { unmount } = renderApp(`/proyectos/${p.id}`, api)

    await userEvent.type(await screen.findByLabelText(/qué se habló/i), 'Visita para medir')
    await userEvent.click(screen.getByRole('button', { name: /registrar contacto/i }))
    await waitFor(() => expect(api.contacts.get(raquel.id)?.[0]).toMatchObject({ projectId: p.id }))
    unmount()

    renderApp(`/clientes/${raquel.id}`, api)
    const projects = await screen.findByRole('list', { name: /proyectos del cliente/i })
    expect(within(projects).getByText('Cocina')).toBeInTheDocument()
    const history = screen.getByRole('list', { name: /historial de contactos/i })
    expect(within(history).getByText(/· cocina/i)).toBeInTheDocument()
  })
})

describe('ajustes: reparto por defecto', () => {
  it('se guarda y valida el 100 %', async () => {
    const api = new FakeDataApi()
    renderApp('/ajustes', api)

    const taller = await screen.findByLabelText(/fondo común/i)
    await userEvent.clear(taller)
    await userEvent.type(taller, '20')
    await userEvent.click(screen.getByRole('button', { name: /guardar reparto/i }))
    expect(await screen.findByText(/no se puede guardar/i)).toBeInTheDocument()

    for (const name of ['Nacho', 'Nahuel']) {
      const input = screen.getByLabelText(name)
      await userEvent.clear(input)
      await userEvent.type(input, '40')
    }
    await userEvent.click(screen.getByRole('button', { name: /guardar reparto/i }))
    await waitFor(() =>
      expect(api.settings.defaultShares).toEqual({ 'nacho@gmail.com': 4000, 'nahuel@gmail.com': 4000, taller: 2000 }),
    )
  })
})
