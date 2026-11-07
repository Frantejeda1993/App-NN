import type { AuditEntry, Box, Client, Contact, Member, Movement, Project, SettingsState } from './api'
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

export function useBoxes(): Box[] | undefined {
  const api = useData()
  return useLive<Box[]>((cb) => api.watchBoxes(cb), [])
}

export function useMovements(): Movement[] | undefined {
  const api = useData()
  return useLive<Movement[]>((cb) => api.watchMovements(cb), [])
}

export function useMovementHistory(id: string): AuditEntry[] | undefined {
  const api = useData()
  return useLive<AuditEntry[]>((cb) => (id ? api.watchMovementHistory(id, cb) : (cb([]), () => {})), [id])
}

export function useWorkshopSettings(): SettingsState | undefined {
  const api = useData()
  return useLive<SettingsState>((cb) => api.watchWorkshopSettings(cb), [])
}
