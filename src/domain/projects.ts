import { normalizeText } from './clients'
import {
  FULL_SHARE_BP,
  WORKSHOP_SHARE_KEY,
  allocateByWeights,
  formatPercent,
  validateShares,
  type Shares,
} from './percent'

export const STATUS_GROUPS = ['activos', 'finalizados', 'cancelados', 'archivados', 'todos'] as const
export type StatusGroup = (typeof STATUS_GROUPS)[number]

export function statusGroupOf(status: string): Exclude<StatusGroup, 'todos'> {
  if (status === 'finalizado' || status === 'cobrado') return 'finalizados'
  if (status === 'cancelado') return 'cancelados'
  if (status === 'archivado') return 'archivados'
  return 'activos'
}

interface FilterableProject {
  title: string
  clientId: string
  status: string
}

export function filterProjects<T extends FilterableProject>(
  projects: T[],
  group: StatusGroup,
  query: string,
  clientNames: Map<string, string>,
): T[] {
  const q = normalizeText(query)
  return projects.filter((p) => {
    if (group !== 'todos' && statusGroupOf(p.status) !== group) return false
    if (!q) return true
    return normalizeText(`${p.title} ${clientNames.get(p.clientId) ?? ''}`).includes(q)
  })
}

/** La entrega comprometida pasó y el trabajo todavía no se entregó. */
export function isDeliveryOverdue(
  p: { status: string; promisedDeliveryAt: string | null },
  today: string,
): boolean {
  return (p.status === 'pendiente' || p.status === 'en_proceso') && p.promisedDeliveryAt !== null && p.promisedDeliveryAt < today
}

/**
 * Participación con la que arranca un proyecto nuevo: la configurada en Ajustes
 * si es válida y solo menciona socios activos; si no, partes iguales entre los
 * socios activos y 0 % para el taller.
 */
export function defaultSharesFor(
  members: { email: string; active: boolean }[],
  configured: Shares | null,
): Shares {
  const active = members.filter((m) => m.active).map((m) => m.email)
  if (configured && validateShares(configured).ok) {
    const keys = Object.keys(configured)
    if (keys.every((k) => k === WORKSHOP_SHARE_KEY || active.includes(k))) return { ...configured }
  }
  const equal = allocateByWeights(FULL_SHARE_BP, Object.fromEntries(active.map((e) => [e, 1])))
  return { ...equal, [WORKSHOP_SHARE_KEY]: 0 }
}

// ---- Edición de porcentajes en pantalla --------------------------------------

const pctFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, useGrouping: false })

export function bpMapToPercentInputs(shares: Shares): Record<string, string> {
  return Object.fromEntries(Object.entries(shares).map(([k, bp]) => [k, pctFormatter.format(bp / 100)]))
}

export type PercentParse =
  | { ok: true; shares: Shares; totalBp: number; error?: undefined }
  | { ok: false; shares: Shares | null; totalBp: number; error: string }

/** Interpreta lo que escribe el usuario ("33,33", "33.33", vacío = 0). */
export function parsePercentInputs(inputs: Record<string, string>): PercentParse {
  const shares: Shares = {}
  for (const [key, raw] of Object.entries(inputs)) {
    const s = raw.trim().replace(',', '.')
    if (s === '') {
      shares[key] = 0
      continue
    }
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) {
      return { ok: false, shares: null, totalBp: 0, error: 'Cada porcentaje debe ser un número entre 0 y 100, con hasta 2 decimales' }
    }
    shares[key] = Math.round(Number(s) * 100)
  }
  const v = validateShares(shares)
  if (v.ok) return { ok: true, shares, totalBp: v.totalBp }
  if (Object.values(shares).some((x) => x > FULL_SHARE_BP)) {
    return { ok: false, shares, totalBp: v.totalBp, error: 'Ningún porcentaje puede superar 100 %' }
  }
  const diff = FULL_SHARE_BP - v.totalBp
  const error = diff > 0 ? `Faltan ${formatPercent(diff)} para llegar a 100 %` : `Sobran ${formatPercent(-diff)} (suma más de 100 %)`
  return { ok: false, shares, totalBp: v.totalBp, error }
}
