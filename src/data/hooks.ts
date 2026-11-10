import type {
  AuditEntry,
  Box,
  Client,
  Contact,
  EdgeBanding,
  GeneralExpense,
  Hardware,
  Material,
  Member,
  Movement,
  Project,
  Quote,
  ServiceRatesState,
  SettingsState,
  Template,
} from './api'
import type { UserPrefs } from '@/model'
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

export function useMaterials(): Material[] | undefined {
  const api = useData()
  return useLive<Material[]>((cb) => api.watchMaterials(cb), [])
}

export function useEdgeBanding(): EdgeBanding[] | undefined {
  const api = useData()
  return useLive<EdgeBanding[]>((cb) => api.watchEdgeBanding(cb), [])
}

export function useHardware(): Hardware[] | undefined {
  const api = useData()
  return useLive<Hardware[]>((cb) => api.watchHardware(cb), [])
}

export function useTemplates(): Template[] | undefined {
  const api = useData()
  return useLive<Template[]>((cb) => api.watchTemplates(cb), [])
}

export function useServiceRates(): ServiceRatesState | undefined {
  const api = useData()
  return useLive<ServiceRatesState>((cb) => api.watchServiceRates(cb), [])
}

export function useQuotes(): Quote[] | undefined {
  const api = useData()
  return useLive<Quote[]>((cb) => api.watchQuotes(cb), [])
}

export function useQuote(id: string): Quote | null | undefined {
  const api = useData()
  return useLive<Quote | null>((cb) => (id ? api.watchQuote(id, cb) : none(cb)), [id])
}

export function useGeneralExpenses(): GeneralExpense[] | undefined {
  const api = useData()
  return useLive<GeneralExpense[]>((cb) => api.watchGeneralExpenses(cb), [])
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

/** Preferencias propias; `undefined` = cargando, `null` = todavía no tiene. */
export function useMyPrefs(email: string): UserPrefs | null | undefined {
  const api = useData()
  return useLive<UserPrefs | null>((cb) => (email ? api.watchMyPrefs(email, cb) : none(cb)), [email])
}
