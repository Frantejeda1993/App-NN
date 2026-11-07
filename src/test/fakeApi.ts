import { Timestamp } from 'firebase/firestore'
import {
  ClientDataSchema,
  ContactDataSchema,
  ProjectDataSchema,
  WorkshopSettingsSchema,
  type ClientData,
  type ContactData,
  type ProjectData,
  type WorkshopSettings,
} from '@/model'
import {
  byCreatedDesc,
  byDateDesc,
  byName,
  type Client,
  type Contact,
  type DataApi,
  type Member,
  type Project,
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

  saveWorkshopSettings(next: WorkshopSettings) {
    this.settings = WorkshopSettingsSchema.parse(next)
    this.settingsExists = true
    return this.done('workshop')
  }
}
