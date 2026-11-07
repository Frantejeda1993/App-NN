import type { Client, Contact, Member, Project, SettingsState } from './api'
import { useData, useLive } from './DataProvider'

/** Hooks tipados de lectura en tiempo real. `undefined` = cargando. */

export function useClients(): Client[] | undefined {
  const api = useData()
  return useLive<Client[]>((cb) => api.watchClients(cb), [])
}

/** Sin id (p. ej. mientras carga lo que lo referencia) no se suscribe. */
const none = <T,>(cb: (v: T | null) => void) => {
  cb(null)
  return () => {}
}

export function useClient(id: string): Client | null | undefined {
  const api = useData()
  return useLive<Client | null>((cb) => (id ? api.watchClient(id, cb) : none(cb)), [id])
}

export function useContacts(clientId: string): Contact[] | undefined {
  const api = useData()
  return useLive<Contact[]>((cb) => api.watchContacts(clientId, cb), [clientId])
}

export function useMembers(): Member[] | undefined {
  const api = useData()
  return useLive<Member[]>((cb) => api.watchMembers(cb), [])
}

export function useProjects(): Project[] | undefined {
  const api = useData()
  return useLive<Project[]>((cb) => api.watchProjects(cb), [])
}

export function useProject(id: string): Project | null | undefined {
  const api = useData()
  return useLive<Project | null>((cb) => (id ? api.watchProject(id, cb) : none(cb)), [id])
}

export function useWorkshopSettings(): SettingsState | undefined {
  const api = useData()
  return useLive<SettingsState>((cb) => api.watchWorkshopSettings(cb), [])
}
