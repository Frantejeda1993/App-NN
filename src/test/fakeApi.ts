import { Timestamp } from 'firebase/firestore'
import {
  BoxDataSchema,
  ClientDataSchema,
  ContactDataSchema,
  GeneralExpenseDataSchema,
  MovementDataSchema,
  type GeneralExpenseData,
  ProjectDataSchema,
  QuoteDataSchema,
  EdgeBandingDataSchema,
  HardwareDataSchema,
  MaterialDataSchema,
  ServiceRatesSchema,
  TemplateDataSchema,
  type EdgeBandingData,
  type HardwareData,
  type MaterialData,
  type ServiceRates,
  type Stored,
  type TemplateData,
  type BoxData,
  type MovementData,
  WorkshopSettingsSchema,
  type ClientData,
  type ContactData,
  type ProjectData,
  type WorkshopSettings,
} from '@/model'
import {
  byCreatedDesc,
  byDateDesc,
  byMovementDesc,
  byName,
  type AuditEntry,
  type Box,
  type Client,
  type GeneralExpense,
  type Movement,
  type Contact,
  type DataApi,
  type Member,
  type Project,
  type Quote,
  type EdgeBanding,
  type Hardware,
  type Material,
  type Template,
} from '@/data/api'
import type { WriteResult } from '@/data/repo'

type Listener = () => void

/**
 * DataApi en memoria para tests de componentes: valida con los mismos esquemas
 * y notifica a los suscriptores como lo haría Firestore.
 */
export class FakeDataApi implements DataApi {
  clients = new Map<string, Client>()
  contacts = new Map<string, Contact[]>()
  members: Member[] = [
    { email: 'nacho@gmail.com', name: 'Nacho', active: true },
    { email: 'nahuel@gmail.com', name: 'Nahuel', active: true },
  ]
  settings: WorkshopSettings = WorkshopSettingsSchema.parse({})
  settingsExists = false
  /** Si se define, la próxima escritura se rechaza con este error. */
  failNextWrite: Error | null = null

  private listeners = new Set<Listener>()
  private seq = 0

  private emit() {
    for (const l of this.listeners) l()
  }

  private watch(fn: () => void) {
    const l = () => fn()
    this.listeners.add(l)
    fn()
    return () => {
      this.listeners.delete(l)
    }
  }

  private stamp(by: string, prev?: { createdBy: string; createdAt: Timestamp }) {
    const now = Timestamp.now()
    return {
      createdBy: prev?.createdBy ?? by,
      createdAt: prev?.createdAt ?? now,
      updatedBy: by,
      updatedAt: now,
    }
  }

  private done(id: string): WriteResult {
    const err = this.failNextWrite
    this.failNextWrite = null
    const committed = err ? Promise.reject(err) : Promise.resolve()
    committed.catch(() => {})
    this.emit()
    return { id, committed }
  }

  // ---- helpers de test ----
  seedClient(data: Partial<ClientData> & { name: string }, id = `c${++this.seq}`): Client {
    const c: Client = { ...ClientDataSchema.parse(data), ...this.stamp('nacho@gmail.com'), id }
    this.clients.set(id, c)
    this.emit()
    return c
  }

  // ---- DataApi ----
  watchClients(cb: (c: Client[]) => void) {
    return this.watch(() => cb([...this.clients.values()].sort(byName)))
  }

  watchClient(id: string, cb: (c: Client | null) => void) {
    return this.watch(() => cb(this.clients.get(id) ?? null))
  }

  watchContacts(clientId: string, cb: (c: Contact[]) => void) {
    return this.watch(() => cb([...(this.contacts.get(clientId) ?? [])].sort(byDateDesc)))
  }

  watchMembers(cb: (m: Member[]) => void) {
    return this.watch(() => cb(this.members))
  }

  watchWorkshopSettings(cb: (s: { settings: WorkshopSettings; exists: boolean }) => void) {
    return this.watch(() => cb({ settings: this.settings, exists: this.settingsExists }))
  }

  createClient(input: unknown, by: string) {
    const id = `c${++this.seq}`
    this.clients.set(id, { ...ClientDataSchema.parse(input), ...this.stamp(by), id })
    return this.done(id)
  }

  updateClient(id: string, next: ClientData, by: string) {
    const prev = this.clients.get(id)
    if (!prev) throw new Error('no existe')
    this.clients.set(id, { ...ClientDataSchema.parse(next), ...this.stamp(by, prev), id })
    return this.done(id)
  }

  addContact(client: { id: string; lastContactAt: string | null }, input: unknown, nextContactAt: string | null, by: string) {
    const data: ContactData = ContactDataSchema.parse(input)
    const id = `k${++this.seq}`
    const list = this.contacts.get(client.id) ?? []
    this.contacts.set(client.id, [...list, { ...data, ...this.stamp(by), id }])
    const prev = this.clients.get(client.id)!
    const last = prev.lastContactAt && prev.lastContactAt > data.date ? prev.lastContactAt : data.date
    this.clients.set(client.id, { ...prev, lastContactAt: last, nextContactAt, ...this.stamp(by, prev) })
    return this.done(id)
  }

