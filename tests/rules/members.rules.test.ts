import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const socio = { email: 'nacho@gmail.com', email_verified: true }
const inactivo = { email: 'viejo@gmail.com', email_verified: true }
const extrano = { email: 'extrano@gmail.com', email_verified: true }
const sinVerificar = { email: 'nacho@gmail.com', email_verified: false }

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
    await setDoc(doc(db, 'members/nacho@gmail.com'), { name: 'Nacho', active: true })
    await setDoc(doc(db, 'members/viejo@gmail.com'), { name: 'Viejo', active: false })
    await setDoc(doc(db, 'otra/1'), { x: 1 })
  })
})

describe('members', () => {
  it('un socio puede leer su propio documento', async () => {
    const db = env.authenticatedContext('u1', socio).firestore()
    await assertSucceeds(getDoc(doc(db, 'members/nacho@gmail.com')))
  })

  it('alguien fuera de la lista puede consultar su propio documento (inexistente) para saber que no tiene acceso', async () => {
    const db = env.authenticatedContext('u2', extrano).firestore()
    await assertSucceeds(getDoc(doc(db, 'members/extrano@gmail.com')))
  })

  it('un no socio no puede leer el documento de otro', async () => {
    const db = env.authenticatedContext('u2', extrano).firestore()
    await assertFails(getDoc(doc(db, 'members/nacho@gmail.com')))
  })

  it('un no socio no puede listar members', async () => {
    const db = env.authenticatedContext('u2', extrano).firestore()
    await assertFails(getDocs(collection(db, 'members')))
  })

  it('un socio activo puede listar members (participaciones, quién pagó)', async () => {
    const db = env.authenticatedContext('u1', socio).firestore()
    await assertSucceeds(getDocs(collection(db, 'members')))
  })

  it('un socio inactivo no puede listar members', async () => {
    const db = env.authenticatedContext('u3', inactivo).firestore()
    await assertFails(getDocs(collection(db, 'members')))
  })

  it('un socio inactivo puede leer su propio documento (y la app le niega el acceso)', async () => {
    const db = env.authenticatedContext('u3', inactivo).firestore()
    await assertSucceeds(getDoc(doc(db, 'members/viejo@gmail.com')))
  })

  it('el email del token se compara en minúsculas', async () => {
    const db = env
      .authenticatedContext('u5', { email: 'Nacho@Gmail.com', email_verified: true })
      .firestore()
    await assertSucceeds(getDoc(doc(db, 'members/nacho@gmail.com')))
  })

  it('un usuario sin email (p. ej. anónimo) no puede leer nada', async () => {
    const db = env.authenticatedContext('u6', {}).firestore()
    await assertFails(getDoc(doc(db, 'members/nacho@gmail.com')))
  })

  it('nadie puede escribir en members desde la app (ni agregarse a sí mismo)', async () => {
    const db1 = env.authenticatedContext('u1', socio).firestore()
    await assertFails(setDoc(doc(db1, 'members/otro@gmail.com'), { name: 'Otro', active: true }))
    await assertFails(updateDoc(doc(db1, 'members/nacho@gmail.com'), { active: false }))
    await assertFails(deleteDoc(doc(db1, 'members/nacho@gmail.com')))
    const db2 = env.authenticatedContext('u2', extrano).firestore()
    await assertFails(setDoc(doc(db2, 'members/extrano@gmail.com'), { name: 'X', active: true }))
    const db3 = env.authenticatedContext('u3', inactivo).firestore()
    await assertFails(updateDoc(doc(db3, 'members/viejo@gmail.com'), { active: true }))
  })

  it('un email sin verificar no puede leer nada', async () => {
    const db = env.authenticatedContext('u4', sinVerificar).firestore()
    await assertFails(getDoc(doc(db, 'members/nacho@gmail.com')))
  })

  it('sin sesión no se puede leer nada', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'members/nacho@gmail.com')))
  })
})

describe('resto de colecciones (cerradas hasta el paso 2)', () => {
  it('ni un socio puede leer ni escribir otras colecciones todavía', async () => {
    const db = env.authenticatedContext('u1', socio).firestore()
    await assertFails(getDoc(doc(db, 'otra/1')))
    await assertFails(setDoc(doc(db, 'otra/2'), { x: 2 }))
  })
})
