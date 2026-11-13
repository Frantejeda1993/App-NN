import { daysBetween } from './dates'

/**
 * Enlace directo a WhatsApp. Un número español de 9 dígitos (empieza con 6, 7,
 * 8 o 9) se completa con +34; para otros países hay que escribir el prefijo
 * (+54…). Devuelve null si el teléfono no sirve.
 */
export function whatsappLink(phone: string): string | null {
  let digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (/^[6-9]\d{8}$/.test(digits)) digits = `34${digits}`
  digits = digits.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  return `https://wa.me/${digits}`
}

/** Minúsculas, sin tildes y con espacios colapsados (para buscar). */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesSearch(
  client: { name: string; phone: string; source: string; email: string },
  query: string,
): boolean {
  const q = normalizeText(query)
  if (!q) return true
  const haystack = normalizeText([client.name, client.source, client.email].join(' '))
  if (haystack.includes(q)) return true
  // Búsqueda por teléfono solo si lo escrito es un número ("610 60", "+34 610…").
  if (!/^[\d\s+().-]+$/.test(q)) return false
  const qRaw = q.replace(/\s/g, '')
  // Prefijo explícito en lo escrito ("+34…", "0034…") → se quita siempre.
  const qDigits = /^(\+|00)34/.test(qRaw) ? qRaw.replace(/^(\+|00)34/, '').replace(/\D/g, '') : qRaw.replace(/\D/g, '')
  // Teléfono guardado con prefijo español completo → se compara sin él.
  const phoneDigits = client.phone.replace(/\D/g, '').replace(/^(00)?34(?=\d{9}$)/, '')
  return qDigits.length >= 3 && phoneDigits.includes(qDigits)
}

export interface AlertableClient {
  followUp: boolean
  lastContactAt: string | null
  nextContactAt: string | null
  /** Alta del cliente (sirve de referencia si nunca se lo contactó). */
  createdAt?: { toDate(): Date } | null
}

/** Último contacto o, si nunca hubo, la fecha de alta (YYYY-MM-DD). */
function lastTouch(c: AlertableClient): string | null {
  if (c.lastContactAt) return c.lastContactAt
  const created = c.createdAt?.toDate?.()
  return created && !Number.isNaN(created.getTime()) ? created.toISOString().slice(0, 10) : null
}

/**
 * Alertas de seguimiento:
 * - `due`: tienen fecha de próximo contacto hoy o ya pasada.
 * - `stale`: no tienen próximo contacto agendado y llevan más de `alertDays`
 *   días sin contacto (o desde el alta, si nunca se los contactó).
 * Solo cuentan los clientes con seguimiento activo.
 */
export function contactAlerts<T extends AlertableClient>(
  clients: T[],
  today: string,
  alertDays: number,
): { due: T[]; stale: T[] } {
  const active = clients.filter((c) => c.followUp)
  const due = active
    .filter((c) => c.nextContactAt !== null && c.nextContactAt <= today)
    .sort((a, b) => (a.nextContactAt! < b.nextContactAt! ? -1 : 1))
  const stale = active
    .map((c) => ({ c, touch: lastTouch(c) }))
    .filter(({ c, touch }) => c.nextContactAt === null && touch !== null && daysBetween(touch, today) > alertDays)
    .sort((a, b) => (a.touch! < b.touch! ? -1 : 1))
    .map(({ c }) => c)
  return { due, stale }
}