  // ---- proyectos ----
  projects = new Map<string, Project>()

  seedProject(data: Partial<ProjectData> & { title: string; clientId: string; shares: Record<string, number> }, id = `p${++this.seq}`): Project {
    const pr: Project = { ...ProjectDataSchema.parse(data), ...this.stamp('nacho@gmail.com'), id }
    this.projects.set(id, pr)
    this.emit()
    return pr
  }

  watchProjects(cb: (p: Project[]) => void) {
    return this.watch(() => cb([...this.projects.values()].sort(byCreatedDesc)))
  }

  watchProject(id: string, cb: (p: Project | null) => void) {
    return this.watch(() => cb(this.projects.get(id) ?? null))
  }

  createProject(input: unknown, by: string) {
    const id = `p${++this.seq}`
    this.projects.set(id, { ...ProjectDataSchema.parse(input), ...this.stamp(by), id })
    return this.done(id)
  }

  updateProject(id: string, next: ProjectData, by: string) {
    const prev = this.projects.get(id)
    if (!prev) throw new Error('no existe')
    this.projects.set(id, { ...ProjectDataSchema.parse(next), ...this.stamp(by, prev), id })
    return this.done(id)
  }

  // ---- cajas y movimientos ----
  boxes = new Map<string, Box>()
  movements = new Map<string, Movement>()
  history = new Map<string, AuditEntry[]>()

  seedBox(name: string, id = `b${++this.seq}`, active = true): Box {
    const b: Box = { ...BoxDataSchema.parse({ name, active }), ...this.stamp('nacho@gmail.com'), id }
    this.boxes.set(id, b)
    this.emit()
    return b
  }

  seedMovement(input: Record<string, unknown>, id = `m${++this.seq}`): Movement {
    const data = MovementDataSchema.parse(input)
    const mv: Movement = { ...data, version: 1, deleted: false, deletedReason: '', ...this.stamp('nacho@gmail.com'), id }
    this.movements.set(id, mv)
    this.history.set(id, [{ id: `${id}_v1`, version: 1, action: 'create', before: null, after: { ...data }, by: 'nacho@gmail.com', at: new Date() }])
    this.emit()
    return mv
  }

  watchBoxes(cb: (b: Box[]) => void) {
    return this.watch(() => cb([...this.boxes.values()].sort(byName)))
  }

  createBox(input: unknown, by: string) {
    const id = `b${++this.seq}`
    this.boxes.set(id, { ...BoxDataSchema.parse(input), ...this.stamp(by), id })
    return this.done(id)
  }

  updateBox(id: string, next: BoxData, by: string) {
    const prev = this.boxes.get(id)!
    this.boxes.set(id, { ...BoxDataSchema.parse(next), ...this.stamp(by, prev), id })
    return this.done(id)
  }

  // ---- presupuestos (solo lectura por ahora) ----
  quotes = new Map<string, Quote>()

  seedQuote(input: Record<string, unknown>, id = `q${++this.seq}`): Quote {
    const q: Quote = { ...QuoteDataSchema.parse(input), ...this.stamp('nacho@gmail.com'), id }
    this.quotes.set(id, q)
    this.emit()
    return q
  }

  watchQuotes(cb: (q: Quote[]) => void) {
    return this.watch(() => cb([...this.quotes.values()]))
  }

  // ---- gastos generales ----
  generalExpenses = new Map<string, GeneralExpense>()

  seedGeneralExpense(input: Record<string, unknown>, id = `g${++this.seq}`): GeneralExpense {
    const g: GeneralExpense = { ...GeneralExpenseDataSchema.parse(input), ...this.stamp('nacho@gmail.com'), id }
    this.generalExpenses.set(id, g)
    this.emit()
    return g
  }

  watchGeneralExpenses(cb: (g: GeneralExpense[]) => void) {
    return this.watch(() => cb([...this.generalExpenses.values()].sort(byName)))
  }

  createGeneralExpense(input: unknown, by: string) {
    const id = `g${++this.seq}`
    this.generalExpenses.set(id, { ...GeneralExpenseDataSchema.parse(input), ...this.stamp(by), id })
    return this.done(id)
  }

  updateGeneralExpense(id: string, next: GeneralExpenseData, by: string) {
    const prev = this.generalExpenses.get(id)!
    this.generalExpenses.set(id, { ...GeneralExpenseDataSchema.parse(next), ...this.stamp(by, prev), id })
    return this.done(id)
  }

  watchMovements(cb: (m: Movement[]) => void) {
    return this.watch(() => cb([...this.movements.values()].sort(byMovementDesc)))
  }

  watchMovementHistory(id: string, cb: (h: AuditEntry[]) => void) {
    return this.watch(() => cb([...(this.history.get(id) ?? [])]))
  }

