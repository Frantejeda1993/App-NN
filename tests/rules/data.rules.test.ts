import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  addContact,
  createDocument,
  createMovement,
  deleteMovement,
  updateDocument,
  updateMovement,
  type StoredMovement,
} from '@/data/repo'
import { ClientDataSchema, GeneralExpenseDataSchema, MovementDataSchema, ProjectDataSchema, QuoteDataSchema } from '@/model'

let env: RulesTestEnvironment

const NACHO = 'nacho@gmail.com'
const NAHUEL = 'nahuel@gmail.com'

function dbAs(email: string | null): Firestore {
  const ctx = email
    ? env.authenticatedContext(email, { email, email_verified: true })
    : env.unauthenticatedContext()
  return ctx.firestore() as unknown as Firestore
}

const stamp = (by: string) => ({
  createdBy: by,
  createdAt: serverTimestamp(),
  updatedBy: by,
  updatedAt: serverTimestamp(),
})

const cobro = { type: 'cobro', amountCents: 150000, date: '2026-11-07', projectId: 'p1', boxId: 'b1', description: 'Seña' } as const

async function loadMovement(db: Firestore, id: string): Promise<StoredMovement> {
  const snap = await getDoc(doc(db, 'movements', id))
  return { id, ...(snap.data() as Omit<StoredMovement, 'id'>) }
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-app-nn',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, `members/${NACHO}`), { name: 'Nacho', active: true })
    await setDoc(doc(db, `members/${NAHUEL}`), { name: 'Nahuel', active: true })
  })
})

describe('acceso general', () => {
  it('un no socio no puede leer ni crear datos de negocio', async () => {
    const db = dbAs('extrano@gmail.com')
    await assertFails(getDoc(doc(db, 'clients/c1')))
    await assertFails(setDoc(doc(db, 'clients/c1'), { name: 'X', ...stamp('extrano@gmail.com') }))
  })

  it('sin sesión no se puede leer nada', async () => {
    await assertFails(getDoc(doc(dbAs(null), 'projects/p1')))
  })

  it('las rutas no declaradas están cerradas', async () => {
    await assertFails(setDoc(doc(dbAs(NACHO), 'secreto/x'), { a: 1, ...stamp(NACHO) }))
  })
})

