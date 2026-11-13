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
  createMovements,
  deleteMovement,
  updateDocument,
  updateMovement,
  updateWithRev,
  type StoredMovement,
} from '@/data/repo'
import { distributionMovements } from '@/domain/distribution'
import {
  ClientDataSchema,
  GeneralExpenseDataSchema,
  MaterialDataSchema,
  MovementDataSchema,
  ProjectDataSchema,
  QuoteDataSchema,
  TemplateDataSchema,
} from '@/model'

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

// Todas las colecciones: quien no es socio activo con email verificado no lee,
// no lista y no crea nada. El socio activo sí lee (la prueba no es vacía).
describe('matriz de acceso por colección', () => {
  const PATHS = [
    'clients/c1',
    'clients/c1/contacts/k1',
    'projects/p1',
    'boxes/b1',
    'generalExpenses/g1',
    'movements/m1',
    'auditLog/m1_v1',
    'settings/workshop',
    'quotes/q1',
    'templates/t1',
    'catalogMaterials/x1',
    'catalogEdgeBanding/x1',
    'catalogHardware/x1',
  ]
  const BAJA = 'baja@gmail.com'
  const actors: [string, () => Firestore][] = [
    ['alguien fuera de la lista', () => dbAs('extrano@gmail.com')],
    ['un socio desactivado', () => dbAs(BAJA)],
    ['un socio con el email sin verificar', () => env.authenticatedContext(NACHO, { email: NACHO, email_verified: false }).firestore() as unknown as Firestore],
    ['sin sesión', () => dbAs(null)],
  ]

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, `members/${BAJA}`), { name: 'Baja', active: false })
      for (const p of PATHS) await setDoc(doc(db, p), { name: 'x', title: 'x', ...stamp(NACHO) })
    })
  })

  it('el socio activo lee todas', async () => {
    for (const p of PATHS) await assertSucceeds(getDoc(doc(dbAs(NACHO), p)))
  })

  for (const [who, db] of actors) {
    it(`${who} no lee, no lista ni crea en ninguna`, async () => {
      for (const p of PATHS) {
        const parent = p.split('/').slice(0, -1).join('/')
        await assertFails(getDoc(doc(db(), p)))
        await assertFails(getDocs(collection(db(), parent)))
        await assertFails(setDoc(doc(db(), `${parent}/nuevo`), { name: 'x', title: 'x', ...stamp(NACHO) }))
      }
      // Tampoco ve a los demás socios.
      await assertFails(getDoc(doc(db(), `members/${NAHUEL}`)))
      await assertFails(getDocs(collection(db(), 'members')))
    })
  }
})

