/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthService, AuthStatus, AuthUser } from './types'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  /** Email que intentó entrar sin estar en la lista blanca. */
  rejectedEmail: string | null
}

interface AuthContextValue extends AuthState {
  signIn(): Promise<void>
  signOut(): Promise<void>
  retry(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Email al que le quitaron el acceso con la sesión abierta. Se guarda en la
// pestaña porque borrar los datos del dispositivo recarga la app.
const REVOKED_KEY = 'nn:revoked'
const storage = {
  get: () => {
    try {
      return sessionStorage.getItem(REVOKED_KEY)
    } catch {
      return null
    }
  },
  set: (email: string | null) => {
    try {
      if (email) sessionStorage.setItem(REVOKED_KEY, email)
      else sessionStorage.removeItem(REVOKED_KEY)
    } catch {
      // Sin almacenamiento (modo privado estricto): solo se pierde el aviso.
    }
  },
}

export function AuthProvider({ service, children }: { service: AuthService; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, rejectedEmail: null })
  const rejectedRef = useRef<string | null>(storage.get())
  const runRef = useRef(0)
  const lastUserRef = useRef<AuthUser | null>(null)

  const evaluate = useCallback(
    async (user: AuthUser | null) => {
      const run = ++runRef.current
      lastUserRef.current = user

      if (!user) {
        const rejected = rejectedRef.current
        setState({ status: rejected ? 'notMember' : 'signedOut', user: null, rejectedEmail: rejected })
        return
      }

      rejectedRef.current = null
      setState({ status: 'loading', user: null, rejectedEmail: null })

      let allowed = false
      try {
        allowed = user.email ? await service.isMember(user.email) : false
      } catch {
        if (run === runRef.current) setState({ status: 'error', user: null, rejectedEmail: null })
        return
      }
      if (run !== runRef.current) return

      if (allowed) {
        setState({ status: 'member', user, rejectedEmail: null })
      } else {
        rejectedRef.current = user.email ?? '(sin email)'
        setState({ status: 'notMember', user: null, rejectedEmail: rejectedRef.current })
        try {
          await service.signOut()
        } catch {
          // Si falla, la sesión de Firebase queda abierta pero sin acceso:
          // las reglas de Firestore igual le niegan todo y al recargar se reevalúa.
        }
      }
    },
    [service],
  )

  useEffect(() => service.onUserChanged((u) => void evaluate(u)), [service, evaluate])

  // Con la sesión abierta, si desactivan al socio: fuera y sin datos en el dispositivo.
  const memberEmail = state.status === 'member' ? state.user?.email : null
  useEffect(() => {
    if (!memberEmail) return
    let done = false
    const stop = service.watchMembership(memberEmail, (active) => {
      if (active || done) return
      done = true
      runRef.current++ // invalida cualquier evaluación en curso
      rejectedRef.current = memberEmail
      storage.set(memberEmail)
      setState({ status: 'notMember', user: null, rejectedEmail: memberEmail })
      void service.signOut({ clearLocalData: true }).catch(() => {})
    })
    return () => {
      done = true
      stop()
    }
  }, [memberEmail, service])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async signIn() {
        rejectedRef.current = null
        storage.set(null)
        // Si quedó una sesión de Firebase abierta (p. ej. tras un error al verificar
        // la membresía), se cierra primero: un nuevo login con el mismo usuario no
        // vuelve a disparar onUserChanged.
        if (lastUserRef.current) await service.signOut()
        await service.signIn()
      },
      async signOut() {
        rejectedRef.current = null
        storage.set(null)
        // Cierre de sesión pedido por el socio: borra también los datos en caché del
        // dispositivo (puede ser compartido).
        await service.signOut({ clearLocalData: true })
      },
      retry() {
        void evaluate(lastUserRef.current)
      },
    }),
    [state, service, evaluate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
