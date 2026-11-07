import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase/firestore'
import { toast } from 'sonner'
import type { z } from 'zod'
import {
  COLLECTIONS,
  ClientDataSchema,
  ContactDataSchema,
  BoxDataSchema,
  GeneralExpenseDataSchema,
  MemberDataSchema,
  MovementBaseSchema,
  MovementControlSchema,
  ProjectDataSchema,
  SETTINGS_DOCS,
  WorkshopSettingsSchema,
  type AuditFields,
  type Stored,
} from '@/model'
import { byCreatedDesc, byDateDesc, byMovementDesc, byName, type DataApi } from './api'
import { addContact, createDocument, createMovement, deleteMovement, updateDocument, updateMovement } from './repo'

const StoredMovementSchema = MovementBaseSchema.extend(MovementControlSchema.shape)

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
          const raw = snap.data() ?? {}
          let parsed = WorkshopSettingsSchema.safeParse(raw)
          // Un reparto por defecto inválido no debe borrar el resto de los ajustes.
          if (!parsed.success) parsed = WorkshopSettingsSchema.safeParse({ ...raw, defaultShares: null })
          cb({
            settings: parsed.success ? parsed.data : WorkshopSettingsSchema.parse({}),
            exists: snap.exists(),
          })
        },
        onError('ajustes'),
      )
    },

    watchProjects(cb) {
      return onSnapshot(
        collection(db, COLLECTIONS.projects),
        (snap) => {
          const list = snap.docs.map((d) => toStored(ProjectDataSchema, d)).filter((p) => p !== null)
          cb(list.sort(byCreatedDesc))
        },
        onError('proyectos'),
      )
    },

    watchProject(id, cb) {
      return onSnapshot(doc(db, COLLECTIONS.projects, id), (snap) => cb(toStored(ProjectDataSchema, snap)), onError('proyecto'))
    },

    watchBoxes(cb) {
      return onSnapshot(
        collection(db, COLLECTIONS.boxes),
        (snap) => cb(snap.docs.map((d) => toStored(BoxDataSchema, d)).filter((b) => b !== null).sort(byName)),
        onError('cajas'),
      )
    },

    createBox(input, by) {
      return createDocument(db, COLLECTIONS.boxes, BoxDataSchema, input, by)
    },

    updateBox(id, next, by) {
      return updateDocument(db, COLLECTIONS.boxes, id, BoxDataSchema, next, by)
    },

    watchGeneralExpenses(cb) {
      return onSnapshot(
        collection(db, COLLECTIONS.generalExpenses),
        (snap) => cb(snap.docs.map((d) => toStored(GeneralExpenseDataSchema, d)).filter((g) => g !== null).sort(byName)),
        onError('gastos generales'),
      )
    },

    createGeneralExpense(input, by) {
      return createDocument(db, COLLECTIONS.generalExpenses, GeneralExpenseDataSchema, input, by)
    },

    updateGeneralExpense(id, next, by) {
      return updateDocument(db, COLLECTIONS.generalExpenses, id, GeneralExpenseDataSchema, next, by)
    },

    watchMovements(cb) {
      return onSnapshot(
        collection(db, COLLECTIONS.movements),
        (snap) => {
          // Lectura tolerante (sin reglas cruzadas): un movimiento viejo o editado a
          // mano en la consola se sigue viendo y se puede corregir.
          const list = snap.docs.map((d) => toStored(StoredMovementSchema, d)).filter((m) => m !== null)
          // Un movimiento ilegible quedaría fuera de saldos y totales: se avisa.
          const unreadable = snap.size - list.length
          if (unreadable > 0) {
            toast.warning(
              `${unreadable} movimiento${unreadable > 1 ? 's' : ''} con datos inválidos no se cuenta${unreadable > 1 ? 'n' : ''} en los saldos. Revisalos en la consola de Firebase.`,
              { id: 'unreadable-movements', duration: Infinity },
            )
          }
          cb(list.sort(byMovementDesc))
        },
        onError('movimientos'),
      )
    },

    watchMovementHistory(movementId, cb) {
      return onSnapshot(
        query(collection(db, COLLECTIONS.auditLog), where('entityId', '==', movementId)),
        (snap) => {
          const entries = snap.docs.map((d) => {
            const x = d.data({ serverTimestamps: 'estimate' })
            return {
              id: d.id,
              version: x.version,
              action: x.action,
              before: x.before ?? null,
              after: x.after ?? {},
              by: x.by,
              at: x.at?.toDate?.() ?? null,
            }
          })
          cb(entries.sort((a, b) => a.version - b.version))
        },
        onError('historial'),
      )
    },

    createMovement(input, by) {
      return createMovement(db, input, by)
    },

    updateMovement(current, next, by) {
      return updateMovement(db, current, next, by)
    },

    deleteMovement(current, reason, by) {
      return deleteMovement(db, current, reason, by)
    },

    createProject(input, by) {
      return createDocument(db, COLLECTIONS.projects, ProjectDataSchema, input, by)
    },

    updateProject(id, next, by) {
      return updateDocument(db, COLLECTIONS.projects, id, ProjectDataSchema, next, by)
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
