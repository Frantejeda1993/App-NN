/**
 * Cálculos de la billetera sobre movimientos (puros, en céntimos).
 * Los movimientos eliminados (baja lógica) no cuentan para nada.
 */

export interface WalletMovement {
  type: 'cobro' | 'gasto_proyecto' | 'gasto_general' | 'retiro' | 'aporte' | 'transferencia' | 'reintegro'
  status: 'pagado' | 'pendiente_pago'
  amountCents: number
  date: string
  boxId: string | null
  toBoxId: string | null
  paidBy: string | null
  memberEmail: string | null
  projectId: string | null
  projectSplits: { projectId: string; amountCents: number }[]
  generalExpenseId: string | null
  category: string
  description: string
  deleted: boolean
}

const isExpense = (m: WalletMovement) => m.type === 'gasto_proyecto' || m.type === 'gasto_general'

/** Cuánto cambia el saldo de `boxId` por este movimiento. */
export function boxDelta(m: WalletMovement, boxId: string): number {
  if (m.deleted || m.status !== 'pagado') return 0
  if (m.type === 'transferencia') {
    if (m.boxId === boxId) return -m.amountCents
    if (m.toBoxId === boxId) return m.amountCents
    return 0
  }
  if (m.boxId !== boxId) return 0
  return m.type === 'cobro' || m.type === 'aporte' ? m.amountCents : -m.amountCents
}

/**
 * Efecto sobre el dinero total del taller (todas las cajas): + entra, − sale,
 * 0 transferencias. Un gasto pagado del bolsillo de un socio no sale de las
 * cajas (queda como deuda con el socio).
 */
export function netEffect(m: WalletMovement): number {
  if (m.deleted || m.status !== 'pagado' || m.type === 'transferencia') return 0
  if (isExpense(m) && m.boxId === null) return 0
  return m.type === 'cobro' || m.type === 'aporte' ? m.amountCents : -m.amountCents
}

/** Signo para mostrar en listas: + ingreso, − egreso, 0 neutro. */
export function displaySign(m: WalletMovement): 1 | -1 | 0 {
  if (m.type === 'transferencia') return 0
  return m.type === 'cobro' || m.type === 'aporte' ? 1 : -1
}

export function boxBalances(movements: WalletMovement[], boxIds: string[]): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(boxIds.map((id) => [id, 0]))
  for (const m of movements) {
    for (const id of boxIds) out[id] += boxDelta(m, id)
  }
  return out
}

/** Lo que el taller le debe a cada socio (gastos que pagó de su bolsillo − reintegros). */
export function memberDebts(movements: WalletMovement[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of movements) {
    if (m.deleted) continue
    if (isExpense(m) && m.status === 'pagado' && m.paidBy) out[m.paidBy] = (out[m.paidBy] ?? 0) + m.amountCents
    if (m.type === 'reintegro' && m.memberEmail) out[m.memberEmail] = (out[m.memberEmail] ?? 0) - m.amountCents
  }
  return out
}

/** Parte de un movimiento que corresponde a un proyecto (completo o su parte del reparto). */
export function projectAmount(m: WalletMovement, projectId: string): number {
  // Si hay reparto, manda el reparto (evita contar dos veces un dato viejo con ambos).
  if (m.projectSplits.length > 0) return m.projectSplits.find((s) => s.projectId === projectId)?.amountCents ?? 0
  return m.projectId === projectId ? m.amountCents : 0
}

export function touchesProject(m: WalletMovement, projectId: string): boolean {
  return projectAmount(m, projectId) > 0
}

export interface MovementFilters {
  boxId?: string
  type?: WalletMovement['type']
  projectId?: string
  member?: string
  from?: string
  to?: string
  showDeleted?: boolean
}

export function filterMovements<T extends WalletMovement>(list: T[], f: MovementFilters): T[] {
  return list.filter((m) => {
    if (m.deleted && !f.showDeleted) return false
    if (f.boxId && m.boxId !== f.boxId && m.toBoxId !== f.boxId) return false
    if (f.type && m.type !== f.type) return false
    if (f.projectId && !touchesProject(m, f.projectId)) return false
    if (f.member && m.paidBy !== f.member && m.memberEmail !== f.member) return false
    if (f.from && m.date < f.from) return false
    if (f.to && m.date > f.to) return false
    return true
  })
}

const DIFF_FIELDS: (keyof WalletMovement)[] = [
  'type',
  'status',
  'amountCents',
  'date',
  'boxId',
  'toBoxId',
  'paidBy',
  'memberEmail',
  'projectId',
  'projectSplits',
  'generalExpenseId',
  'category',
  'description',
  'deleted',
]

/** Campos que cambiaron entre dos versiones (para el historial). */
export function diffMovement(
  before: Partial<WalletMovement> & Record<string, unknown>,
  after: Partial<WalletMovement> & Record<string, unknown>,
): { field: keyof WalletMovement; before: unknown; after: unknown }[] {
  // null y [] valen lo mismo (documentos viejos sin el campo).
  const norm = (v: unknown) => JSON.stringify(Array.isArray(v) && v.length === 0 ? null : (v ?? null))
  return DIFF_FIELDS.filter((f) => norm(before[f]) !== norm(after[f])).map((f) => ({
    field: f,
    before: before[f],
    after: after[f],
  }))
}