describe('auditoría en documentos comunes', () => {
  it('createDocument / updateDocument funcionan y sellan quién y cuándo', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createDocument(db, 'clients', ClientDataSchema, { name: 'Raquel' }, NACHO)
    await assertSucceeds(committed)

    const db2 = dbAs(NAHUEL)
    await assertSucceeds(
      updateDocument(db2, 'clients', id, ClientDataSchema, ClientDataSchema.parse({ name: 'Raquel M.', source: 'Wallapop' }), NAHUEL).committed,
    )
    const snap = await getDoc(doc(db2, 'clients', id))
    expect(snap.data()).toMatchObject({ name: 'Raquel M.', createdBy: NACHO, updatedBy: NAHUEL })
    expect(snap.data()?.createdAt).toBeInstanceOf(Timestamp)
  })

  it('no se puede firmar como otro socio', async () => {
    await assertFails(setDoc(doc(dbAs(NACHO), 'clients/c1'), { name: 'X', ...stamp(NAHUEL) }))
  })

  it('no se puede inventar la fecha', async () => {
    const fake = { name: 'X', createdBy: NACHO, updatedBy: NACHO, createdAt: Timestamp.fromDate(new Date('2020-01-01')), updatedAt: serverTimestamp() }
    await assertFails(setDoc(doc(dbAs(NACHO), 'clients/c1'), fake))
  })

  it('al editar no se puede reescribir el autor original', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createDocument(db, 'clients', ClientDataSchema, { name: 'Raquel' }, NACHO)
    await committed
    await assertFails(updateDoc(doc(dbAs(NAHUEL), 'clients', id), { createdBy: NAHUEL, updatedBy: NAHUEL, updatedAt: serverTimestamp() }))
  })

  it('las reglas rechazan un proyecto con estado inválido aunque se salteen zod', async () => {
    const db = dbAs(NACHO)
    await assertFails(setDoc(doc(db, 'projects/p1'), { title: 'X', clientId: 'c1', status: 'listo', shares: {}, ...stamp(NACHO) }))
    const ok = ProjectDataSchema.parse({ title: 'Cocina', clientId: 'c1', shares: { [NACHO]: 5000, taller: 5000 } })
    await assertSucceeds(setDoc(doc(db, 'projects/p2'), { ...ok, ...stamp(NACHO) }))
  })

  it('clientes y proyectos no se borran', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createDocument(db, 'clients', ClientDataSchema, { name: 'Raquel' }, NACHO)
    await committed
    await assertFails(deleteDoc(doc(db, 'clients', id)))
  })

  it('settings solo admite los documentos conocidos', async () => {
    const db = dbAs(NACHO)
    await assertSucceeds(setDoc(doc(db, 'settings/workshop'), { name: 'Taller NN', ...stamp(NACHO) }))
    await assertFails(setDoc(doc(db, 'settings/otro'), { name: 'x', ...stamp(NACHO) }))
  })

  it('solo se borran presupuestos en borrador', async () => {
    const db = dbAs(NACHO)
    const draft = createDocument(db, 'quotes', QuoteDataSchema, { title: 'Borrador' }, NACHO)
    const sent = createDocument(db, 'quotes', QuoteDataSchema, { title: 'Enviado', status: 'enviado' }, NACHO)
    await Promise.all([draft.committed, sent.committed])
    await assertSucceeds(deleteDoc(doc(db, 'quotes', draft.id)))
    await assertFails(deleteDoc(doc(db, 'quotes', sent.id)))
  })

  it('un presupuesto enviado no puede volver a borrador ni cambiar de versión', async () => {
    const db = dbAs(NACHO)
    const sent = createDocument(db, 'quotes', QuoteDataSchema, { title: 'Enviado', status: 'enviado' }, NACHO)
    await sent.committed
    const base = QuoteDataSchema.parse({ title: 'Enviado', status: 'enviado' })
    await assertFails(updateDocument(db, 'quotes', sent.id, QuoteDataSchema, { ...base, status: 'borrador' }, NACHO).committed)
    await assertFails(updateDocument(db, 'quotes', sent.id, QuoteDataSchema, { ...base, version: 5 }, NACHO).committed)
    await assertSucceeds(updateDocument(db, 'quotes', sent.id, QuoteDataSchema, { ...base, status: 'aceptado' }, NACHO).committed)
  })

  it('un reparto con demasiados participantes se rechaza', async () => {
    const db = dbAs(NACHO)
    const shares = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`s${i}@x.com`, 0]))
    await assertFails(setDoc(doc(db, 'projects/px'), { title: 'X', clientId: 'c1', status: 'pendiente', shares, ...stamp(NACHO) }))
  })
})

describe('proyectos', () => {
  it('se crean y editan con la participación como mapa de emails (con puntos)', async () => {
    const db = dbAs(NACHO)
    const base = { title: 'Cocina', clientId: 'c1', shares: { [NACHO]: 4000, [NAHUEL]: 4000, taller: 2000 } }
    const p = createDocument(db, 'projects', ProjectDataSchema, base, NACHO)
    await assertSucceeds(p.committed)

    const next = ProjectDataSchema.parse({ ...base, status: 'en_proceso', shares: { [NACHO]: 5000, [NAHUEL]: 5000, taller: 0 } })
    await assertSucceeds(updateDocument(dbAs(NAHUEL), 'projects', p.id, ProjectDataSchema, next, NAHUEL).committed)
    const saved = (await getDoc(doc(db, 'projects', p.id))).data()
    expect(saved).toMatchObject({ status: 'en_proceso', shares: { [NACHO]: 5000, [NAHUEL]: 5000, taller: 0 }, createdBy: NACHO })
  })

  it('el reparto por defecto se guarda en settings/workshop', async () => {
    const db = dbAs(NACHO)
    await assertSucceeds(
      setDoc(doc(db, 'settings/workshop'), { name: 'Taller', defaultShares: { [NACHO]: 5000, [NAHUEL]: 5000 }, ...stamp(NACHO) }),
    )
    await assertSucceeds(setDoc(doc(db, 'settings/services'), { cutAndEdgePerM2Cents: 1600, ...stamp(NACHO) }))
  })

  it('un reparto por defecto gigante o que no es un mapa se rechaza', async () => {
    const db = dbAs(NACHO)
    const huge = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`s${i}@x.com`, 0]))
    await assertFails(setDoc(doc(db, 'settings/workshop'), { name: 'T', defaultShares: huge, ...stamp(NACHO) }))
    await assertFails(setDoc(doc(db, 'settings/workshop'), { name: 'T', defaultShares: 'basura', ...stamp(NACHO) }))
  })
})

