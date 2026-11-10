import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './App'
import { AuthProvider } from './auth/AuthProvider'
import type { AuthService, AuthUser } from './auth/types'
import { DataProvider } from './data/DataProvider'
import { FakeDataApi } from './test/fakeApi'

function setup(members: string[], path = '/') {
  let listener: ((u: AuthUser | null) => void) | null = null
  const svc: AuthService = {
    onUserChanged(cb) {
      listener = cb
      return () => {}
    },
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => listener?.(null)),
    isMember: vi.fn(async (e: string) => members.includes(e)),
    watchMembership: () => () => {},
  }
  render(
    <AuthProvider service={svc}>
      <DataProvider api={new FakeDataApi()}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </DataProvider>
    </AuthProvider>,
  )
  return { svc, emit: (u: AuthUser | null) => listener?.(u) }
}

const nacho: AuthUser = { uid: '1', email: 'nacho@gmail.com', displayName: 'Nacho', photoURL: null }

describe('App', () => {
  it('muestra la pantalla de login sin sesión', async () => {
    const { emit, svc } = setup([])
    await act(async () => emit(null))
    await userEvent.click(screen.getByRole('button', { name: /entrar con google/i }))
    expect(svc.signIn).toHaveBeenCalled()
  })

  it('muestra aviso de acceso denegado a quien no es socio', async () => {
    const { emit } = setup([])
    await act(async () => emit({ ...nacho, email: 'otro@gmail.com' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/otro@gmail.com no tiene acceso/i)
  })

  it('muestra el layout con las secciones a un socio', async () => {
    const { emit } = setup(['nacho@gmail.com'])
    await act(async () => emit(nacho))
    const nav = screen.getAllByRole('navigation')[0]
    for (const label of ['Inicio', 'Clientes', 'Proyectos', 'Billetera', 'Presupuestos']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: /hola, nacho/i })).toBeInTheDocument()
  })

  it('la sección de presupuestos ya no es "Próximamente"', async () => {
    const { emit } = setup(['nacho@gmail.com'], '/presupuestos')
    await act(async () => emit(nacho))
    expect(screen.getByRole('heading', { name: 'Presupuestos' })).toBeInTheDocument()
    expect(screen.queryByText(/próximamente/i)).not.toBeInTheDocument()
  })

  it('una ruta desconocida vuelve al inicio', async () => {
    const { emit } = setup(['nacho@gmail.com'], '/no-existe')
    await act(async () => emit(nacho))
    expect(screen.getByRole('heading', { name: /hola, nacho/i })).toBeInTheDocument()
  })

  it('el botón de salir cierra la sesión', async () => {
    const { emit, svc } = setup(['nacho@gmail.com'])
    await act(async () => emit(nacho))
    await userEvent.click(screen.getAllByRole('button', { name: /cerrar sesión/i })[0])
    expect(svc.signOut).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /entrar con google/i })).toBeInTheDocument()
  })
})
