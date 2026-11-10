import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'
import { TOUR_STEPS, TOUR_VERSION } from './steps'

const ME = 'nacho@gmail.com'

/** Un usuario que todavía no vio el tour. */
function newUser() {
  const api = new FakeDataApi()
  api.prefsDefault = null
  return api
}

describe('tour de la app', () => {
  it('arranca solo la primera vez, avanza y vuelve', async () => {
    const api = newUser()
    renderApp('/', api)

    const tour = await screen.findByRole('dialog', { name: /bienvenido a taller nn/i })
    expect(tour).toHaveTextContent(`Paso 1 de ${TOUR_STEPS.length}`)
    await waitFor(() => expect(within(tour).getByRole('button', { name: /siguiente/i })).toHaveFocus())

    await userEvent.click(within(tour).getByRole('button', { name: /siguiente/i }))
    expect(await screen.findByRole('dialog', { name: /el menú/i }, { timeout: 5000 })).toHaveTextContent('Paso 2 de')
    await userEvent.click(screen.getByRole('button', { name: /atrás/i }))
    expect(await screen.findByRole('dialog', { name: /bienvenido/i })).toBeInTheDocument()
  })

  it('saltarlo lo cierra y queda guardado (no vuelve a aparecer)', async () => {
    const api = newUser()
    const { unmount } = renderApp('/', api)
    await userEvent.click(await screen.findByRole('button', { name: /saltar tour/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(api.prefs.get(ME)).toEqual({ tourSeenVersion: TOUR_VERSION }))
    unmount()

    renderApp('/', api)
    expect(await screen.findByRole('heading', { name: /hola/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Escape también lo cierra', async () => {
    const api = newUser()
    renderApp('/', api)
    await screen.findByRole('dialog', { name: /bienvenido/i })
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(api.prefs.get(ME)?.tourSeenVersion).toBe(TOUR_VERSION))
  })

  it('quien ya lo vio no lo ve, pero lo puede repetir desde Ajustes', async () => {
    const api = new FakeDataApi() // por defecto, ya visto
    renderApp('/ajustes', api)
    await userEvent.click(await screen.findByRole('button', { name: /repetir el tour/i }))
    expect(await screen.findByRole('dialog', { name: /bienvenido a taller nn/i })).toBeInTheDocument()
  })

  it('todos los pasos explican cómo y tienen pantalla', () => {
    const ids = new Set(TOUR_STEPS.map((s) => s.id))
    expect(ids.size).toBe(TOUR_STEPS.length)
    for (const s of TOUR_STEPS) {
      expect(s.route.startsWith('/')).toBe(true)
      expect(s.body.length).toBeGreaterThan(0)
    }
  })
})

describe('ajustes del taller', () => {
  it('guarda los datos que salen en el PDF', async () => {
    const api = new FakeDataApi()
    renderApp('/ajustes', api)
    await userEvent.type(await screen.findByLabelText(/nif/i), 'B12345678')
    await userEvent.type(screen.getByLabelText(/^dirección/i), 'Calle Mayor 1')
    await userEvent.type(screen.getByLabelText(/condiciones de pago/i), '50 % al aceptar')
    await userEvent.clear(screen.getByLabelText(/validez/i))
    await userEvent.type(screen.getByLabelText(/validez/i), '30')
    await userEvent.click(screen.getByRole('button', { name: /^guardar$/i }))
    await waitFor(() =>
      expect(api.settings).toMatchObject({ taxId: 'B12345678', address: 'Calle Mayor 1', defaultQuoteTerms: '50 % al aceptar', quoteValidityDays: 30 }),
    )
  })
})
