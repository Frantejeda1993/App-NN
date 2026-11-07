import { describe, expect, it } from 'vitest'
import {
  boxBalances,
  boxDelta,
  diffMovement,
  filterMovements,
  memberDebts,
  netEffect,
  projectAmount,
  type WalletMovement,
} from './wallet'

const base: WalletMovement = {
  type: 'cobro',
  status: 'pagado',
  amountCents: 10000,
  date: '2026-11-07',
  boxId: 'efectivo',
  toBoxId: null,
  paidBy: null,
  memberEmail: null,
  projectId: 'p1',
  projectSplits: [],
  generalExpenseId: null,
  category: '',
  description: '',
  deleted: false,
}
const m = (over: Partial<WalletMovement>): WalletMovement => ({ ...base, ...over })

describe('efecto en cada caja', () => {
  it('cobro y aporte suman; gasto, retiro y reintegro restan', () => {
    expect(boxDelta(m({ type: 'cobro' }), 'efectivo')).toBe(10000)
    expect(boxDelta(m({ type: 'aporte', memberEmail: 'a@x.com', projectId: null }), 'efectivo')).toBe(10000)
    expect(boxDelta(m({ type: 'gasto_proyecto' }), 'efectivo')).toBe(-10000)
    expect(boxDelta(m({ type: 'retiro', memberEmail: 'a@x.com', projectId: null }), 'efectivo')).toBe(-10000)
    expect(boxDelta(m({ type: 'reintegro', memberEmail: 'a@x.com', projectId: null }), 'efectivo')).toBe(-10000)
  })

  it('una transferencia resta en origen y suma en destino', () => {
    const t = m({ type: 'transferencia', boxId: 'efectivo', toBoxId: 'banco', projectId: null })
    expect(boxDelta(t, 'efectivo')).toBe(-10000)
    expect(boxDelta(t, 'banco')).toBe(10000)
    expect(netEffect(t)).toBe(0)
  })

  it('no mueven caja: gastos pendientes, pagados del bolsillo de un socio y eliminados', () => {
    expect(boxDelta(m({ type: 'gasto_proyecto', status: 'pendiente_pago', boxId: null }), 'efectivo')).toBe(0)
    expect(boxDelta(m({ type: 'gasto_proyecto', boxId: null, paidBy: 'a@x.com' }), 'efectivo')).toBe(0)
    expect(boxDelta(m({ deleted: true }), 'efectivo')).toBe(0)
  })

  it('saldo por caja', () => {
    const list = [
      m({ amountCents: 50000 }),
      m({ type: 'gasto_proyecto', amountCents: 12000 }),
      m({ type: 'transferencia', amountCents: 10000, toBoxId: 'banco', projectId: null }),
      m({ type: 'cobro', amountCents: 999, deleted: true }),
    ]
    expect(boxBalances(list, ['efectivo', 'banco'])).toEqual({ efectivo: 28000, banco: 10000 })
  })
})

describe('deudas del taller con los socios', () => {
  it('un gasto pagado de su bolsillo suma deuda y el reintegro la salda', () => {
    const list = [
      m({ type: 'gasto_proyecto', boxId: null, paidBy: 'nacho@x.com', amountCents: 26368 }),
      m({ type: 'gasto_proyecto', boxId: null, paidBy: 'nacho@x.com', amountCents: 2578 }),
      m({ type: 'reintegro', memberEmail: 'nacho@x.com', projectId: null, amountCents: 20000 }),
      m({ type: 'gasto_proyecto', boxId: null, paidBy: 'nahuel@x.com', amountCents: 4260 }),
      m({ type: 'gasto_proyecto', boxId: null, paidBy: 'nahuel@x.com', amountCents: 999, deleted: true }),
    ]
    expect(memberDebts(list)).toEqual({ 'nacho@x.com': 8946, 'nahuel@x.com': 4260 })
  })
})

describe('importe por proyecto', () => {
  it('cuenta el movimiento completo o su parte del reparto', () => {
    expect(projectAmount(m({ projectId: 'p1' }), 'p1')).toBe(10000)
    expect(projectAmount(m({ projectId: 'p1' }), 'p2')).toBe(0)
    const split = m({
      type: 'gasto_proyecto',
      projectId: null,
      projectSplits: [
        { projectId: 'p1', amountCents: 3000 },
        { projectId: 'p2', amountCents: 7000 },
      ],
    })
    expect(projectAmount(split, 'p2')).toBe(7000)
  })

  it('con proyecto y reparto a la vez (dato viejo), manda el reparto y no se cuenta dos veces', () => {
    const both = m({ projectId: 'p1', projectSplits: [{ projectId: 'p1', amountCents: 4000 }, { projectId: 'p2', amountCents: 6000 }] })
    expect(projectAmount(both, 'p1') + projectAmount(both, 'p2')).toBe(10000)
  })
})

describe('filterMovements', () => {
  const list = [
    m({ type: 'cobro', boxId: 'efectivo', projectId: 'p1', date: '2026-11-01' }),
    m({ type: 'retiro', memberEmail: 'nacho@x.com', projectId: null, boxId: 'banco', date: '2026-11-05' }),
    m({ type: 'gasto_proyecto', boxId: null, paidBy: 'nacho@x.com', projectId: 'p2', date: '2026-11-06' }),
    m({ type: 'cobro', deleted: true }),
  ]

  it('oculta eliminados salvo que se pidan', () => {
    expect(filterMovements(list, {})).toHaveLength(3)
    expect(filterMovements(list, { showDeleted: true })).toHaveLength(4)
  })

  it('filtra por caja, tipo, proyecto, socio y fechas', () => {
    expect(filterMovements(list, { boxId: 'banco' })).toHaveLength(1)
    expect(filterMovements(list, { type: 'cobro' })).toHaveLength(1)
    expect(filterMovements(list, { projectId: 'p2' })).toHaveLength(1)
    expect(filterMovements(list, { member: 'nacho@x.com' })).toHaveLength(2)
    expect(filterMovements(list, { from: '2026-11-05', to: '2026-11-05' })).toHaveLength(1)
  })
})

describe('diffMovement', () => {
  it('lista solo los campos que cambiaron', () => {
    const before = { ...base, version: 1 }
    const after = { ...base, version: 2, amountCents: 12000, description: 'seña' }
    expect(diffMovement(before, after).map((d) => d.field)).toEqual(['amountCents', 'description'])
  })
})
