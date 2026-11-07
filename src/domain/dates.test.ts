import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatDateEs, relativeDays, todayIso } from './dates'

describe('todayIso', () => {
  it('usa la fecha local, no UTC', () => {
    // 23:30 del 7 de noviembre en hora local
    expect(todayIso(new Date(2026, 10, 7, 23, 30))).toBe('2026-11-07')
    expect(todayIso(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})

describe('daysBetween / addDays', () => {
  it('cuenta días calendario', () => {
    expect(daysBetween('2026-11-01', '2026-11-07')).toBe(6)
    expect(daysBetween('2026-11-07', '2026-11-01')).toBe(-6)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // cambio de hora
  })

  it('suma días', () => {
    expect(addDays('2026-11-28', 5)).toBe('2026-12-03')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('formatDateEs / relativeDays', () => {
  it('formatea en español', () => {
    expect(formatDateEs('2026-11-07')).toBe('07/11/2026')
  })

  it('describe la distancia en días', () => {
    const today = '2026-11-07'
    expect(relativeDays('2026-11-07', today)).toBe('hoy')
    expect(relativeDays('2026-11-06', today)).toBe('ayer')
    expect(relativeDays('2026-11-08', today)).toBe('mañana')
    expect(relativeDays('2026-10-28', today)).toBe('hace 10 días')
    expect(relativeDays('2026-11-10', today)).toBe('en 3 días')
  })
})
