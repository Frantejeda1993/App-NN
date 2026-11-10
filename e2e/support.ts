/**
 * Apoyo para las e2e: datos limpios en el emulador y login de prueba.
 * Solo habla con los emuladores locales (proyecto "demo-"), nunca con Firebase real.
 */
import { expect, type Locator, type Page } from '@playwright/test'

const PROJECT = 'demo-app-nn'
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }

export const DEV = 'dev@taller.test'
export const NAHUEL = 'nahuel@taller.test'

type Json = null | boolean | number | string | Date | Json[] | { [k: string]: Json }

function value(v: Json): unknown {
  if (v === null) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } }
  if (typeof v === 'object') return { mapValue: { fields: fields(v) } }
  return { stringValue: v }
}
const fields = (o: Record<string, Json>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, value(v)]))

async function put(path: string, data: Record<string, Json>) {
  const res = await fetch(`${FIRESTORE}/${path}`, { method: 'PATCH', headers, body: JSON.stringify({ fields: fields(data) }) })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
}

/** Lee un documento con el token "owner" del emulador (saltea reglas). */
export async function readDoc(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${FIRESTORE}/${path}`, { headers })
  if (res.status === 404) return null
  const doc = (await res.json()) as { fields: Record<string, unknown> }
  return doc.fields
}

/** Lista una colección (solo ids y campos crudos). */
export async function listDocs(collection: string): Promise<{ id: string; fields: Record<string, unknown> }[]> {
  const res = await fetch(`${FIRESTORE}/${collection}?pageSize=300`, { headers })
  const body = (await res.json()) as { documents?: { name: string; fields: Record<string, unknown> }[] }
  return (body.documents ?? []).map((d) => ({ id: d.name.split('/').pop()!, fields: d.fields }))
}

/** Borra todo (Firestore y cuentas de Auth) y deja lo mínimo: socios y cajas. */
export async function resetData() {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' })
  const audit = { createdBy: DEV, updatedBy: DEV, createdAt: new Date(), updatedAt: new Date() }
  await put(`members/${DEV}`, { name: 'Dev', active: true })
  await put(`members/${NAHUEL}`, { name: 'Nahuel', active: true })
  await put('boxes/banco', { name: 'Banco', active: true, ...audit })
  await put('boxes/efectivo', { name: 'Efectivo', active: true, ...audit })
}

/** Entra con el atajo de desarrollo del emulador (pide el email en un prompt). */
export async function login(page: Page, email = DEV) {
  page.once('dialog', (d) => d.accept(email))
  await page.goto('/')
  await page.getByRole('button', { name: /entrar con google/i }).click()
}

export async function loginAsMember(page: Page) {
  await login(page)
  await expect(page.getByRole('heading', { name: /hola, dev/i })).toBeVisible()
}

/** Valor de un indicador de la billetera (el párrafo que sigue a su título). */
export const kpi = (page: Page, label: string): Locator => page.getByText(label, { exact: true }).locator('xpath=following-sibling::p[1]')

/** "1.000,00 €" o "1000,00 €" (es-ES no agrupa los números de 4 cifras), con espacio duro. */
export const euros = (amount: string): RegExp => new RegExp('^' + amount.split('.').join('[.]?') + '[\\s\\u00a0]€$')

/** Carga el catálogo y las plantillas del Excel desde la app. */
export async function loadCatalogAndTemplates(page: Page) {
  await page.goto('/#/catalogo')
  await page.getByRole('button', { name: /cargar valores iniciales/i }).click()
  await expect(page.getByRole('list', { name: /materiales/i })).toBeVisible()
  await page.goto('/#/catalogo?tab=plantillas')
  await page.getByRole('button', { name: /cargar plantillas del excel/i }).click()
  await expect(page.getByRole('list', { name: /plantillas/i }).getByText('Bajo cocina 60')).toBeVisible()
}

/** Cliente + proyecto listos (para pruebas que no tratan de crearlos). */
export async function seedProject(id = 'p1', title = 'Cocina Ana') {
  const audit = { createdBy: DEV, updatedBy: DEV, createdAt: new Date(), updatedAt: new Date() }
  await put('clients/c1', {
    name: 'Ana Pérez', phone: '', email: '', address: '', source: '', notes: '', followUp: true,
    lastContactAt: null, nextContactAt: null, ...audit,
  })
  await put(`projects/${id}`, {
    title, clientId: 'c1', summary: '', status: 'pendiente', requestedAt: null, quotedAt: null, promisedDeliveryAt: null,
    deliveredAt: null, shares: { [DEV]: 5000, [NAHUEL]: 5000, taller: 0 }, notes: '', acceptedQuoteId: null,
    estimatedCostCents: null, ...audit,
  })
  return id
}
