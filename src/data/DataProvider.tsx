/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { memberKey } from '@/auth/membership'
import type { DataApi, Unsubscribe } from './api'

const DataContext = createContext<DataApi | null>(null)

export function DataProvider({ api, children }: { api: DataApi; children: ReactNode }) {
  return <DataContext.Provider value={api}>{children}</DataContext.Provider>
}

export function useData(): DataApi {
  const api = useContext(DataContext)
  if (!api) throw new Error('useData debe usarse dentro de <DataProvider>')
  return api
}

/** Email (id de members) del socio logueado, para firmar las escrituras. */
export function useMyEmail(): string {
  const { user } = useAuth()
  if (!user?.email) throw new Error('No hay un socio logueado')
  return memberKey(user.email)
}

/**
 * Se suscribe a una fuente en tiempo real. `data` es undefined mientras carga.
 * `subscribe` debe depender solo de `deps`.
 */
export function useLive<T>(subscribe: (cb: (value: T) => void) => Unsubscribe, deps: unknown[]): T | undefined {
  const [state, setState] = useState<{ key: string; value: T | undefined }>({ key: '', value: undefined })
  const key = JSON.stringify(deps)

  useEffect(() => {
    return subscribe((value) => setState({ key, value }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Si cambian las dependencias, no mostrar datos de la suscripción anterior.
  return state.key === key ? state.value : undefined
}
