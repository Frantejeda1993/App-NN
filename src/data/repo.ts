import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type FieldValue,
  type Firestore,
} from 'firebase/firestore'
import type { z } from 'zod'
import {
  COLLECTIONS,
  ContactDataSchema,
  isoDateSchema,
  MovementBaseSchema,
  MovementControlSchema,
  MovementDataSchema,
  auditLogId,
  type MovementControl,
  type MovementData,
} from '@/model'

/**
 * Resultado de una escritura. `committed` se resuelve cuando el servidor la
 * confirma; sin conexión queda pendiente pero la escritura ya está en la caché
 * local, así que la UI no debe esperar a `committed` para seguir.
 *
 * Si el servidor la rechaza (conflicto de versión, socio desactivado…) la
 * escritura optimista se revierte y `committed` se rechaza: la UI debe
 * engancharle un `.catch` que avise al usuario.
 */
export interface WriteResult {
  id: string
  committed: Promise<void>
}

function result(id: string, committed: Promise<void>): WriteResult {
  // Marca la promesa como manejada para evitar "unhandled rejection" si quien
  // llama no espera la confirmación; quien la espere igual recibe el error.
  committed.catch(() => {})
  return { id, committed }
}

type AuditStamp = Record<'createdBy' | 'updatedBy', string> & Record<'createdAt' | 'updatedAt', FieldValue>

export function auditOnCreate(by: string): AuditStamp {
  return { createdBy: by, createdAt: serverTimestamp(), updatedBy: by, updatedAt: serverTimestamp() }
}

export function auditOnUpdate(by: string): Pick<AuditStamp, 'updatedBy' | 'updatedAt'> {
  return { updatedBy: by, updatedAt: serverTimestamp() }
}

/** Crea un documento validado con el esquema y sellado con auditoría. */
export function createDocument<S extends z.ZodType>(
  db: Firestore,
  collectionPath: string,
  schema: S,
  input: z.input<S>,
  by: string,
  id?: string,
): WriteResult {
  const data = schema.parse(input) as Record<string, unknown>
  const ref = id ? doc(db, collectionPath, id) : doc(collection(db, collectionPath))
  return result(ref.id, setDoc(ref, { ...data, ...auditOnCreate(by) }))
}

/**
 * Reemplaza los datos editables de un documento existente. Recibe el objeto
 * COMPLETO (tipo de salida del esquema, sin campos opcionales) para que omitir
 * un campo no lo resetee a su valor por defecto; se valida entero para que se
 * cumplan las reglas cruzadas del esquema.
 */
export function updateDocument<S extends z.ZodType>(
  db: Firestore,
  collectionPath: string,
  id: string,
  schema: S,
  next: z.output<S>,
  by: string,
): WriteResult {
  const data = schema.parse(next) as Record<string, unknown>
  return result(id, updateDoc(doc(db, collectionPath, id), { ...data, ...auditOnUpdate(by) }))
}

// ---- Contactos con clientes ----------------------------------------------------

/**
 * Registra un contacto y, en la misma escritura, actualiza en el cliente el
 * último contacto (si es más reciente) y la próxima fecha a contactar.
 */
export function addContact(
  db: Firestore,
  client: { id: string; lastContactAt: string | null },
  input: z.input<typeof ContactDataSchema>,
  nextContactAt: string | null,
  by: string,
): WriteResult {
  const contact = ContactDataSchema.parse(input)
  const next = nextContactAt === null ? null : isoDateSchema.parse(nextContactAt)
  const lastContactAt =
    client.lastContactAt && client.lastContactAt > contact.date ? client.lastContactAt : contact.date

  const batch = writeBatch(db)
  const ref = doc(collection(db, COLLECTIONS.clients, client.id, COLLECTIONS.contacts))
  batch.set(ref, { ...contact, ...auditOnCreate(by) })
  batch.update(doc(db, COLLECTIONS.clients, client.id), {
    lastContactAt,
    nextContactAt: next,
    ...auditOnUpdate(by),
  })
  return result(ref.id, batch.commit())
}

// ---- Movimientos: siempre con su entrada en auditLog, nunca se borran ---------

export type StoredMovement = MovementData & MovementControl & { id: string }

/**
 * Extrae los datos del movimiento tal como están guardados (sin auditoría ni id).
 * No re-valida con el esquema actual: un movimiento viejo o editado a mano en la
 * consola tiene que poder corregirse o darse de baja igual.
 */
function pickMovement(m: StoredMovement): MovementData & MovementControl {
  const control = MovementControlSchema.parse(m)
  const data = Object.fromEntries(
    Object.keys(MovementBaseSchema.shape).map((k) => [k, (m as Record<string, unknown>)[k] ?? null]),
  ) as MovementData
  return { ...data, ...control }
}

function writeMovementVersion(
  db: Firestore,
  id: string,
  action: 'create' | 'update' | 'delete',
  before: (MovementData & MovementControl) | null,
  after: MovementData & MovementControl,
  by: string,
): WriteResult {
  const batch = writeBatch(db)
  const ref = doc(db, COLLECTIONS.movements, id)
  if (action === 'create') batch.set(ref, { ...after, ...auditOnCreate(by) })
  else batch.update(ref, { ...after, ...auditOnUpdate(by) })
  batch.set(doc(db, COLLECTIONS.auditLog, auditLogId(id, after.version)), {
    entity: COLLECTIONS.movements,
    entityId: id,
    version: after.version,
    action,
    before,
    after,
    by,
    at: serverTimestamp(),
  })
  return result(id, batch.commit())
}

export function createMovement(db: Firestore, input: z.input<typeof MovementDataSchema>, by: string): WriteResult {
  const data = MovementDataSchema.parse(input)
  const id = doc(collection(db, COLLECTIONS.movements)).id
  return writeMovementVersion(db, id, 'create', null, { ...data, version: 1, deleted: false, deletedReason: '' }, by)
}

/**
 * Edita un movimiento. `current` es la versión que el usuario estaba viendo: si
 * otro socio lo editó antes, la versión no coincide y las reglas lo rechazan.
 */
export function updateMovement(
  db: Firestore,
  current: StoredMovement,
  next: z.output<typeof MovementDataSchema>,
  by: string,
): WriteResult {
  if (current.deleted) throw new Error('No se puede editar un movimiento eliminado')
  const before = pickMovement(current)
  const data = MovementDataSchema.parse(next)
  const after = { ...data, version: current.version + 1, deleted: false, deletedReason: '' }
  return writeMovementVersion(db, current.id, 'update', before, after, by)
}

/** Baja lógica: queda marcado como eliminado (y auditado), no desaparece. */
export function deleteMovement(db: Firestore, current: StoredMovement, reason: string, by: string): WriteResult {
  if (current.deleted) throw new Error('El movimiento ya está eliminado')
  const before = pickMovement(current)
  const after = { ...before, version: current.version + 1, deleted: true, deletedReason: reason.trim().slice(0, 500) }
  return writeMovementVersion(db, current.id, 'delete', before, after, by)
}
