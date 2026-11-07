import { describe, expect, it } from 'vitest'
import { allocations, futureIncome, projectCollection, projectProfit, type DashboardInput } from './dashboard'
import { boxBalances } from './wallet'
import type { WalletMovement } from './wallet'

const NACHO = 'nacho@x.com'
const NAHUEL = 'nahuel@x.com'

const mv = (over: Partial<WalletMovement>): WalletMovement => ({
  type: 'cobro',
  status: 'pagado',
  amountCents: 0,
  date: '2026-11-01',
  boxId: 'caja',
  toBoxId: null,
  paidBy: null,
  memberEmail: null,
  projectId: null,
  projectSplits: [],
  generalExpenseId: null,
  category: '',
  description: '',
  deleted: false,
  ...over,
})

/**
 * Caso armado con números del Excel (hojas "Ingresos y Gastos" / "Balances"):
 * Abraham Cocina con seña 6500, gastos de maderas y ferretería, un router que
 * pagó Nacho de su bolsillo, el alquiler del taller y un retiro.
 */
function excelCase(): DashboardInput {
  return {
    members: [NACHO, NAHUEL],
    projects: [
      { id: 'cocina', shares: { [NACHO]: 4000, [NAHUEL]: 4000, taller: 2000 } },
      { id: 'cama', shares: { [NACHO]: 5000, [NAHUEL]: 5000 } },
    ],
    generalExpenses: [{ id: 'alquiler', shares: { [NACHO]: 5000, [NAHUEL]: 5000 } }],
    movements: [
      mv({ type: 'cobro', amountCents: 650000, projectId: 'cocina' }),
      mv({ type: 'gasto_proyecto', amountCents: 121059, projectId: 'cocina' }),
      mv({ type: 'gasto_proyecto', amountCents: 37224, projectId: 'cocina', status: 'pendiente_pago', boxId: null }),
      mv({ type: 'gasto_proyecto', amountCents: 26368, projectId: 'cocina', boxId: null, paidBy: NACHO }),
      mv({ type: 'cobro', amountCents: 118000, projectId: 'cama' }),
      mv({ type: 'gasto_proyecto', amountCents: 150000, projectId: 'cama' }), // pérdida
      mv({ type: 'gasto_general', amountCents: 25000, generalExpenseId: 'alquiler' }),
      mv({ type: 'retiro', amountCents: 100000, memberEmail: NAHUEL }),
      mv({ type: 'aporte', amountCents: 60000, memberEmail: NACHO }),
      mv({ type: 'cobro', amountCents: 99999, projectId: 'cocina', deleted: true }),
    ],
    quotes: [],
  }
}

describe('projectProfit', () => {
  it('cobros − gastos pagados − gastos pendientes; ignora eliminados', () => {
    const input = excelCase()
    expect(projectProfit('cocina', input.movements)).toBe(650000 - 121059 - 37224 - 26368)
    expect(projectProfit('cama', input.movements)).toBe(-32000)
  })
})

describe('allocations', () => {
  it('reparte ganancias, pérdidas y gastos generales según la participación', () => {
    const a = allocations(excelCase())
    const cocina = 650000 - 121059 - 37224 - 26368 // 465349
    // 40 % / 40 % / 20 % de la cocina (465349 → 186140 + 186139 + 93070) y 50/50 de la pérdida de la cama.
    expect(a[NACHO].projects + a[NAHUEL].projects + a.taller.projects).toBe(cocina - 32000)
    expect(a.taller.projects).toBe(93070)
    expect(a[NACHO].general).toBe(12500)
    expect(a[NAHUEL].general).toBe(12500)
    expect(a[NACHO].aportes).toBe(60000)
    expect(a[NAHUEL].retiros).toBe(100000)
    expect(a[NACHO].debt).toBe(26368)
    expect(a[NACHO].total).toBe(a[NACHO].projects - 12500 + 60000 + 26368)
    expect(a[NAHUEL].total).toBe(a[NAHUEL].projects - 12500 - 100000)
  })

  it('cuadra: la suma de todos = dinero en cajas − gastos pendientes de pago', () => {
    const input = excelCase()
    const a = allocations(input)
    const sum = Object.values(a).reduce((s, x) => s + x.total, 0)
    const cash = boxBalances(input.movements, ['caja']).caja
    expect(sum).toBe(cash - 37224)
  })

  it('movimientos de un proyecto que ya no existe van al taller y el cuadre se mantiene', () => {
    const movements = [
      mv({ type: 'cobro', amountCents: 50000, projectId: 'borrado' }),
      mv({ type: 'gasto_proyecto', amountCents: 10000, projectSplits: [{ projectId: 'borrado', amountCents: 10000 }] }),
    ]
    const a = allocations({ members: [NACHO], projects: [], generalExpenses: [], movements, quotes: [] })
    expect(a.taller.projects).toBe(40000)
    const sum = Object.values(a).reduce((s, x) => s + x.total, 0)
    expect(sum).toBe(boxBalances(movements, ['caja']).caja)
  })

  it('un reparto con datos inválidos no rompe: va al taller', () => {
    const a = allocations({
      members: [NACHO],
      projects: [{ id: 'p', shares: { [NACHO]: -5, taller: 10005 } }],
      generalExpenses: [],
      movements: [mv({ type: 'cobro', amountCents: 1000, projectId: 'p' })],
      quotes: [],
    })
    expect(a.taller.projects).toBe(1000)
  })

  it('un gasto general sin reparto conocido va todo al taller', () => {
    const a = allocations({
      members: [NACHO],
      projects: [],
      generalExpenses: [],
      movements: [mv({ type: 'gasto_general', amountCents: 5000, generalExpenseId: 'borrado' })],
      quotes: [],
    })
    expect(a.taller.general).toBe(5000)
    expect(a.taller.total).toBe(-5000)
  })
})

