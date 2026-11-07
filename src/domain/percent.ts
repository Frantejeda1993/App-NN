/**
 * Porcentajes en puntos básicos (bp): 10000 bp = 100 %, 3333 bp = 33,33 %.
 * Repartos de dinero exactos: la suma de las partes siempre es el total.
 */
import { scaleRound } from './money'

export const FULL_SHARE_BP = 10000

/** Clave reservada del fondo del taller dentro de un reparto. */
export const WORKSHOP_SHARE_KEY = 'taller'

export type Shares = Record<string, number>

export function percentToBp(percent: number): number {
  return scaleRound(percent, 100)
}

export function bpToPercent(bp: number): number {
  return bp / 100
}

const pctFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

export function formatPercent(bp: number): string {
  return `${pctFormatter.format(bp / 100)} %`
}

export interface SharesValidation {
  ok: boolean
  totalBp: number
  error?: string
}

/** Un reparto es válido si son enteros entre 0 y 100 % y suman exactamente 100 %. */
export function validateShares(shares: Shares): SharesValidation {
  const values = Object.values(shares)
  const totalBp = values.reduce((s, v) => s + v, 0)
  if (values.length === 0) return { ok: false, totalBp, error: 'El reparto está vacío' }
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v > FULL_SHARE_BP)) {
    return { ok: false, totalBp, error: 'Cada porcentaje debe estar entre 0 y 100 con hasta 2 decimales' }
  }
  if (totalBp !== FULL_SHARE_BP) {
    return { ok: false, totalBp, error: `Los porcentajes suman ${formatPercent(totalBp)} y deben sumar 100 %` }
  }
  return { ok: true, totalBp }
}

/**
 * Reparte `totalCents` en proporción a `weights` (método del mayor resto).
 * Sirve para participación, gastos generales y prorrateo por m².
 */
export function allocateByWeights<K extends string>(totalCents: number, weights: Record<K, number>): Record<K, number> {
  if (!Number.isInteger(totalCents)) throw new Error(`Importe no entero en céntimos: ${totalCents}`)
  const keys = Object.keys(weights) as K[]
  if (keys.some((k) => !(weights[k] >= 0) || !Number.isFinite(weights[k]))) {
    throw new Error('Los pesos deben ser números ≥ 0')
  }

  const result = {} as Record<K, number>
  const sumW = keys.reduce((s, k) => s + weights[k], 0)
  if (sumW === 0) {
    for (const k of keys) result[k] = 0
    return result
  }

  const sign = totalCents < 0 ? -1 : 1
  const abs = Math.abs(totalCents)
  // Con pesos enteros (bp) se usa aritmética entera exacta; con pesos decimales
  // (m²) la fracción en coma flotante.
  const integerWeights = keys.every((k) => Number.isInteger(weights[k])) && Number.isSafeInteger(abs * sumW)
  const raw = keys.map((k, i) => {
    if (integerWeights) {
      const num = abs * weights[k]
      return { k, i, floor: Math.floor(num / sumW), frac: (num % sumW) / sumW }
    }
    const exact = (abs * weights[k]) / sumW
    return { k, i, floor: Math.floor(exact), frac: exact - Math.floor(exact) }
  })
  let assigned = 0
  for (const r of raw) {
    result[r.k] = r.floor
    assigned += r.floor
  }
  // El resto (céntimos sueltos) va a quienes tienen mayor fracción; empate → orden original.
  const byRemainder = [...raw].sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let n = 0; n < abs - assigned; n++) result[byRemainder[n].k] += 1

  if (sign < 0) for (const k of keys) result[k] = result[k] === 0 ? 0 : -result[k]
  return result
}

/** Reparte un importe según un reparto en bp que debe sumar 100 %. */
export function allocateByShares<K extends string>(totalCents: number, shares: Record<K, number>): Record<K, number> {
  const v = validateShares(shares)
  if (!v.ok) throw new Error(v.error)
  return allocateByWeights(totalCents, shares)
}
