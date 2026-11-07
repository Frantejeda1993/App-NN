/**
 * Fechas de negocio como "YYYY-MM-DD" (sin hora ni zona). "Hoy" se toma en la
 * hora local del dispositivo.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function toUtcMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Días desde `from` hasta `to` (positivo si `to` es posterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(toUtcMs(iso) + days * 86_400_000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function formatDateEs(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function relativeDays(iso: string, today: string = todayIso()): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return 'hoy'
  if (diff === -1) return 'ayer'
  if (diff === 1) return 'mañana'
  return diff < 0 ? `hace ${-diff} días` : `en ${diff} días`
}
