import { describe, expect, it } from 'vitest'
import {
  FULL_SHARE_BP,
  allocateByShares,
  allocateByWeights,
  bpToPercent,
  formatPercent,
  percentToBp,
  validateShares,
} from './percent'

describe('percentToBp / bpToPercent', () => {
  it('usa puntos básicos (2 decimales)', () => {
    expect(percentToBp(33.33)).toBe(3333)
    expect(percentToBp(50)).toBe(5000)
    expect(bpToPercent(3334)).toBe(33.34)
    expect(FULL_SHARE_BP).toBe(10000)
  })

  it('redondea sin error de coma flotante y rechaza NaN', () => {
    expect(percentToBp(33.335)).toBe(3334)
    expect(() => percentToBp(Number.NaN)).toThrow()
  })

  it('formatea en español', () => {
    expect(formatPercent(3333)).toBe('33,33 %')
    expect(formatPercent(5000)).toBe('50 %')
  })
})

describe('validateShares', () => {
  it('acepta un reparto que suma 100 % (con ceros)', () => {
    expect(validateShares({ 'a@x.com': 5000, 'b@x.com': 5000, taller: 0 })).toEqual({ ok: true, totalBp: 10000 })
  })

  it('rechaza si no suma 100 %', () => {
    const r = validateShares({ 'a@x.com': 3333, 'b@x.com': 3333, taller: 3333 })
    expect(r.ok).toBe(false)
    expect(r.totalBp).toBe(9999)
  })

  it('rechaza negativos, decimales y mayores a 100 %', () => {
    expect(validateShares({ a: -100, b: 10100 }).ok).toBe(false)
    expect(validateShares({ a: 50.5, b: 9949.5 }).ok).toBe(false)
  })

  it('rechaza un reparto vacío', () => {
    expect(validateShares({}).ok).toBe(false)
  })
})

describe('allocateByWeights', () => {
  it('reparte exacto y el resto va al de mayor fracción', () => {
    const r = allocateByWeights(10000, { a: 1, b: 1, c: 1 })
    expect(r).toEqual({ a: 3334, b: 3333, c: 3333 })
  })

  it('reparte proporcional a pesos arbitrarios (p. ej. m²)', () => {
    const r = allocateByWeights(1000, { x: 2.5, y: 7.5 })
    expect(r).toEqual({ x: 250, y: 750 })
  })

  it('la suma siempre coincide con el total, también en negativo', () => {
    const r = allocateByWeights(-1001, { a: 1, b: 2, c: 3 })
    expect(Object.values(r).reduce((s, v) => s + v, 0)).toBe(-1001)
  })

  it('con todos los pesos en 0 no asigna nada', () => {
    expect(allocateByWeights(500, { a: 0, b: 0 })).toEqual({ a: 0, b: 0 })
  })

  it('rechaza total no entero o pesos negativos', () => {
    expect(() => allocateByWeights(10.5, { a: 1 })).toThrow()
    expect(() => allocateByWeights(10, { a: -1 })).toThrow()
  })
})

describe('allocateByShares', () => {
  it('reparte la ganancia según la participación', () => {
    const r = allocateByShares(100000, { 'nacho@x.com': 4000, 'nahuel@x.com': 4000, taller: 2000 })
    expect(r).toEqual({ 'nacho@x.com': 40000, 'nahuel@x.com': 40000, taller: 20000 })
  })

  it('cierra exacto con 33,33 / 33,33 / 33,34', () => {
    const r = allocateByShares(10001, { a: 3333, b: 3333, c: 3334 })
    expect(r.a + r.b + r.c).toBe(10001)
  })

  it('rechaza un reparto inválido', () => {
    expect(() => allocateByShares(100, { a: 5000 })).toThrow(/100/)
  })
})
