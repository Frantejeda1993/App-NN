/**
 * Panel de la billetera (puro, en céntimos).
 *
 * Reglas acordadas:
 * - Ganancia de un proyecto = cobros − gastos pagados − gastos pendientes de pago.
 * - Ganancias Y pérdidas se reparten según la participación del proyecto.
 * - Cada gasto general se reparte según el reparto de ese gasto.
 * - Lo que le corresponde a cada uno = saldo inicial + parte de proyectos − parte
 *   de gastos generales + aportes − retiros + lo que el taller le debe + lo que
 *   recibió del fondo del taller (reparto; al taller le resta).
 * - Control: la suma de todos = dinero en cajas − gastos pendientes de pago.
 */
import { WORKSHOP_SHARE_KEY, allocateByWeights, type Shares } from './percent'
import { memberDebts, projectAmount, type WalletMovement } from './wallet'

/** Saldo inicial de una persona (ver configuración inicial de la billetera). */
export interface OpeningLike {
  projects: number
  general: number
  aportes: number
  retiros: number
  debt: number
}

export interface DashboardInput {
  /** Emails de los socios (aparecen aunque estén en 0). */
  members: string[]
  projects: { id: string; shares: Shares }[]
  generalExpenses: { id: string; shares: Shares }[]
  movements: WalletMovement[]
  quotes: QuoteLike[]
  /** Saldos iniciales por socio (email) y "taller". */
  opening?: Record<string, OpeningLike>
}

export interface QuoteLike {
  id: string
  projectId: string | null
  status: string
  /** Si es una nueva versión de otro presupuesto, el id del anterior. */
  parentQuoteId?: string | null
  totals: { totalCents: number; acceptedTotalCents: number }
}

export interface Allocation {
  projects: number
  general: number
  aportes: number
  retiros: number
  debt: number
  /** Recibido del fondo del taller (+ socio, − taller). */
  reparto: number
  total: number
}

const live = (movements: WalletMovement[]) => movements.filter((m) => !m.deleted)
const isExpense = (m: WalletMovement) => m.type === 'gasto_proyecto' || m.type === 'gasto_general'

export function projectProfit(projectId: string, movements: WalletMovement[]): number {
  let profit = 0
  for (const m of live(movements)) {
    const amt = projectAmount(m, projectId)
    if (!amt) continue
    if (m.type === 'cobro') profit += amt
    else if (m.type === 'gasto_proyecto') profit -= amt
  }
  return profit
}

/** Reparte con los pesos del reparto; si está vacío o tiene datos inválidos, todo al taller. */
function split(amount: number, shares: Shares | undefined): Record<string, number> {
  const values = shares ? Object.values(shares) : []
  const valid = values.some((v) => v > 0) && values.every((v) => Number.isFinite(v) && v >= 0)
  return valid ? allocateByWeights(amount, shares!) : { [WORKSHOP_SHARE_KEY]: amount }
}

/** Ids de proyecto que aparecen en movimientos vivos (incluye partes de repartos). */
function referencedProjects(movements: WalletMovement[]): Set<string> {
  const ids = new Set<string>()
  for (const m of live(movements)) {
    if (m.projectId) ids.add(m.projectId)
    for (const s of m.projectSplits) ids.add(s.projectId)
  }
  return ids
}

const emptyAllocation = (): Allocation => ({ projects: 0, general: 0, aportes: 0, retiros: 0, debt: 0, reparto: 0, total: 0 })

export function allocations(input: DashboardInput): Record<string, Allocation> {
  const out: Record<string, Allocation> = {}
  const get = (k: string) => (out[k] ??= emptyAllocation())
  for (const m of input.members) get(m)
  get(WORKSHOP_SHARE_KEY)

  const opening = input.opening ?? {}
  for (const [k, o] of Object.entries(opening)) {
    const a = get(k)
    a.projects += o.projects
    a.general += o.general
    a.aportes += o.aportes
    a.retiros += o.retiros
  }

  const known = new Map(input.projects.map((p) => [p.id, p.shares]))
  for (const id of new Set([...known.keys(), ...referencedProjects(input.movements)])) {
    const profit = projectProfit(id, input.movements)
    if (profit === 0) continue
    // Un proyecto que ya no existe (o no se pudo leer) va al taller: así nunca se pierde dinero del cuadre.
    for (const [k, v] of Object.entries(split(profit, known.get(id)))) get(k).projects += v
  }

  const expenseShares = new Map(input.generalExpenses.map((g) => [g.id, g.shares]))
  for (const m of live(input.movements)) {
    if (m.type === 'gasto_general') {
      const shares = m.generalExpenseId ? expenseShares.get(m.generalExpenseId) : undefined
      for (const [k, v] of Object.entries(split(m.amountCents, shares))) get(k).general += v
    } else if (m.type === 'aporte' && m.memberEmail) get(m.memberEmail).aportes += m.amountCents
    else if (m.type === 'retiro' && m.memberEmail) get(m.memberEmail).retiros += m.amountCents
    else if (m.type === 'reparto' && m.memberEmail) {
      get(m.memberEmail).reparto += m.amountCents
      get(WORKSHOP_SHARE_KEY).reparto -= m.amountCents
    }
  }

  const openingDebts = Object.fromEntries(Object.entries(opening).map(([k, o]) => [k, o.debt]))
  for (const [k, v] of Object.entries(memberDebts(input.movements, openingDebts))) get(k).debt += v

  for (const a of Object.values(out)) a.total = a.projects - a.general + a.aportes - a.retiros + a.debt + a.reparto
  return out
}

