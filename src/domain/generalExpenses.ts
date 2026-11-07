/**
 * Estado mensual de los gastos generales fijos (alquiler, luz…), calculado a
 * partir de los movimientos de tipo `gasto_general` registrados.
 */

import { todayIso } from './dates'

export const monthKey = (iso: string) => iso.slice(0, 7)

export type FixedStatus = 'pagado' | 'pendiente_pago' | 'vence' | 'proximo'

interface FixedExpenseLike {
  id: string
  kind: 'fijo' | 'esporadico'
  dayOfMonth: number | null
  active: boolean
  /** Alta del gasto: si se creó este mes después de su día, este mes no venció. */
  createdAt?: { toDate(): Date } | null
}

interface MovementLike {
  type: string
  generalExpenseId: string | null
  date: string
  deleted: boolean
  status: 'pagado' | 'pendiente_pago'
}

/**
 * El mes de un pago lo decide la FECHA del movimiento (un alquiler de noviembre
 * pagado el 2 de diciembre cuenta para diciembre).
 * - `pagado`: hay un pago de este mes con fecha hasta hoy.
 * - `pendiente_pago`: se registró este mes pero todavía no se pagó (o tiene fecha futura).
 * - `vence`: llegó el día del mes y no hay nada registrado.
 * - `proximo`: todavía no llegó el día (o el gasto se creó este mes después de su día).
 */
export function fixedExpenseStatus(expense: FixedExpenseLike, movements: MovementLike[], today: string): FixedStatus {
  const month = monthKey(today)
  const thisMonth = movements.filter(
    (m) => !m.deleted && m.type === 'gasto_general' && m.generalExpenseId === expense.id && monthKey(m.date) === month,
  )
  if (thisMonth.some((m) => m.status === 'pagado' && m.date <= today)) return 'pagado'
  if (thisMonth.length > 0) return 'pendiente_pago'
  if (expense.dayOfMonth === null) return 'proximo'
  const created = expense.createdAt?.toDate ? todayIso(expense.createdAt.toDate()) : null
  if (created && monthKey(created) === month && Number(created.slice(8, 10)) > expense.dayOfMonth) return 'proximo'
  return Number(today.slice(8, 10)) >= expense.dayOfMonth ? 'vence' : 'proximo'
}

/** Gastos fijos activos cuyo pago de este mes ya debería estar registrado. */
export function dueFixedExpenses<T extends FixedExpenseLike>(expenses: T[], movements: MovementLike[], today: string): T[] {
  return expenses.filter((g) => g.active && g.kind === 'fijo' && fixedExpenseStatus(g, movements, today) === 'vence')
}