  createMovement(input: unknown, by: string) {
    const data = MovementDataSchema.parse(input)
    const id = `m${++this.seq}`
    this.movements.set(id, { ...data, version: 1, deleted: false, deletedReason: '', ...this.stamp(by), id })
    this.history.set(id, [{ id: `${id}_v1`, version: 1, action: 'create', before: null, after: { ...data }, by, at: new Date() }])
    return this.done(id)
  }

  /** Simula las reglas: si la versión que el usuario veía ya no es la actual, se rechaza. */
  private writeVersion(current: Movement, after: Movement, action: 'update' | 'delete', by: string) {
    const stored = this.movements.get(current.id)!
    if (stored.version !== current.version || stored.deleted) {
      const err = Object.assign(new Error('conflicto'), { code: 'permission-denied' })
      const committed = Promise.reject(err)
      committed.catch(() => {})
      return { id: current.id, committed }
    }
    this.movements.set(current.id, { ...after, ...this.stamp(by, stored) })
    const h = this.history.get(current.id) ?? []
    h.push({ id: `${current.id}_v${after.version}`, version: after.version, action, before: { ...stored }, after: { ...after }, by, at: new Date() })
    this.history.set(current.id, h)
    return this.done(current.id)
  }

  updateMovement(current: Movement, next: MovementData, by: string) {
    const data = MovementDataSchema.parse(next)
    return this.writeVersion(current, { ...current, ...data, version: current.version + 1 }, 'update', by)
  }

  deleteMovement(current: Movement, reason: string, by: string) {
    return this.writeVersion(current, { ...current, deleted: true, deletedReason: reason, version: current.version + 1 }, 'delete', by)
  }

  // ---- catálogo y plantillas ----
  materials = new Map<string, Material>()
  edgeBanding = new Map<string, EdgeBanding>()
  hardware = new Map<string, Hardware>()
  templates = new Map<string, Template>()
  serviceRates: ServiceRates = ServiceRatesSchema.parse({})
  serviceRatesExist = false

  private crud<T extends { name: string }>(map: Map<string, Stored<T>>, schema: { parse(x: unknown): T }, prefix: string) {
    return {
      watch: (cb: (items: Stored<T>[]) => void) => this.watch(() => cb([...map.values()].sort(byName))),
      create: (input: unknown, by: string) => {
        const id = `${prefix}${++this.seq}`
        map.set(id, { ...schema.parse(input), ...this.stamp(by), id } as Stored<T>)
        return this.done(id)
      },
      update: (id: string, next: T, by: string) => {
        const prev = map.get(id)!
        map.set(id, { ...schema.parse(next), ...this.stamp(by, prev), id } as Stored<T>)
        return this.done(id)
      },
    }
  }

  private mat = this.crud(this.materials, MaterialDataSchema, 'mat')
  private edge = this.crud(this.edgeBanding, EdgeBandingDataSchema, 'edge')
  private hw = this.crud(this.hardware, HardwareDataSchema, 'hw')
  private tpl = this.crud(this.templates, TemplateDataSchema, 'tpl')

  watchMaterials = (cb: (i: Material[]) => void) => this.mat.watch(cb)
  createMaterial = (input: unknown, by: string) => this.mat.create(input, by)
  updateMaterial = (id: string, next: MaterialData, by: string) => this.mat.update(id, next, by)
  watchEdgeBanding = (cb: (i: EdgeBanding[]) => void) => this.edge.watch(cb)
  createEdgeBanding = (input: unknown, by: string) => this.edge.create(input, by)
  updateEdgeBanding = (id: string, next: EdgeBandingData, by: string) => this.edge.update(id, next, by)
  watchHardware = (cb: (i: Hardware[]) => void) => this.hw.watch(cb)
  createHardware = (input: unknown, by: string) => this.hw.create(input, by)
  updateHardware = (id: string, next: HardwareData, by: string) => this.hw.update(id, next, by)
  watchTemplates = (cb: (i: Template[]) => void) => this.tpl.watch(cb)
  createTemplate = (input: unknown, by: string) => this.tpl.create(input, by)
  updateTemplate = (id: string, next: TemplateData, by: string) => this.tpl.update(id, next, by)
  deleteTemplate = (id: string) => {
    this.templates.delete(id)
    return this.done(id)
  }

  watchServiceRates(cb: (s: { rates: ServiceRates; exists: boolean }) => void) {
    return this.watch(() => cb({ rates: this.serviceRates, exists: this.serviceRatesExist }))
  }

  saveServiceRates(next: ServiceRates) {
    this.serviceRates = ServiceRatesSchema.parse(next)
    this.serviceRatesExist = true
    return this.done('services')
  }

  saveWorkshopSettings(next: WorkshopSettings) {
    this.settings = WorkshopSettingsSchema.parse(next)
    this.settingsExists = true
    return this.done('workshop')
  }
}
