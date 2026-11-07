import {
  collection,
  doc,
  onSnapshot,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore'
import { toast } from 'sonner'
import type { z } from 'zod'
import {
  COLLECTIONS,
  ClientDataSchema,
  ContactDataSchema,
  MemberDataSchema,
  SETTINGS_DOCS,
  WorkshopSettingsSchema,
  type AuditFields,
  type Stored,
} from '@/model'
import { byDateDesc, byName, type DataApi } from './api'
import { addContact, createDocument, updateDocument } from './repo'

/**
 * Convierte un documento en datos validados + auditoría + id. Un documento que
 * no pasa el esquema se omite (y se avisa en consola) en lugar de romper la UI.
 */
function toStored<S extends z.ZodType>(schema: S, snap: DocumentSnapshot): Stored<z.output<S>> | null {
  // 'estimate': las escrituras locales aún sin confirmar tienen fecha estimada.
  const raw = snap.data({ serverTimestamps: 'estimate' })
  if (!raw) return null
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    // Solo campos y códigos de error, nunca los valores (pueden ser datos personales).
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.code}`)
    console.warn(`Documento inválido en ${snap.ref.parent.id}`, issues)
    return null
  }
  const audit: AuditFields = {
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedBy: raw.updatedBy,
    updatedAt: raw.updatedAt,
  }
  return { ...(parsed.data as object), ...audit, id: snap.id } as Stored<z.output<S>>
}

// Si una lectura falla (sin permiso, socio desactivado…) se avisa en pantalla en
// lugar de quedar "Cargando…" sin explicación.
const onError = (what: string) => (err: Error) => {
  console.error(`Error leyendo ${what}`, err)
  const code = (err as { code?: string }).code
  toast.error(
    code === 'permission-denied'
      ? `Sin acceso a ${what}. Si te desactivaron como socio, pedí que te vuelvan a habilitar.`
      : `No se pudieron cargar ${what}. Revisá la conexión y recargá.`,
    { id: `read-error-${what}` },
  )
}

export function createFirestoreDataApi(db: Firestore): DataApi {
  return {
    watchClients(cb) {
      return onSnapshot(
        collection(db, COLLECTIONS.clients),
        (snap) => {
          const list = snap.docs.map((d) => toStored(ClientDataSchema, d)).filter((c) => c !== null)
          cb(list.sort(byName))
        },
        onError('clientes'),
      )
    },

    watchClient(id, cb) {
      return onSnapshot(doc(db, COLLECTIONS.clients, id), (snap) => cb(toStored(ClientDataSchema, snap)), onError('cliente'))
    },

    watchContacts(clientId, cb) {
      return onSnapshot(
        collection(db, COLLECTIONS.clients, clientId, COLLECTIONS.contacts),
        (snap) => {
          const list = snap.docs.map((d) => toStored(ContactDataSchema, d)).filter((c) => c !== null)
          cb(list.sort(byDateDesc))
        },
        onError('contactos'),
      )
    },

    watchMembers(cb) {
      return onSnapshot(
        collection(db, COLLECTIONS.members),
        (snap) => {
          const list = snap.docs.flatMap((d) => {
            const parsed = MemberDataSchema.safeParse(d.data())
            return parsed.success ? [{ email: d.id, ...parsed.data }] : []
          })
          cb(list.sort(byName))
        },
        onError('socios'),
      )
    },

    watchWorkshopSettings(cb) {
      return onSnapshot(
        doc(db, COLLECTIONS.settings, SETTINGS_DOCS.workshop),
        (snap) => {
          const parsed = WorkshopSettingsSchema.safeParse(snap.data() ?? {})
          cb({
            settings: parsed.success ? parsed.data : WorkshopSettingsSchema.parse({}),
            exists: snap.exists(),
          })
        },
        onError('ajustes'),
      )
    },

    createClient(input, by) {
      return createDocument(db, COLLECTIONS.clients, ClientDataSchema, input, by)
    },

    updateClient(id, next, by) {
      return updateDocument(db, COLLECTIONS.clients, id, ClientDataSchema, next, by)
    },

    addContact(client, input, nextContactAt, by) {
      return addContact(db, client, input, nextContactAt, by)
    },

    saveWorkshopSettings(next, exists, by) {
      return exists
        ? updateDocument(db, COLLECTIONS.settings, SETTINGS_DOCS.workshop, WorkshopSettingsSchema, next, by)
        : createDocument(db, COLLECTIONS.settings, WorkshopSettingsSchema, next, by, SETTINGS_DOCS.workshop)
    },
  }
}
