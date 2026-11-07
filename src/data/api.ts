import type { z } from 'zod'
import type {
  ClientData,
  ClientDataSchema,
  ContactData,
  ContactDataSchema,
  Stored,
  WorkshopSettings,
} from '@/model'
import type { WriteResult } from './repo'

export type Unsubscribe = () => void

export type Client = Stored<ClientData>
export type Contact = Stored<ContactData>

export interface Member {
  email: string
  name: string
  active: boolean
}

export interface SettingsState {
  settings: WorkshopSettings
  /** false = todavía no se guardó nunca (se usan los valores por defecto). */
  exists: boolean
}

/**
 * Todo lo que las pantallas leen y escriben. La implementación real usa
 * Firestore en tiempo real (`firestoreApi.ts`); los tests usan una en memoria.
 * Las escrituras validan con zod y firman con el email del socio (`by`).
 */
export interface DataApi {
  watchClients(cb: (clients: Client[]) => void): Unsubscribe
  watchClient(id: string, cb: (client: Client | null) => void): Unsubscribe
  watchContacts(clientId: string, cb: (contacts: Contact[]) => void): Unsubscribe
  watchMembers(cb: (members: Member[]) => void): Unsubscribe
  watchWorkshopSettings(cb: (state: SettingsState) => void): Unsubscribe

  createClient(input: z.input<typeof ClientDataSchema>, by: string): WriteResult
  /** `next` es el cliente completo (no un parche). */
  updateClient(id: string, next: ClientData, by: string): WriteResult
  addContact(
    client: { id: string; lastContactAt: string | null },
    input: z.input<typeof ContactDataSchema>,
    nextContactAt: string | null,
    by: string,
  ): WriteResult
  saveWorkshopSettings(next: WorkshopSettings, exists: boolean, by: string): WriteResult
}

/** Orden alfabético en español, sin distinguir tildes ni mayúsculas. */
export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

/** Contactos del más reciente al más antiguo. */
export const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
