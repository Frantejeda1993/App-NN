import type { Client, Contact, Member, SettingsState } from './api'
import { useData, useLive } from './DataProvider'

/** Hooks tipados de lectura en tiempo real. `undefined` = cargando. */

export function useClients(): Client[] | undefined {
  const api = useData()
  return useLive<Client[]>((cb) => api.watchClients(cb), [])
}

export function useClient(id: string): Client | null | undefined {
  const api = useData()
  return useLive<Client | null>((cb) => api.watchClient(id, cb), [id])
}

export function useContacts(clientId: string): Contact[] | undefined {
  const api = useData()
  return useLive<Contact[]>((cb) => api.watchContacts(clientId, cb), [clientId])
}

export function useMembers(): Member[] | undefined {
  const api = useData()
  return useLive<Member[]>((cb) => api.watchMembers(cb), [])
}

export function useWorkshopSettings(): SettingsState | undefined {
  const api = useData()
  return useLive<SettingsState>((cb) => api.watchWorkshopSettings(cb), [])
}
