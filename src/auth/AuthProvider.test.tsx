import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthProvider'
import type { AuthService, AuthUser } from './types'

function createFakeService(members: string[]) {
  let listener: ((u: AuthUser | null) => void) | null = null
  let membership: ((active: boolean) => void) | null = null
  const service: AuthService & { emit: (u: AuthUser | null) => void; setActive: (active: boolean) => void; watching: () => boolean } = {
    onUserChanged(cb) {
      listener = cb
      return () => {
        listener = null
      }
    },
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {
      listener?.(null)
    }),
    isMember: vi.fn(async (email: string) => members.includes(email.toLowerCase())),
    watchMembership: vi.fn((_email: string, cb: (active: boolean) => void) => {
      membership = cb
      return () => {
        membership = null
      }
    }),
    setActive(active) {
      membership?.(active)
    },
    watching: () => membership !== null,
    emit(u) {
      listener?.(u)
    },
  }
  return service
}

function Probe() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="email">{auth.user?.email ?? auth.rejectedEmail ?? ''}</span>
      <button onClick={() => void auth.signIn()}>entrar</button>
      <button onClick={() => void auth.signOut()}>salir</button>
    </div>
  )
}

const nacho: AuthUser = { uid: '1', email: 'nacho@gmail.com', displayName: 'Nacho', photoURL: null }
const extrano: AuthUser = { uid: '2', email: 'extrano@gmail.com', displayName: 'X', photoURL: null }

describe('AuthProvider', () => {
  it('arranca en loading y pasa a signedOut sin usuario', async () => {
    const svc = createFakeService([])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    expect(screen.getByTestId('status')).toHaveTextContent('loading')
    await act(async () => svc.emit(null))
    expect(screen.getByTestId('status')).toHaveTextContent('signedOut')
  })

  it('deja entrar a un email de la lista blanca', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(nacho))
    expect(screen.getByTestId('status')).toHaveTextContent('member')
    expect(screen.getByTestId('email')).toHaveTextContent('nacho@gmail.com')
  })

  it('bloquea y cierra sesión a un email fuera de members', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(extrano))
    expect(svc.signOut).toHaveBeenCalled()
    expect(screen.getByTestId('status')).toHaveTextContent('notMember')
    expect(screen.getByTestId('email')).toHaveTextContent('extrano@gmail.com')
  })

  it('pasa a error si no se puede verificar la membresía', async () => {
    const svc = createFakeService([])
    svc.isMember = vi.fn(async () => {
      throw new Error('unavailable')
    })
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(nacho))
    expect(screen.getByTestId('status')).toHaveTextContent('error')
  })

  it('al volver a iniciar sesión limpia el rechazo anterior', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(extrano))
    expect(screen.getByTestId('status')).toHaveTextContent('notMember')
    await userEvent.click(screen.getByText('entrar'))
    expect(svc.signIn).toHaveBeenCalled()
    await act(async () => svc.emit(nacho))
    expect(screen.getByTestId('status')).toHaveTextContent('member')
  })

  it('tras un error al verificar, "entrar" cierra la sesión colgada antes de abrir el popup', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    const ok = svc.isMember
    svc.isMember = vi.fn(async () => {
      throw new Error('unavailable')
    })
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(nacho))
    expect(screen.getByTestId('status')).toHaveTextContent('error')
    svc.isMember = ok
    await userEvent.click(screen.getByText('entrar'))
    expect(svc.signOut).toHaveBeenCalledTimes(1)
    expect(svc.signIn).toHaveBeenCalled()
    await act(async () => svc.emit(nacho))
    expect(screen.getByTestId('status')).toHaveTextContent('member')
  })

  it('si falla cerrar la sesión de un no socio, igual queda bloqueado', async () => {
    const svc = createFakeService([])
    svc.signOut = vi.fn(async () => {
      throw new Error('network')
    })
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(extrano))
    expect(screen.getByTestId('status')).toHaveTextContent('notMember')
  })

  it('el cierre de sesión del socio pide borrar los datos locales', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(nacho))
    await userEvent.click(screen.getByText('salir'))
    expect(svc.signOut).toHaveBeenCalledWith({ clearLocalData: true })
  })

  it('signOut deja la app en signedOut', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(nacho))
    await userEvent.click(screen.getByText('salir'))
    expect(screen.getByTestId('status')).toHaveTextContent('signedOut')
  })

  it('si desactivan al socio con la sesión abierta, lo saca y borra los datos del dispositivo', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(nacho))
    expect(screen.getByTestId('status')).toHaveTextContent('member')
    expect(svc.watchMembership).toHaveBeenCalledWith('nacho@gmail.com', expect.any(Function))

    await act(async () => svc.setActive(false))
    expect(svc.signOut).toHaveBeenCalledWith({ clearLocalData: true })
    expect(screen.getByTestId('status')).toHaveTextContent('notMember')
    expect(screen.getByTestId('email')).toHaveTextContent('nacho@gmail.com')
    // Se recuerda para mostrar el aviso tras la recarga que hace el borrado.
    expect(sessionStorage.getItem('nn:revoked')).toBe('nacho@gmail.com')
    expect(svc.watching()).toBe(false)
  })

  it('el aviso de acceso revocado sobrevive a la recarga y se limpia al volver a entrar', async () => {
    sessionStorage.setItem('nn:revoked', 'nacho@gmail.com')
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(null))
    expect(screen.getByTestId('status')).toHaveTextContent('notMember')
    expect(screen.getByTestId('email')).toHaveTextContent('nacho@gmail.com')

    await userEvent.click(screen.getByText('entrar'))
    expect(sessionStorage.getItem('nn:revoked')).toBeNull()
  })

  it('mientras sigue activo no hace nada', async () => {
    const svc = createFakeService(['nacho@gmail.com'])
    render(
      <AuthProvider service={svc}>
        <Probe />
      </AuthProvider>,
    )
    await act(async () => svc.emit(nacho))
    await act(async () => svc.setActive(true))
    expect(svc.signOut).not.toHaveBeenCalled()
    expect(screen.getByTestId('status')).toHaveTextContent('member')
  })
})