describe('ingresos futuros y cobro por proyecto', () => {
  const quotes = [
    { id: 'q1', projectId: 'cocina', status: 'aceptado' as const, totals: { totalCents: 900000, acceptedTotalCents: 800000 } },
    { id: 'q2', projectId: 'bano', status: 'enviado' as const, totals: { totalCents: 150000, acceptedTotalCents: 150000 } },
    { id: 'q3', projectId: 'placard', status: 'rechazado' as const, totals: { totalCents: 99999, acceptedTotalCents: 0 } },
    { id: 'q4', projectId: 'cocina', status: 'borrador' as const, totals: { totalCents: 1, acceptedTotalCents: 1 } },
  ]
  const movements = [mv({ type: 'cobro', amountCents: 650000, projectId: 'cocina' })]

  it('aceptados = total aceptado − cobrado; enviados aparte', () => {
    expect(futureIncome(quotes, movements)).toEqual({ acceptedCents: 150000, sentCents: 150000 })
  })

  it('nunca da negativo si se cobró de más', () => {
    const overpaid = [mv({ type: 'cobro', amountCents: 900000, projectId: 'cocina' })]
    expect(futureIncome(quotes, overpaid).acceptedCents).toBe(0)
  })

  it('no suma dos veces las versiones de un mismo presupuesto', () => {
    const versions = [
      { id: 'v1', projectId: 'p', status: 'aceptado', totals: { totalCents: 100000, acceptedTotalCents: 100000 } },
      { id: 'v2', projectId: 'p', parentQuoteId: 'v1', status: 'aceptado', totals: { totalCents: 120000, acceptedTotalCents: 120000 } },
      { id: 's1', projectId: 'r', status: 'enviado', totals: { totalCents: 50000, acceptedTotalCents: 0 } },
      { id: 's2', projectId: 'r', parentQuoteId: 's1', status: 'enviado', totals: { totalCents: 60000, acceptedTotalCents: 0 } },
    ]
    expect(futureIncome(versions, [])).toEqual({ acceptedCents: 120000, sentCents: 60000 })
    const rows = projectCollection([{ id: 'p' }, { id: 'r' }], versions, [])
    expect(rows.map((r) => r.budgetCents)).toEqual([120000, 60000])
  })

  it('un proyecto con presupuesto aceptado no suma también lo enviado; excluye cancelados', () => {
    const qs = [
      { id: 'a', projectId: 'p', status: 'aceptado', totals: { totalCents: 100000, acceptedTotalCents: 100000 } },
      { id: 'b', projectId: 'p', status: 'enviado', totals: { totalCents: 30000, acceptedTotalCents: 0 } },
      { id: 'c', projectId: 'cancelado', status: 'aceptado', totals: { totalCents: 300000, acceptedTotalCents: 300000 } },
    ]
    expect(futureIncome(qs, [], new Set(['cancelado']))).toEqual({ acceptedCents: 100000, sentCents: 0 })
  })

  it('un aceptado al que nunca se le calculó el total aceptado usa el total', () => {
    const qs = [{ id: 'a', projectId: 'p', status: 'aceptado', totals: { totalCents: 90000, acceptedTotalCents: 0 } }]
    expect(futureIncome(qs, []).acceptedCents).toBe(90000)
  })

  it('estado de cobro por proyecto', () => {
    const rows = projectCollection([{ id: 'cocina' }, { id: 'bano' }], quotes, movements)
    expect(rows.find((r) => r.projectId === 'cocina')).toEqual({
      projectId: 'cocina',
      budgetCents: 800000,
      collectedCents: 650000,
      pendingCents: 150000,
      percent: 81.25,
      accepted: true,
    })
    expect(rows.find((r) => r.projectId === 'bano')).toMatchObject({ budgetCents: 150000, accepted: false, collectedCents: 0 })
  })
})
