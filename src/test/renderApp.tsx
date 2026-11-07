import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AppRoutes } from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import type { AuthService, AuthUser } from '@/auth/types'
import { DataProvider } from '@/data/DataProvider'
import { FakeDataApi } from './fakeApi'

export const NACHO: AuthUser = { uid: '1', email: 'nacho@gmail.com', displayName: 'Nacho', photoURL: null }

/** Renderiza la app completa con un socio logueado y datos en memoria. */
export function renderApp(path: string, api = new FakeDataApi(), user: AuthUser = NACHO) {
  const auth: AuthService = {
    onUserChanged(cb) {
      cb(user)
      return () => {}
    },
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    isMember: vi.fn(async () => true),
  }
  const utils = render(
    <AuthProvider service={auth}>
      <DataProvider api={api}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </DataProvider>
    </AuthProvider>,
  )
  return { ...utils, api }
}