/** Fondo común del taller disponible para repartir (lo que le corresponde al taller, nunca < 0). */
export function workshopFund(alloc: Record<string, Allocation>): number {
  return Math.max(0, alloc[WORKSHOP_SHARE_KEY]?.total ?? 0)
}

/** Gastos (de proyecto o generales) registrados pero todavía no pagados. */
export function pendingExpenses(movements: WalletMovement[]): number {
  return live(movements)
    .filter((m) => isExpense(m) && m.status === 'pendiente_pago')
    .reduce((s, m) => s + m.amountCents, 0)
}

const ACCEPTED = new Set(['aceptado', 'aceptado_parcial', 'finalizado'])
/** Una versión nueva solo reemplaza a la anterior cuando está vigente (enviada o aceptada). */
const SUPERSEDING = new Set([...ACCEPTED, 'enviado'])

function collectedByProject(movements: WalletMovement[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const m of live(movements)) {
    if (m.type === 'cobro' && m.projectId) out.set(m.projectId, (out.get(m.projectId) ?? 0) + m.amountCents)
  }
  return out
}

/** Importe aceptado de un presupuesto (si nunca se recalculó, el total). */
const acceptedAmount = (q: QuoteLike) =>
  q.totals.acceptedTotalCents === 0 && q.status !== 'aceptado_parcial' ? q.totals.totalCents : q.totals.acceptedTotalCents

/**
 * Presupuestos vigentes agrupados por proyecto. Una versión reemplazada (otra
 * vigente la tiene como `parentQuoteId`) no cuenta, para no sumar v1 + v2. Un
 * borrador, rechazado o archivado nuevo NO reemplaza al aceptado anterior.
 */
function quotesByProject(
  quotes: QuoteLike[],
  keptAccepted: Set<string>,
): Map<string | null, { accepted: number; sent: number; hasAccepted: boolean }> {
  const superseded = new Set(
    quotes.filter((q) => q.parentQuoteId && SUPERSEDING.has(q.status)).map((q) => q.parentQuoteId as string),
  )
  const out = new Map<string | null, { accepted: number; sent: number; hasAccepted: boolean }>()
  for (const q of quotes) {
    if (superseded.has(q.id)) continue
    const row = out.get(q.projectId) ?? { accepted: 0, sent: 0, hasAccepted: false }
    // Un finalizado que se archivó sigue siendo el aceptado del proyecto (keptAccepted).
    if (ACCEPTED.has(q.status) || keptAccepted.has(q.id)) {
      row.accepted += acceptedAmount(q)
      row.hasAccepted = true
    } else if (q.status === 'enviado') row.sent += q.totals.totalCents
    out.set(q.projectId, row)
  }
  return out
}

/**
 * Ingresos futuros:
 * - aceptados: por proyecto, total aceptado de sus presupuestos vigentes − lo ya cobrado (nunca < 0).
 * - enviados: presupuestos enviados sin respuesta, solo de proyectos que todavía no tienen uno aceptado.
 * `excludeProjectIds`: proyectos cancelados/archivados (no se espera cobrarlos).
 * Un presupuesto aceptado sin proyecto no se cuenta (no hay dónde registrar el cobro).
 * `keptAccepted`: ids que los proyectos tienen como aceptados (cuenta aunque estén archivados).
 */
export function futureIncome(
  quotes: QuoteLike[],
  movements: WalletMovement[],
  excludeProjectIds: Set<string> = new Set(),
  keptAccepted: Set<string> = new Set(),
): { acceptedCents: number; sentCents: number } {
  const collected = collectedByProject(movements)
  let acceptedCents = 0
  let sentCents = 0
  for (const [pid, row] of quotesByProject(quotes, keptAccepted)) {
    if (pid && excludeProjectIds.has(pid)) continue
    if (row.hasAccepted && pid) acceptedCents += Math.max(0, row.accepted - (collected.get(pid) ?? 0))
    else if (!row.hasAccepted) sentCents += row.sent
  }
  return { acceptedCents, sentCents }
}

export interface CollectionRow {
  projectId: string
  /** Total aceptado vigente, o si no hay aceptado, lo enviado vigente. */
  budgetCents: number
  collectedCents: number
  pendingCents: number
  /** % cobrado sobre el presupuesto (0 si no hay presupuesto). */
  percent: number
  accepted: boolean
}

/** Presupuestos que los proyectos tienen como aceptados. */
export const keptAcceptedIds = (projects: { acceptedQuoteId?: string | null }[]) =>
  new Set(projects.map((p) => p.acceptedQuoteId).filter((id): id is string => !!id))

export function projectCollection(
  projects: { id: string; acceptedQuoteId?: string | null }[],
  quotes: QuoteLike[],
  movements: WalletMovement[],
): CollectionRow[] {
  const collected = collectedByProject(movements)
  const byProject = quotesByProject(quotes, keptAcceptedIds(projects))
  return projects.map((p) => {
    const row = byProject.get(p.id)
    const budgetCents = row ? (row.hasAccepted ? row.accepted : row.sent) : 0
    const collectedCents = collected.get(p.id) ?? 0
    return {
      projectId: p.id,
      budgetCents,
      collectedCents,
      pendingCents: Math.max(0, budgetCents - collectedCents),
      percent: budgetCents > 0 ? Math.round((collectedCents / budgetCents) * 10000) / 100 : 0,
      accepted: row?.hasAccepted ?? false,
    }
  })
}
