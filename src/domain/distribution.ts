/**
 * Reparto del fondo común del taller entre socios (puro, en céntimos).
 * Pasa dinero de "lo que le corresponde al taller" a la ganancia de cada socio
 * en partes iguales; no mueve dinero de las cajas.
 */
import { allocateByWeights } from './percent'

/**
 * Partes iguales de `totalCents` entre `members` (los céntimos sueltos van a los
 * primeros de la lista, así la suma siempre es exacta).
 */
export function equalShares(totalCents: number, members: string[]): Record<string, number> {
  if (members.length === 0) return {}
  return allocateByWeights(totalCents, Object.fromEntries(members.map((m) => [m, 1])))
}

export const DISTRIBUTION_CATEGORY = 'Reparto del fondo del taller'

/** Un movimiento `reparto` por socio con importe > 0 (sin caja: no mueve dinero). */
export function distributionMovements(input: { date: string; description: string; shares: Record<string, number> }) {
  return Object.entries(input.shares)
    .filter(([, cents]) => cents > 0)
    .map(([memberEmail, amountCents]) => ({
      type: 'reparto' as const,
      status: 'pagado' as const,
      amountCents,
      date: input.date,
      memberEmail,
      boxId: null,
      category: DISTRIBUTION_CATEGORY,
      description: input.description,
    }))
}

/** Error para mostrar, o null si el reparto se puede hacer. */
export function distributionError(totalCents: number | null, fundCents: number, members: string[]): string | null {
  if (totalCents === null || !Number.isInteger(totalCents) || totalCents <= 0) return 'Escribí un importe mayor a 0'
  if (members.length === 0) return 'Elegí al menos un socio'
  if (new Set(members).size !== members.length) return 'Un socio aparece dos veces'
  if (totalCents > fundCents) return 'El importe supera el fondo común del taller'
  if (totalCents < members.length) return `Con ${members.length} socios el mínimo es ${members.length} céntimos`
  return null
}