describe('gastos generales', () => {
  it('se crean con reparto y se pagan con un movimiento gasto_general auditado', async () => {
    const db = dbAs(NACHO)
    const g = createDocument(
      db,
      'generalExpenses',
      GeneralExpenseDataSchema,
      { name: 'Alquiler', kind: 'fijo', category: 'Taller', amountCents: 25000, dayOfMonth: 1, shares: { [NACHO]: 5000, [NAHUEL]: 5000 } },
      NACHO,
    )
    await assertSucceeds(g.committed)
    const pay = createMovement(db, { type: 'gasto_general', amountCents: 25000, date: '2026-11-07', generalExpenseId: g.id, boxId: 'b1' }, NACHO)
    await assertSucceeds(pay.committed)
  })

  it('las reglas rechazan un gasto general con importe no positivo o tipo desconocido', async () => {
    const db = dbAs(NACHO)
    const base = { name: 'Luz', kind: 'fijo', category: 'Taller', amountCents: 8000, shares: { taller: 10000 }, ...stamp(NACHO) }
    await assertFails(setDoc(doc(db, 'generalExpenses/g1'), { ...base, amountCents: 0 }))
    await assertFails(setDoc(doc(db, 'generalExpenses/g2'), { ...base, kind: 'mensual' }))
    await assertSucceeds(setDoc(doc(db, 'generalExpenses/g3'), base))
  })
})

describe('contactos con clientes', () => {
  it('addContact guarda el contacto y actualiza el cliente en una sola escritura', async () => {
    const db = dbAs(NACHO)
    const c = createDocument(db, 'clients', ClientDataSchema, { name: 'James', lastContactAt: '2026-10-01' }, NACHO)
    await c.committed

    const db2 = dbAs(NAHUEL)
    const k = addContact(db2, { id: c.id, lastContactAt: '2026-10-01' }, { date: '2026-11-07', channel: 'llamada', note: 'ok' }, '2026-11-14', NAHUEL)
    await assertSucceeds(k.committed)

    const client = (await getDoc(doc(db2, 'clients', c.id))).data()
    expect(client).toMatchObject({ lastContactAt: '2026-11-07', nextContactAt: '2026-11-14', updatedBy: NAHUEL, createdBy: NACHO })
    const contact = (await getDoc(doc(db2, 'clients', c.id, 'contacts', k.id))).data()
    expect(contact).toMatchObject({ channel: 'llamada', createdBy: NAHUEL })
  })

  it('un contacto anterior no pisa un último contacto más reciente', async () => {
    const db = dbAs(NACHO)
    const c = createDocument(db, 'clients', ClientDataSchema, { name: 'James', lastContactAt: '2026-11-07' }, NACHO)
    await c.committed
    await addContact(db, { id: c.id, lastContactAt: '2026-11-07' }, { date: '2026-10-01', channel: 'email' }, null, NACHO).committed
    expect((await getDoc(doc(db, 'clients', c.id))).data()).toMatchObject({ lastContactAt: '2026-11-07', nextContactAt: null })
  })

  it('un no socio no puede registrar contactos', async () => {
    const db = dbAs(NACHO)
    const c = createDocument(db, 'clients', ClientDataSchema, { name: 'James' }, NACHO)
    await c.committed
    const intruso = 'extrano@gmail.com'
    await assertFails(addContact(dbAs(intruso), { id: c.id, lastContactAt: null }, { date: '2026-11-07', channel: 'otro' }, null, intruso).committed)
  })
})

