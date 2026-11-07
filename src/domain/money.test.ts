import { describe, expect, it } from 'vitest'
import { centsToEuros, eurosToCents, formatEuros, parseEuros, sumCents } from './money'

const nbsp = (s: string) => s.replace(/\s/g, ' ')

describe('eurosToCents / centsToEuros', () => {
  it('convierte sin errores de coma flotante', () => {
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
    expect(eurosToCents(1234.565)).toBe(123457)
    expect(eurosToCents(-12.345)).toBe(-1235)
    expect(centsToEuros(123456)).toBe(1234.56)
  })
})

describe('formatEuros', () => {
  it('formatea en español con símbolo de euro', () => {
    expect(nbsp(formatEuros(123456))).toBe('1234,56 €')
    expect(nbsp(formatEuros(12345678))).toBe('123.456,78 €')
    expect(nbsp(formatEuros(0))).toBe('0,00 €')
    expect(nbsp(formatEuros(-5050))).toBe('-50,50 €')
  })
})

describe('parseEuros', () => {
  it.each([
    ['1234,56', 123456],
    ['1.234,56', 123456],
    ['1.234', 123400],
    ['1234.56', 123456],
    ['1234.5', 123450],
    ['12', 1200],
    ['  7,5 € ', 750],
    ['-50,25', -5025],
    ['1.234.567,8', 123456780],
  ])('"%s" → %i céntimos', (input, cents) => {
    expect(parseEuros(input)).toBe(cents)
  })

  it.each(['', 'abc', '1,2,3', '12,345', '€', '0.500', '00.123', '0.123,45'])('rechaza "%s"', (input) => {
    expect(parseEuros(input)).toBeNull()
  })

  it('"-0" es 0 (no -0)', () => {
    expect(Object.is(parseEuros('-0'), 0)).toBe(true)
  })
})

describe('validación de números', () => {
  it('eurosToCents rechaza NaN e Infinity', () => {
    expect(() => eurosToCents(Number.NaN)).toThrow()
    expect(() => eurosToCents(Number.POSITIVE_INFINITY)).toThrow()
  })
})

describe('sumCents', () => {
  it('suma enteros', () => {
    expect(sumCents([100, 250, -50])).toBe(300)
    expect(sumCents([])).toBe(0)
  })

  it('rechaza valores no enteros', () => {
    expect(() => sumCents([1.5])).toThrow()
  })
})
