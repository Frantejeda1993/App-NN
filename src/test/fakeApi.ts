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
  type QuoteData,
  type BoxData,
  type MovementData,
  WorkshopSettingsSchema,
  type ClientData,
  type ContactData,
  type ProjectData,
  type WorkshopSettings,
  UserPrefsSchema,
  type UserPrefs,
  OpeningBalancesSchema,
  type OpeningBalances,
} from '@/model'
import { distributionMovements } from '@/domain/distribution'
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
  type DistributionInput,
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
    { email: 'nacho@gmail.com', name: 'Nacho', active: true, role: 'socio' },
    { email: 'nahuel@gmail.com', name: 'Nahuel', active: true, role: 'socio' },
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

  /** Escritura que el servidor rechazaría (como las reglas de Firestore: asíncrono). */
  private denied(id: string, message = 'conflicto'): WriteResult {
    const committed = Promise.reject(Object.assign(new Error(message), { code: 'permission-denied' }))
    committed.catch(() => {})
    return { id, committed }
  }

  // ---- helpers de test ----
  /** Usuario administrador: entra a la app pero no es socio. */
  seedAdmin(email: string, name: string): Member {
    const m: Member = { email, name, active: true, role: 'admin' }
    this.members = [...this.members, m]
    this.emit()
    return m
  }

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

  /** Como las reglas: el `rev` que se envía debe ser el actual (si no, otro socio guardó antes). */
  updateProject(id: string, next: ProjectData, by: string) {
    const prev = this.projects.get(id)
    const data = ProjectDataSchema.parse(next)
    if (!prev || prev.rev !== data.rev) return this.denied(id)
    this.projects.set(id, { ...data, rev: data.rev + 1, ...this.stamp(by, prev), id })
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
    const prev = this.boxes.get(id)
    if (!prev) return this.denied(id, 'no existe')
    this.boxes.set(id, { ...BoxDataSchema.parse(next), ...this.stamp(by, prev), id })
    return this.done(id)
  }

  // ---- presupuestos ----
  quotes = new Map<string, Quote>()

  seedQuote(input: Record<string, unknown>, id = `q${++this.seq}`): Quote {
    const q: Quote = { ...QuoteDataSchema.parse(input), ...this.stamp('nacho@gmail.com'), id }
    this.quotes.set(id, q)
    this.emit()
    return q
  }

  watchQuotes(cb: (q: Quote[]) => void) {
    return this.watch(() => cb([...this.quotes.values()].sort(byCreatedDesc)))
  }

  watchQuote(id: string, cb: (q: Quote | null) => void) {
    return this.watch(() => cb(this.quotes.get(id) ?? null))
  }

  createQuote(input: unknown, by: string) {
    const id = `q${++this.seq}`
    this.quotes.set(id, { ...QuoteDataSchema.parse(input), ...this.stamp(by), id })
    return this.done(id)
  }

  /**
   * Como las reglas: rev actual, no vuelve a borrador, no cambia el número de
   * versión; el proyecto (si viene) se escribe en el mismo lote (todo o nada).
   */
  updateQuote(id: string, next: QuoteData, by: string, project?: { id: string; next: ProjectData }) {
    const prev = this.quotes.get(id)
    const data = QuoteDataSchema.parse(next)
    if (!prev || prev.rev !== data.rev) return this.denied(id)
    if (data.status === 'borrador' && prev.status !== 'borrador') return this.denied(id, 'no puede volver a borrador')
    if (data.version !== prev.version) return this.denied(id, 'no puede cambiar la versión')
    const prevProject = project ? this.projects.get(project.id) : undefined
    const projectData = project ? ProjectDataSchema.parse(project.next) : undefined
    if (project && (!prevProject || prevProject.rev !== projectData!.rev)) return this.denied(id)
    this.quotes.set(id, { ...data, rev: data.rev + 1, ...this.stamp(by, prev), id })
    if (project && prevProject && projectData) {
      this.projects.set(project.id, { ...projectData, rev: projectData.rev + 1, ...this.stamp(by, prevProject), id: project.id })
    }
    return this.done(id)
  }

  /** Como las reglas: solo se borran borradores. */
  deleteQuote(id: string) {
    if (this.quotes.get(id)?.status !== 'borrador') return this.denied(id, 'solo se borran borradores')
    this.quotes.delete(id)
    return this.done(id)
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
    const prev = this.generalExpenses.get(id)
    if (!prev) return this.denied(id, 'no existe')
    this.generalExpenses.set(id, { ...GeneralExpenseDataSchema.parse(next), ...this.stamp(by, prev), id })
    return this.done(id)
  }

  watchMovements(cb: (m: Movement[]) => void) {
    return this.watch(() => cb([...this.movements.values()].sort(byMovementDesc)))
  }

  watchMovementHistory(id: string, cb: (h: AuditEntry[]) => void) {
    return this.watch(() => cb([...(this.history.get(id) ?? [])]))
  }

  private addMovement(data: MovementData, by: string): string {
    const id = `m${++this.seq}`
    this.movements.set(id, { ...data, version: 1, deleted: false, deletedReason: '', ...this.stamp(by), id })
    this.history.set(id, [{ id: `${id}_v1`, version: 1, action: 'create', before: null, after: { ...data }, by, at: new Date() }])
    return id
  }

  createMovement(input: unknown, by: string) {
    return this.done(this.addMovement(MovementDataSchema.parse(input), by))
  }

  /** Todos o ninguno, como el lote real. */
  createDistribution(input: DistributionInput, by: string) {
    const parsed = distributionMovements(input).map((m) => MovementDataSchema.parse(m))
    if (parsed.length === 0) throw new Error('No hay movimientos para registrar')
    const ids = parsed.map((data) => this.addMovement(data, by))
    return this.done(ids[0])
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

  // Como repo.ts: un movimiento ya eliminado o una baja sin motivo fallan en el acto (no asíncrono).
  updateMovement(current: Movement, next: MovementData, by: string) {
    if (current.deleted) throw new Error('No se puede editar un movimiento eliminado')
    const data = MovementDataSchema.parse(next)
    return this.writeVersion(current, { ...current, ...data, version: current.version + 1 }, 'update', by)
  }

  deleteMovement(current: Movement, reason: string, by: string) {
    if (current.deleted) throw new Error('El movimiento ya está eliminado')
    const deletedReason = reason.trim().slice(0, 500)
    if (!deletedReason) throw new Error('Escribí el motivo de la baja')
    return this.writeVersion(current, { ...current, deleted: true, deletedReason, version: current.version + 1 }, 'delete', by)
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

  /** Por defecto el tour ya está visto, para no tapar las otras pruebas. */
  prefs = new Map<string, UserPrefs>()
  prefsDefault: UserPrefs | null = { tourSeenVersion: 1000 }

  watchMyPrefs(email: string, cb: (p: UserPrefs | null) => void) {
    return this.watch(() => cb(this.prefs.get(email) ?? this.prefsDefault))
  }

  saveMyPrefs(email: string, prefs: UserPrefs) {
    this.prefs.set(email, UserPrefsSchema.parse(prefs))
    return this.done(email)
  }

  saveWorkshopSettings(next: WorkshopSettings) {
    this.settings = WorkshopSettingsSchema.parse(next)
    this.settingsExists = true
    return this.done('workshop')
  }

  // ---- configuración inicial de la billetera ----
  opening: OpeningBalances = OpeningBalancesSchema.parse({})
  openingExists = false

  watchOpeningBalances(cb: (s: { opening: OpeningBalances; exists: boolean }) => void) {
    return this.watch(() => cb({ opening: this.opening, exists: this.openingExists }))
  }

  saveOpeningBalances(next: OpeningBalances) {
    this.opening = OpeningBalancesSchema.parse(next)
    this.openingExists = true
    return this.done('opening')
  }
}
