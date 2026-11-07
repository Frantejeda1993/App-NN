// Siembra datos de prueba en el emulador de Firestore (solo desarrollo local).
// Usa el token "owner" del emulador, que saltea las reglas. Nunca apunta a Firebase real.
const BASE = 'http://127.0.0.1:8080/v1/projects/demo-app-nn/databases/(default)/documents'
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }

const DEV_EMAIL = 'dev@taller.test'

function value(v) {
  if (v === null) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } }
  if (typeof v === 'object') return { mapValue: { fields: fields(v) } }
  return { stringValue: String(v) }
}
const fields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, value(v)]))

async function put(path, data) {
  const res = await fetch(`${BASE}/${path}`, { method: 'PATCH', headers, body: JSON.stringify({ fields: fields(data) }) })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
}

const pad = (n) => String(n).padStart(2, '0')
const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const audit = { createdBy: DEV_EMAIL, updatedBy: DEV_EMAIL, createdAt: new Date(), updatedAt: new Date() }
const client = (name, extra) => ({
  name, phone: '', email: '', address: '', source: '', notes: '', followUp: true,
  lastContactAt: null, nextContactAt: null, ...extra, ...audit,
})

await put(`members/${DEV_EMAIL}`, { name: 'Dev', active: true })
await put('members/nahuel@taller.test', { name: 'Nahuel', active: true })
await put('clients/demo-raquel', client('Raquel Montmeló', { phone: '610602069', source: 'Wallapop', lastContactAt: iso(-20) }))
await put('clients/demo-james', client('James', { phone: '611222333', source: 'Wallapop', lastContactAt: iso(-3), nextContactAt: iso(-1) }))
await put('clients/demo-abraham', client('Abraham', { source: 'Recomendación', lastContactAt: iso(-2), nextContactAt: iso(5) }))
await put('clients/demo-marina', client('Marina', { followUp: false, lastContactAt: iso(-60) }))
await put('clients/demo-james/contacts/k1', {
  date: iso(-3), channel: 'whatsapp', note: 'Le pasé el presupuesto de la cocina', projectId: null,
  ...audit, createdBy: 'nahuel@taller.test',
})

console.log(`Emulador sembrado. Entrá con Google → "Add new account" → ${DEV_EMAIL}`)
