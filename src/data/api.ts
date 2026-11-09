import type { z } from 'zod'
import type {
  BoxData,
  BoxDataSchema,
  ClientData,
  ClientDataSchema,
  ContactData,
  ContactDataSchema,
  EdgeBandingData,
  EdgeBandingDataSchema,
  HardwareData,
  HardwareDataSchema,
  MaterialData,
  MaterialDataSchema,
  ServiceRates,
  TemplateData,
  TemplateDataSchema,
  GeneralExpenseData,
  GeneralExpenseDataSchema,
  MovementControl,
  MovementData,
  MovementDataSchema,
  ProjectData,
  ProjectDataSchema,
  QuoteData,
  QuoteDataSchema,
  Stored,
  WorkshopSettings,
} from '@/model'
import type { WriteResult } from './repo'

export type Unsubscribe = () => void

export type Client = Stored<ClientData>
export type Contact = Stored<ContactData>
export type Project = Stored<ProjectData>
export type Box = Stored<BoxData>
export type GeneralExpense = Stored<GeneralExpenseData>
export type Quote = Stored<QuoteData>
export type Movement = Stored<MovementData> & MovementControl

/** Una versión de un movimiento en el historial (auditLog). */
export interface AuditEntry {
  id: string
  version: number
  action: 'create' | 'update' | 'delete'
  before: Record<string, unknown> | null
  after: Record<string, unknown>
  by: string
  at: Date | null
}

export interface Member {
  email: string
  name: string
  active: boolean
}

export type Material = Stored<MaterialData>
export type EdgeBanding = Stored<EdgeBandingData>
export type Hardware = Stored<HardwareData>
export type Template = Stored<TemplateData>

export interface ServiceRatesState {
  rates: ServiceRates
  exists: boolean
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
  watchProjects(cb: (projects: Project[]) => void): Unsubscribe
  watchProject(id: string, cb: (project: Project | null) => void): Unsubscribe

  watchBoxes(cb: (boxes: Box[]) => void): Unsubscribe
  createBox(input: z.input<typeof BoxDataSchema>, by: string): WriteResult
  updateBox(id: string, next: BoxData, by: string): WriteResult

  // ---- presupuestos ----
  watchQuotes(cb: (quotes: Quote[]) => void): Unsubscribe
  watchQuote(id: string, cb: (quote: Quote | null) => void): Unsubscribe
  createQuote(input: z.input<typeof QuoteDataSchema>, by: string): WriteResult
  /** `next` es el presupuesto completo (no un parche). */
  updateQuote(id: string, next: QuoteData, by: string): WriteResult
  /** Solo borradores (las reglas lo exigen); el resto se archiva. */
  deleteQuote(id: string): WriteResult
  watchGeneralExpenses(cb: (expenses: GeneralExpense[]) => void): Unsubscribe
  createGeneralExpense(input: z.input<typeof GeneralExpenseDataSchema>, by: string): WriteResult
  /** `next` es el gasto completo (no un parche). */
  updateGeneralExpense(id: string, next: GeneralExpenseData, by: string): WriteResult

  watchMovements(cb: (movements: Movement[]) => void): Unsubscribe
  watchMovementHistory(movementId: string, cb: (entries: AuditEntry[]) => void): Unsubscribe
  createMovement(input: z.input<typeof MovementDataSchema>, by: string): WriteResult
  /** `current` es la versión que el usuario estaba viendo (detecta conflictos). */
  updateMovement(current: Movement, next: MovementData, by: string): WriteResult
  deleteMovement(current: Movement, reason: string, by: string): WriteResult

  createProject(input: z.input<typeof ProjectDataSchema>, by: string): WriteResult
  /** `next` es el proyecto completo (no un parche). */
  updateProject(id: string, next: ProjectData, by: string): WriteResult

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

  // ---- catálogo (no se borra: se desactiva) ----
  watchMaterials(cb: (items: Material[]) => void): Unsubscribe
  createMaterial(input: z.input<typeof MaterialDataSchema>, by: string): WriteResult
  updateMaterial(id: string, next: MaterialData, by: string): WriteResult
  watchEdgeBanding(cb: (items: EdgeBanding[]) => void): Unsubscribe
  createEdgeBanding(input: z.input<typeof EdgeBandingDataSchema>, by: string): WriteResult
  updateEdgeBanding(id: string, next: EdgeBandingData, by: string): WriteResult
  watchHardware(cb: (items: Hardware[]) => void): Unsubscribe
  createHardware(input: z.input<typeof HardwareDataSchema>, by: string): WriteResult
  updateHardware(id: string, next: HardwareData, by: string): WriteResult
  watchServiceRates(cb: (state: ServiceRatesState) => void): Unsubscribe
  saveServiceRates(next: ServiceRates, exists: boolean, by: string): WriteResult

  // ---- plantillas de mueble ----
  watchTemplates(cb: (items: Template[]) => void): Unsubscribe
  createTemplate(input: z.input<typeof TemplateDataSchema>, by: string): WriteResult
  updateTemplate(id: string, next: TemplateData, by: string): WriteResult
  deleteTemplate(id: string): WriteResult
}

/** Orden alfabético en español, sin distinguir tildes ni mayúsculas. */
export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

/** Proyectos por fecha de creación, los más nuevos primero. */
export const byCreatedDesc = (a: { createdAt: { toMillis(): number } }, b: { createdAt: { toMillis(): number } }) =>
  (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)

/** Movimientos del más reciente al más antiguo (fecha y, a igual fecha, alta). */
export const byMovementDesc = (a: Movement, b: Movement) =>
  a.date !== b.date ? (a.date < b.date ? 1 : -1) : byCreatedDesc(a, b)

/** Contactos del más reciente al más antiguo. */
export const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
