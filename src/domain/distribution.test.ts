import { describe, expect, it } from 'vitest'
import { allocations, workshopFund, type QuoteLike } from './dashboard'
import { distributionError, equalShares } from './distribution'
import type { WalletMovement } from './wallet'
import { boxBalances, memberDebts, netEffect } from './wallet'

const A = 'a@x.com'
const B = 'b@x.com'
const C = 'c@x.com'

const mv = (over: Partial<WalletMovement>): WalletMovement => ({
  type: 'cobro',
  status: 'pagado',
  amountCents: 0,
  date: '2026-01-01',
  boxId: null,
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

const noQuotes: QuoteLike[] = []

describe('equalShares', () => {
  it('reparte en partes iguales y la suma es exacta', () => {
    expect(equalShares(10000, [A, B])).toEqual({ [A]: 5000, [B]: 5000 })
    const three = equalShares(10000, [A, B, C])
    expect(Object.values(three).reduce((s, v) => s + v, 0)).toBe(10000)
    expect(three).toEqual({ [A]: 3334, [B]: 3333, [C]: 3333 })
  })

  it('sin socios no reparte nada', () => {
    expect(equalShares(1000, [])).toEqual({})
  })
})

describe('distributionError', () => {
  it('valida importe, socios y fondo disponible', () => {
    expect(distributionError(null, 1000, [A])).toMatch(/importe/)
    expect(distributionError(0, 1000, [A])).toMatch(/importe/)
    expect(distributionError(500, 1000, [])).toMatch(/socio/)
    expect(distributionError(1500, 1000, [A, B])).toMatch(/supera/)
    expect(distributionError(1, 1000, [A, B])).toMatch(/mínimo/)
    expect(distributionError(1000, 1000, [A, B])).toBeNull()
  })
})

describe('reparto del fondo del taller', () => {
  // Proyecto 100 % taller con 900 € de ganancia en la caja.
  const base = [mv({ type: 'cobro', amountCents: 90000, projectId: 'p', boxId: 'caja' })]
  const projects = [{ id: 'p', shares: { taller: 10000 } }]

  it('pasa del taller a los socios sin mover las cajas y el cuadre se mantiene', () => {
    const shares = equalShares(60000, [A, B, C])
    const movements = [...base, ...Object.entries(shares).map(([m, c]) => mv({ type: 'reparto', memberEmail: m, amountCents: c }))]
    const alloc = allocations({ members: [A, B, C], projects, generalExpenses: [], movements, quotes: noQuotes })

    expect(alloc.taller.total).toBe(30000)
    expect(alloc[A].reparto).toBe(20000)
    expect(alloc[A].total).toBe(20000)
    expect(workshopFund(alloc)).toBe(30000)

    const cash = Object.values(boxBalances(movements, ['caja'])).reduce((s, v) => s + v, 0)
    expect(cash).toBe(90000)
    const sum = Object.values(alloc).reduce((s, a) => s + a.total, 0)
    expect(sum).toBe(cash)
    expect(movements.slice(1).every((m) => netEffect(m) === 0)).toBe(true)
  })

  it('un reparto eliminado no cuenta', () => {
    const movements = [...base, mv({ type: 'reparto', memberEmail: A, amountCents: 1000, deleted: true })]
    const alloc = allocations({ members: [A], projects, generalExpenses: [], movements, quotes: noQuotes })
    expect(alloc.taller.total).toBe(90000)
    expect(alloc[A].total).toBe(0)
  })

  it('el fondo del taller nunca es negativo', () => {
    const alloc = allocations({ members: [A], projects: [], generalExpenses: [], movements: [], quotes: noQuotes })
    expect(workshopFund({ ...alloc, taller: { ...alloc.taller, total: -500 } })).toBe(0)
  })
})

describe('configuración inicial (saldos de arranque)', () => {
  it('suma los saldos iniciales a cajas, deudas y a lo que le corresponde a cada uno', () => {
    expect(boxBalances([mv({ type: 'cobro', amountCents: 100, boxId: 'caja', projectId: 'p' })], ['caja', 'banco'], { caja: 5000 })).toEqual({
      caja: 5100,
      banco: 0,
    })
    expect(memberDebts([mv({ type: 'reintegro', memberEmail: A, amountCents: 300, boxId: 'caja' })], { [A]: 1000 })).toEqual({ [A]: 700 })

    const alloc = allocations({
      members: [A, B],
      projects: [],
      generalExpenses: [],
      movements: [],
      quotes: noQuotes,
      opening: {
        [A]: { projects: 10000, general: 2000, aportes: 500, retiros: 1000, debt: 300 },
        taller: { projects: 4000, general: 0, aportes: 0, retiros: 0, debt: 0 },
      },
    })
    expect(alloc[A]).toMatchObject({ projects: 10000, general: 2000, aportes: 500, retiros: 1000, debt: 300 })
    expect(alloc[A].total).toBe(10000 - 2000 + 500 - 1000 + 300)
    expect(alloc.taller.total).toBe(4000)
    expect(alloc[B].total).toBe(0)
  })
})