describe('movimientos', () => {
  it('createMovement crea el movimiento y su auditLog v1', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await assertSucceeds(committed)
    const m = await loadMovement(db, id)
    expect(m).toMatchObject({ amountCents: 150000, version: 1, deleted: false, createdBy: NACHO })
    const log = await getDoc(doc(db, 'auditLog', `${id}_v1`))
    expect(log.data()).toMatchObject({ action: 'create', by: NACHO, version: 1, before: null })
  })

  it('un movimiento sin su auditLog se rechaza', async () => {
    const db = dbAs(NACHO)
    await assertFails(
      setDoc(doc(db, 'movements/m1'), { ...cobro, status: 'pagado', version: 1, deleted: false, ...stamp(NACHO) }),
    )
  })

  it('updateMovement sube la versión y guarda antes/después', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    const current = await loadMovement(db, id)

    const db2 = dbAs(NAHUEL)
    await assertSucceeds(updateMovement(db2, current, { ...MovementDataSchema.parse(cobro), amountCents: 160000 }, NAHUEL).committed)
    const m = await loadMovement(db2, id)
    expect(m).toMatchObject({ amountCents: 160000, version: 2, updatedBy: NAHUEL, createdBy: NACHO })
    const log = (await getDoc(doc(db2, 'auditLog', `${id}_v2`))).data()
    expect(log).toMatchObject({ action: 'update', by: NAHUEL })
    expect(log?.before).toMatchObject({ amountCents: 150000, version: 1 })
    expect(log?.after).toMatchObject({ amountCents: 160000, version: 2 })
  })

  it('editar sin auditLog o saltando versiones se rechaza', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    const ref = doc(db, 'movements', id)
    await assertFails(updateDoc(ref, { amountCents: 1, version: 2, updatedBy: NACHO, updatedAt: serverTimestamp() }))

    const batch = writeBatch(db)
    batch.update(ref, { amountCents: 1, version: 3, updatedBy: NACHO, updatedAt: serverTimestamp() })
    batch.set(doc(db, 'auditLog', `${id}_v3`), {
      entity: 'movements', entityId: id, version: 3, action: 'update', before: null, after: {}, by: NACHO, at: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })

  it('dos ediciones sobre la misma versión: la segunda se rechaza', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    const seenByBoth = await loadMovement(db, id)
    await assertSucceeds(updateMovement(dbAs(NACHO), seenByBoth, { ...MovementDataSchema.parse(cobro), amountCents: 1000 }, NACHO).committed)
    await assertFails(updateMovement(dbAs(NAHUEL), seenByBoth, { ...MovementDataSchema.parse(cobro), amountCents: 2000 }, NAHUEL).committed)
  })

  it('no se puede borrar físicamente; la baja lógica queda auditada y bloquea ediciones', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    await assertFails(deleteDoc(doc(db, 'movements', id)))

    const current = await loadMovement(db, id)
    await assertSucceeds(deleteMovement(db, current, 'Cargado dos veces', NACHO).committed)
    const deleted = await loadMovement(db, id)
    expect(deleted).toMatchObject({ deleted: true, deletedReason: 'Cargado dos veces', version: 2 })
    expect((await getDoc(doc(db, 'auditLog', `${id}_v2`))).data()).toMatchObject({ action: 'delete' })

    // Ni siquiera saltándose la capa de datos se puede "revivir" o editar.
    const batch = writeBatch(db)
    batch.update(doc(db, 'movements', id), { deleted: false, version: 3, updatedBy: NACHO, updatedAt: serverTimestamp() })
    batch.set(doc(db, 'auditLog', `${id}_v3`), {
      entity: 'movements', entityId: id, version: 3, action: 'update', before: null, after: {}, by: NACHO, at: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })

  it('el auditLog no se puede editar, borrar ni falsificar', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    const logRef = doc(db, 'auditLog', `${id}_v1`)
    await assertFails(updateDoc(logRef, { by: NAHUEL }))
    await assertFails(deleteDoc(logRef))
    // Entrada suelta sin movimiento que la respalde.
    await assertFails(
      setDoc(doc(db, 'auditLog', `${id}_v9`), {
        entity: 'movements', entityId: id, version: 9, action: 'update', before: null, after: {}, by: NACHO, at: serverTimestamp(),
      }),
    )
  })

  it('el historial de un movimiento se consulta por entityId (solo socios)', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    const current = await loadMovement(db, id)
    await updateMovement(db, current, { ...MovementDataSchema.parse(cobro), amountCents: 1 }, NACHO).committed

    const q = query(collection(db, 'auditLog'), where('entityId', '==', id))
    const snap = await assertSucceeds(getDocs(q))
    expect(snap.docs.map((d) => d.data().version).sort()).toEqual([1, 2])
    await assertFails(getDocs(query(collection(dbAs('extrano@gmail.com'), 'auditLog'), where('entityId', '==', id))))
  })

  it('un no socio no puede crear movimientos', async () => {
    const db = dbAs('extrano@gmail.com')
    await assertFails(createMovement(db, cobro, 'extrano@gmail.com').committed)
  })

  // Escribe a mano (sin repo) un movimiento + su log, para probar bypasses.
  function rawBatch(db: Firestore, id: string, movement: Record<string, unknown>, log: Record<string, unknown>) {
    const batch = writeBatch(db)
    batch.set(doc(db, 'movements', id), { ...movement, ...stamp(NACHO) })
    batch.set(doc(db, 'auditLog', `${id}_v1`), { entity: 'movements', entityId: id, version: 1, by: NACHO, at: serverTimestamp(), ...log })
    return batch.commit()
  }
  const full = () => ({ ...MovementDataSchema.parse(cobro), version: 1, deleted: false, deletedReason: '' })

  it('el auditLog debe coincidir con el movimiento (no se puede mentir en el registro)', async () => {
    const db = dbAs(NACHO)
    const m = full()
    await assertFails(rawBatch(db, 'mx', m, { action: 'create', before: null, after: { ...m, amountCents: 999 } }))
    await assertSucceeds(rawBatch(db, 'my', m, { action: 'create', before: null, after: m }))
  })

  it('al editar, el "antes" del registro debe ser el estado real anterior', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    const current = await loadMovement(db, id)
    const forged = { ...current, amountCents: 1 } // "antes" falso
    await assertFails(updateMovement(db, forged, { ...MovementDataSchema.parse(cobro), amountCents: 5000 }, NACHO).committed)
  })

  it('un movimiento con campos desconocidos se rechaza', async () => {
    const db = dbAs(NACHO)
    const m = { ...full(), extra: 'basura' }
    await assertFails(rawBatch(db, 'mz', m, { action: 'create', before: null, after: m }))
  })

  it('no se puede atribuir un gasto a alguien que no es socio', async () => {
    const db = dbAs(NACHO)
    const m = { ...full(), type: 'gasto_proyecto', boxId: null, paidBy: 'extrano@gmail.com' }
    await assertFails(rawBatch(db, 'mw', m, { action: 'create', before: null, after: m }))
  })

  it('las reglas exigen los datos según el tipo (transferencia entre la misma caja)', async () => {
    const db = dbAs(NACHO)
    const m = { ...full(), type: 'transferencia', projectId: null, toBoxId: 'b1' }
    await assertFails(rawBatch(db, 'mt', m, { action: 'create', before: null, after: m }))
  })

  it('las reglas rechazan importes negativos aunque se salteen zod', async () => {
    const db = dbAs(NACHO)
    const batch = writeBatch(db)
    batch.set(doc(db, 'movements/m2'), { ...cobro, amountCents: -5, status: 'pagado', version: 1, deleted: false, ...stamp(NACHO) })
    batch.set(doc(db, 'auditLog/m2_v1'), {
      entity: 'movements', entityId: 'm2', version: 1, action: 'create', before: null, after: {}, by: NACHO, at: serverTimestamp(),
    })
    await assertFails(batch.commit())
  })
})