describe('preferencias de usuario (tour)', () => {
  const prefs = (v: unknown) => ({ tourSeenVersion: v, updatedAt: serverTimestamp() })

  it('cada socio lee y guarda solo las suyas', async () => {
    await assertSucceeds(setDoc(doc(dbAs(NACHO), `userPrefs/${NACHO}`), prefs(1)))
    await assertSucceeds(getDoc(doc(dbAs(NACHO), `userPrefs/${NACHO}`)))
    await assertSucceeds(setDoc(doc(dbAs(NACHO), `userPrefs/${NACHO}`), prefs(2)))
    // Las de otro socio, no.
    await assertFails(getDoc(doc(dbAs(NAHUEL), `userPrefs/${NACHO}`)))
    await assertFails(setDoc(doc(dbAs(NAHUEL), `userPrefs/${NACHO}`), prefs(0)))
    await assertFails(getDocs(collection(dbAs(NACHO), 'userPrefs')))
  })

  it('un no socio no guarda nada y no se aceptan campos extra ni valores raros', async () => {
    await assertFails(setDoc(doc(dbAs('extrano@gmail.com'), 'userPrefs/extrano@gmail.com'), prefs(1)))
    await assertFails(setDoc(doc(dbAs(NACHO), `userPrefs/${NACHO}`), { ...prefs(1), admin: true }))
    await assertFails(setDoc(doc(dbAs(NACHO), `userPrefs/${NACHO}`), prefs('1')))
    await assertFails(setDoc(doc(dbAs(NACHO), `userPrefs/${NACHO}`), prefs(-1)))
    await assertFails(setDoc(doc(dbAs(NACHO), `userPrefs/${NACHO}`), { tourSeenVersion: 1, updatedAt: Timestamp.fromMillis(0) }))
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
    const upd = (next: typeof base) => updateWithRev(db, NACHO, [{ collectionPath: 'quotes', id: sent.id, schema: QuoteDataSchema, next }]).committed
    await assertFails(upd({ ...base, status: 'borrador' }))
    await assertFails(upd({ ...base, version: 5 }))
    await assertSucceeds(upd({ ...base, status: 'aceptado' }))
  })

  it('lo comprado de la lista de compras debe ser una lista acotada', async () => {
    const db = dbAs(NACHO)
    const base = { title: 'Q', status: 'aceptado', version: 1, items: [], freeLines: [], adjustments: [], ...stamp(NACHO) }
    await assertSucceeds(setDoc(doc(db, 'quotes/qp1'), { ...base, purchased: ['hw:h1', 'sheet:m1'] }))
    await assertFails(setDoc(doc(db, 'quotes/qp2'), { ...base, purchased: 'hw:h1' }))
    await assertFails(setDoc(doc(db, 'quotes/qp3'), { ...base, purchased: Array.from({ length: 501 }, (_, i) => `hw:${i}`) }))
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
    await assertSucceeds(updateWithRev(dbAs(NAHUEL), NAHUEL, [{ collectionPath: 'projects', id: p.id, schema: ProjectDataSchema, next }]).committed)
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

describe('catálogo y plantillas', () => {
  it('los socios crean y editan catálogo; no se borra; las plantillas sí', async () => {
    const db = dbAs(NACHO)
    const mat = createDocument(
      db,
      'catalogMaterials',
      MaterialDataSchema,
      { name: 'Melamina', sheetWidthMm: 2850, sheetHeightMm: 2100, thicknessMm: 19, sheetPriceCents: 12389 },
      NACHO,
    )
    await assertSucceeds(mat.committed)
    await assertFails(deleteDoc(doc(db, 'catalogMaterials', mat.id)))
    await assertSucceeds(setDoc(doc(db, 'settings/services'), { cutAndEdgePerM2Cents: 1600, ...stamp(NACHO) }))

    const tpl = createDocument(
      db,
      'templates',
      TemplateDataSchema,
      { name: 'Bajo mesada', item: { name: 'Bajo mesada', widthMm: 600, heightMm: 720, depthMm: 560 } },
      NACHO,
    )
    await assertSucceeds(tpl.committed)
    await assertSucceeds(deleteDoc(doc(dbAs(NAHUEL), 'templates', tpl.id)))
    await assertFails(getDoc(doc(dbAs('extrano@gmail.com'), 'catalogMaterials', mat.id)))
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

/**
 * Escribe un movimiento "a mano" (salteando zod, como haría alguien con la
 * consola o el SDK) con su auditLog correcto: así lo único que decide son las
 * reglas de datos del movimiento.
 */
function rawMovement(db: Firestore, id: string, data: Record<string, unknown>) {
  const full = {
    type: 'cobro', status: 'pagado', amountCents: 10000, date: '2026-11-07', boxId: 'b1', toBoxId: null, paidBy: null,
    memberEmail: null, projectId: 'p1', projectSplits: [], generalExpenseId: null, category: '', description: '',
    version: 1, deleted: false, deletedReason: '', ...data,
  }
  const batch = writeBatch(db)
  batch.set(doc(db, 'movements', id), { ...full, ...stamp(NACHO) })
  batch.set(doc(db, 'auditLog', `${id}_v1`), {
    entity: 'movements', entityId: id, version: 1, action: 'create', before: null, after: full, by: NACHO, at: serverTimestamp(),
  })
  return batch.commit()
}

describe('movimientos: reglas cruzadas (revisión de seguridad)', () => {
  it('un movimiento bien formado escrito a mano pasa (control)', async () => {
    await assertSucceeds(rawMovement(dbAs(NACHO), 'ok1', {}))
  })

  it('un cobro con reparto entre proyectos se rechaza (inflaría la ganancia de otro proyecto)', async () => {
    await assertFails(rawMovement(dbAs(NACHO), 'x1', { projectSplits: [{ projectId: 'p2', amountCents: 9_999_999 }] }))
  })

  it('las partes del reparto de un gasto deben sumar el total', async () => {
    const gasto = { type: 'gasto_proyecto', projectId: null }
    const db = dbAs(NACHO)
    await assertFails(rawMovement(db, 'x2', { ...gasto, projectSplits: [{ projectId: 'p1', amountCents: 3000 }, { projectId: 'p2', amountCents: 3000 }] }))
    await assertSucceeds(rawMovement(db, 'x3', { ...gasto, projectSplits: [{ projectId: 'p1', amountCents: 4000 }, { projectId: 'p2', amountCents: 6000 }] }))
    await assertFails(rawMovement(db, 'x4', { ...gasto, projectId: 'p1', projectSplits: [{ projectId: 'p1', amountCents: 10000 }] }))
  })

  it('campos que no corresponden al tipo se rechazan', async () => {
    const db = dbAs(NACHO)
    await assertFails(rawMovement(db, 'x5', { type: 'retiro', projectId: 'p1', memberEmail: NACHO }))
    await assertFails(rawMovement(db, 'x6', { generalExpenseId: 'g1' }))
    await assertFails(rawMovement(db, 'x7', { type: 'gasto_proyecto', status: 'pendiente_pago', boxId: 'b1' }))
  })

  it('la fecha debe existir con formato AAAA-MM-DD', async () => {
    const db = dbAs(NACHO)
    await assertFails(rawMovement(db, 'x8', { date: '9999-99-99' }))
    await assertFails(rawMovement(db, 'x9', { date: '2026-13-01' }))
  })

  it('no se asigna un retiro a un socio desactivado', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'members/baja@gmail.com'), { name: 'Baja', active: false })
    })
    await assertFails(rawMovement(dbAs(NACHO), 'x10', { type: 'retiro', projectId: null, memberEmail: 'baja@gmail.com' }))
  })

  it('una baja lógica sin motivo se rechaza', async () => {
    const db = dbAs(NACHO)
    const { id, committed } = createMovement(db, cobro, NACHO)
    await committed
    const current = await loadMovement(db, id)
    expect(() => deleteMovement(db, current, '   ', NACHO)).toThrow(/motivo/)
  })
})

describe('reparto del fondo del taller', () => {
  it('se registra un movimiento por socio, sin caja, en un solo lote', async () => {
    const db = dbAs(NACHO)
    const res = createMovements(db, distributionMovements({ date: '2026-11-07', description: 'Octubre', shares: { [NACHO]: 5000, [NAHUEL]: 5000 } }), NACHO)
    await assertSucceeds(res.committed)
    const list = await getDocs(query(collection(db, 'movements'), where('type', '==', 'reparto')))
    expect(list.size).toBe(2)
  })

  it('un reparto que mueve una caja se rechaza', async () => {
    await assertFails(rawMovement(dbAs(NACHO), 'r1', { type: 'reparto', projectId: null, memberEmail: NACHO, boxId: 'b1' }))
    await assertSucceeds(rawMovement(dbAs(NACHO), 'r2', { type: 'reparto', projectId: null, memberEmail: NACHO, boxId: null }))
  })
})

describe('concurrencia optimista (rev) en presupuestos y proyectos', () => {
  it('dos guardados sobre la misma versión: el segundo se rechaza', async () => {
    const db = dbAs(NACHO)
    const q = createDocument(db, 'quotes', QuoteDataSchema, { title: 'Cocina' }, NACHO)
    await q.committed
    const base = QuoteDataSchema.parse({ title: 'Cocina' })
    await assertSucceeds(updateWithRev(db, NACHO, [{ collectionPath: 'quotes', id: q.id, schema: QuoteDataSchema, next: { ...base, notes: 'A' } }]).committed)
    await assertFails(updateWithRev(dbAs(NAHUEL), NAHUEL, [{ collectionPath: 'quotes', id: q.id, schema: QuoteDataSchema, next: { ...base, notes: 'B' } }]).committed)
  })

  it('un update directo sin subir rev se rechaza', async () => {
    const db = dbAs(NACHO)
    const p = createDocument(db, 'projects', ProjectDataSchema, { title: 'Cocina', clientId: 'c1', shares: { [NACHO]: 10000 } }, NACHO)
    await p.committed
    const next = ProjectDataSchema.parse({ title: 'Cocina 2', clientId: 'c1', shares: { [NACHO]: 10000 } })
    await assertFails(updateDocument(db, 'projects', p.id, ProjectDataSchema, next, NACHO).committed)
  })
})

describe('otros endurecimientos', () => {
  it('el historial de contactos no se borra', async () => {
    const db = dbAs(NACHO)
    const c = createDocument(db, 'clients', ClientDataSchema, { name: 'Ana' }, NACHO)
    await c.committed
    const k = addContact(db, { id: c.id, lastContactAt: null }, { date: '2026-11-07', channel: 'whatsapp' }, null, NACHO)
    await k.committed
    await assertFails(deleteDoc(doc(db, 'clients', c.id, 'contacts', k.id)))
  })

  it('la configuración inicial se guarda en settings/opening con mapas acotados', async () => {
    const db = dbAs(NACHO)
    await assertSucceeds(setDoc(doc(db, 'settings/opening'), { date: '2026-01-01', boxes: { b1: 5000 }, people: {}, notes: '', ...stamp(NACHO) }))
    await assertFails(setDoc(doc(dbAs(NAHUEL), 'settings/opening'), { date: null, boxes: 'x', people: {}, notes: '', updatedBy: NAHUEL, updatedAt: serverTimestamp(), createdBy: NACHO }))
  })
})
