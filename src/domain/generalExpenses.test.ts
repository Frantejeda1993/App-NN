import { describe, expect, it } from 'vitest'
import { dueFixedExpenses, fixedExpenseStatus, monthKey } from './generalExpenses'

const alquiler = { id: 'g1', kind: 'fijo' as const, dayOfMonth: 5, active: true }
const mv = (over: Partial<{ generalExpenseId: string | null; date: string; deleted: boolean; status: 'pagado' | 'pendiente_pago'; type: string }>) => ({
  type: 'gasto_general',
  generalExpenseId: 'g1',
  date: '2026-11-03',
  deleted: false,
  status: 'pagado' as const,
  ...over,
})

describe('monthKey', () => {
  it('extrae año y mes', () => {
    expect(monthKey('2026-11-07')).toBe('2026-11')
  })
})

describe('fixedExpenseStatus', () => {
  it('próximo: todavía no llegó el día y no se registró', () => {
    expect(fixedExpenseStatus(alquiler, [], '2026-11-04')).toBe('proximo')
  })

  it('vence: llegó el día y no se registró este mes', () => {
    expect(fixedExpenseStatus(alquiler, [], '2026-11-05')).toBe('vence')
    expect(fixedExpenseStatus(alquiler, [mv({ date: '2026-10-05' })], '2026-11-20')).toBe('vence')
  })

  it('pagado: hay un pago este mes (aunque sea antes del día)', () => {
    expect(fixedExpenseStatus(alquiler, [mv({ date: '2026-11-01' })], '2026-11-20')).toBe('pagado')
  })

  it('registrado pero pendiente de pago', () => {
    expect(fixedExpenseStatus(alquiler, [mv({ status: 'pendiente_pago' })], '2026-11-20')).toBe('pendiente_pago')
  })

  it('un pago con fecha futura todavía no cuenta como pagado', () => {
    expect(fixedExpenseStatus(alquiler, [mv({ date: '2026-11-25' })], '2026-11-20')).toBe('pendiente_pago')
  })

  it('creado este mes después de su día: no vence este mes', () => {
    const nuevo = { ...alquiler, createdAt: { toDate: () => new Date(2026, 10, 20, 10, 0) } }
    expect(fixedExpenseStatus(nuevo, [], '2026-11-20')).toBe('proximo')
    // El mes siguiente sí vence.
    expect(fixedExpenseStatus(nuevo, [], '2026-12-06')).toBe('vence')
  })

  it('no cuentan los eliminados ni los de otro gasto', () => {
    expect(fixedExpenseStatus(alquiler, [mv({ deleted: true }), mv({ generalExpenseId: 'g2' })], '2026-11-20')).toBe('vence')
  })
})

describe('dueFixedExpenses', () => {
  it('solo fijos activos que vencen', () => {
    const list = [
      alquiler,
      { id: 'g2', kind: 'fijo' as const, dayOfMonth: 25, active: true },
      { id: 'g3', kind: 'fijo' as const, dayOfMonth: 1, active: false },
      { id: 'g4', kind: 'esporadico' as const, dayOfMonth: null, active: true },
    ]
    expect(dueFixedExpenses(list, [], '2026-11-07').map((g) => g.id)).toEqual(['g1'])
  })
})
