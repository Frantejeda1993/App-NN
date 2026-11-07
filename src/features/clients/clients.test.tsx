import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDays, todayIso } from '@/domain/dates'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const today = todayIso()

describe('lista de clientes', () => {
  it('muestra los clientes en orden y filtra sin distinguir tildes', async () => {
    const api = new FakeDataApi()
    api.seedClient({ name: 'Raquel Montmeló', phone: '610602069', source: 'Wallapop' })
    api.seedClient({ name: 'Abraham', source: 'Recomendación' })
    renderApp('/clientes', api)

    await screen.findByText('Abraham')
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/clientes/c'))
    expect(links[0]).toHaveTextContent('Abraham')
    expect(links[1]).toHaveTextContent('Raquel')

    await userEvent.type(screen.getByRole('searchbox', { name: /buscar clientes/i }), 'montmelo')
    expect(screen.queryByText('Abraham')).not.toBeInTheDocument()
    expect(screen.getByText('Raquel Montmeló')).toBeInTheDocument()
  })

  it('sin clientes muestra un estado vacío', async () => {
    renderApp('/clientes')
    expect(await screen.findByText(/todavía no hay clientes/i)).toBeInTheDocument()
  })
})

describe('alta de cliente', () => {
  it('exige el nombre', async () => {
    renderApp('/clientes/nuevo')
    await userEvent.click(await screen.findByRole('button', { name: /crear cliente/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/obligatorio/i)
  })

  it('crea el cliente firmado por el socio y abre su ficha', async () => {
    const { api } = renderApp('/clientes/nuevo')
    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Natalia')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '611 222 333')
    await userEvent.type(screen.getByLabelText(/origen/i), 'Instagram')
    await userEvent.click(screen.getByRole('button', { name: /crear cliente/i }))

    expect(await screen.findByRole('heading', { name: 'Natalia' })).toBeInTheDocument()
    const saved = [...api.clients.values()][0]
    expect(saved).toMatchObject({ name: 'Natalia', source: 'Instagram', createdBy: 'nacho@gmail.com', followUp: true })
  })
})

describe('ficha del cliente', () => {
  it('tiene enlace directo a WhatsApp con prefijo de España', async () => {
    const api = new FakeDataApi()
    const c = api.seedClient({ name: 'James', phone: '610 602 069' })
    renderApp(`/clientes/${c.id}`, api)
    const link = await screen.findByRole('link', { name: /whatsapp/i })
    expect(link).toHaveAttribute('href', 'https://wa.me/34610602069')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('registrar un contacto lo agrega al historial y agenda el próximo', async () => {
    const api = new FakeDataApi()
    const c = api.seedClient({ name: 'James' })
    renderApp(`/clientes/${c.id}`, api)

    await userEvent.selectOptions(await screen.findByLabelText(/medio/i), 'llamada')
    await userEvent.type(screen.getByLabelText(/qué se habló/i), 'Le pasé el presupuesto')
    await userEvent.click(screen.getByRole('button', { name: '+7 días' }))
    await userEvent.click(screen.getByRole('button', { name: /registrar contacto/i }))

    const history = await screen.findByRole('list', { name: /historial de contactos/i })
    expect(within(history).getByText(/le pasé el presupuesto/i)).toBeInTheDocument()
    expect(within(history).getByText(/llamada/i)).toBeInTheDocument()
    expect(within(history).getByText(/por nacho/i)).toBeInTheDocument()
    expect(api.clients.get(c.id)).toMatchObject({ lastContactAt: today, nextContactAt: addDays(today, 7) })
  })

  it('editar no pierde las fechas de contacto', async () => {
    const api = new FakeDataApi()
    const c = api.seedClient({ name: 'James', lastContactAt: '2026-10-01', nextContactAt: '2026-12-01' })
    renderApp(`/clientes/${c.id}`, api)

    await userEvent.click(await screen.findByRole('button', { name: /editar/i }))
    const name = screen.getByLabelText(/nombre/i)
    await userEvent.clear(name)
    await userEvent.type(name, 'James Smith')
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    expect(await screen.findByRole('heading', { name: 'James Smith' })).toBeInTheDocument()
    expect(api.clients.get(c.id)).toMatchObject({ lastContactAt: '2026-10-01', nextContactAt: '2026-12-01' })
  })

  it('si el servidor rechaza la escritura se avisa el error', async () => {
    const api = new FakeDataApi()
    const c = api.seedClient({ name: 'James' })
    renderApp(`/clientes/${c.id}`, api)
    api.failNextWrite = Object.assign(new Error('denied'), { code: 'permission-denied' })

    await userEvent.click(await screen.findByRole('button', { name: /registrar contacto/i }))
    expect(await screen.findByText(/no se pudo guardar/i)).toBeInTheDocument()
  })

  it('no acepta un contacto a futuro y conserva lo escrito', async () => {
    const api = new FakeDataApi()
    const c = api.seedClient({ name: 'James' })
    renderApp(`/clientes/${c.id}`, api)

    const date = await screen.findByLabelText(/^fecha$/i)
    await userEvent.clear(date)
    await userEvent.type(date, addDays(today, 30))
    await userEvent.type(screen.getByLabelText(/qué se habló/i), 'Nota larga que no se tiene que perder')
    await userEvent.click(screen.getByRole('button', { name: /registrar contacto/i }))

    expect(await screen.findByText(/no puede ser a futuro/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/qué se habló/i)).toHaveValue('Nota larga que no se tiene que perder')
    expect(api.contacts.get(c.id)).toBeUndefined()
  })

  it('si guardar falla antes de escribir, el formulario no se borra', async () => {
    const api = new FakeDataApi()
    const c = api.seedClient({ name: 'James' })
    api.addContact = () => {
      throw new Error('falló la validación')
    }
    renderApp(`/clientes/${c.id}`, api)

    await userEvent.type(await screen.findByLabelText(/qué se habló/i), 'No borrar')
    await userEvent.click(screen.getByRole('button', { name: /registrar contacto/i }))
    expect(await screen.findByText(/falló la validación/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/qué se habló/i)).toHaveValue('No borrar')
  })

  it('un id inexistente muestra un aviso', async () => {
    renderApp('/clientes/nope')
    expect(await screen.findByText(/no se encontró el cliente/i)).toBeInTheDocument()
  })
})

describe('alertas en Inicio y ajustes', () => {
  it('muestra vencidos y olvidados, pero no los que no tienen seguimiento', async () => {
    const api = new FakeDataApi()
    api.seedClient({ name: 'Vencido', nextContactAt: addDays(today, -2) })
    api.seedClient({ name: 'Olvidado', lastContactAt: addDays(today, -30) })
    api.seedClient({ name: 'Sin seguimiento', followUp: false, nextContactAt: addDays(today, -2) })
    api.seedClient({ name: 'Al día', lastContactAt: addDays(today, -1) })
    renderApp('/', api)

    const due = await screen.findByRole('list', { name: /contactar hoy o vencidos/i })
    expect(within(due).getByText('Vencido')).toBeInTheDocument()
    const stale = screen.getByRole('list', { name: /sin contacto hace más de 14 días/i })
    expect(within(stale).getByText('Olvidado')).toBeInTheDocument()
    expect(screen.queryByText('Sin seguimiento')).not.toBeInTheDocument()
    expect(screen.queryByText('Al día')).not.toBeInTheDocument()
  })

  it('Ajustes no pisa lo que se está editando si llegan datos nuevos', async () => {
    const api = new FakeDataApi()
    renderApp('/ajustes', api)
    const input = await screen.findByLabelText(/más de n días/i)
    await userEvent.clear(input)
    await userEvent.type(input, '30')

    // Otro socio guarda el nombre del taller mientras tanto.
    act(() => {
      api.settings = { ...api.settings, name: 'Taller Otro' }
      api.seedClient({ name: 'Dispara un snapshot' })
    })
    expect(screen.getByLabelText(/más de n días/i)).toHaveValue(30)
  })

  it('cambiar los días de alerta en Ajustes cambia las alertas', async () => {
    const api = new FakeDataApi()
    api.seedClient({ name: 'Diez días', lastContactAt: addDays(today, -10) })
    const { unmount } = renderApp('/ajustes', api)

    const input = await screen.findByLabelText(/más de n días/i)
    await userEvent.clear(input)
    await userEvent.type(input, '7')
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(api.settings.contactAlertDays).toBe(7))
    unmount()

    renderApp('/', api)
    const stale = await screen.findByRole('list', { name: /sin contacto hace más de 7 días/i })
    expect(within(stale).getByText('Diez días')).toBeInTheDocument()
  })
})
