import { describe, expect, it } from 'vitest'
import {
  bpMapToPercentInputs,
  defaultSharesFor,
  filterProjects,
  isDeliveryOverdue,
  parsePercentInputs,
  statusGroupOf,
} from './projects'

const p = (over: Partial<{ id: string; title: string; clientId: string; status: string; promisedDeliveryAt: string | null }>) => ({
  id: 'p',
  title: 'Cocina',
  clientId: 'c1',
  status: 'pendiente',
  promisedDeliveryAt: null,
  ...over,
})

describe('grupos de estado', () => {
  it('agrupa estados', () => {
    expect(statusGroupOf('en_proceso')).toBe('activos')
    expect(statusGroupOf('entregado')).toBe('activos')
    expect(statusGroupOf('cobrado')).toBe('finalizados')
    expect(statusGroupOf('cancelado')).toBe('cancelados')
    expect(statusGroupOf('archivado')).toBe('archivados')
  })
})

describe('filterProjects', () => {
  const projects = [
    p({ id: '1', title: 'Cocina Raquel', status: 'en_proceso', clientId: 'c1' }),
    p({ id: '2', title: 'Placard', status: 'cobrado', clientId: 'c2' }),
    p({ id: '3', title: 'Baño', status: 'archivado', clientId: 'c1' }),
  ]
  const clientNames = new Map([
    ['c1', 'Raquel Montmeló'],
    ['c2', 'Abraham'],
  ])

  it('filtra por grupo', () => {
    expect(filterProjects(projects, 'activos', '', clientNames).map((x) => x.id)).toEqual(['1'])
    expect(filterProjects(projects, 'todos', '', clientNames)).toHaveLength(3)
  })

  it('busca por título o cliente sin tildes', () => {
    expect(filterProjects(projects, 'todos', 'montmelo', clientNames).map((x) => x.id)).toEqual(['1', '3'])
    expect(filterProjects(projects, 'todos', 'placard', clientNames).map((x) => x.id)).toEqual(['2'])
  })
})

describe('isDeliveryOverdue', () => {
  it('vencida si la fecha pasó y el trabajo no se entregó', () => {
    expect(isDeliveryOverdue(p({ status: 'en_proceso', promisedDeliveryAt: '2026-11-01' }), '2026-11-07')).toBe(true)
    expect(isDeliveryOverdue(p({ status: 'en_proceso', promisedDeliveryAt: '2026-11-07' }), '2026-11-07')).toBe(false)
    expect(isDeliveryOverdue(p({ status: 'entregado', promisedDeliveryAt: '2026-11-01' }), '2026-11-07')).toBe(false)
    expect(isDeliveryOverdue(p({ status: 'pendiente', promisedDeliveryAt: null }), '2026-11-07')).toBe(false)
  })
})

describe('defaultSharesFor', () => {
  const members = [
    { email: 'a@x.com', name: 'A', active: true },
    { email: 'b@x.com', name: 'B', active: true },
    { email: 'c@x.com', name: 'C', active: true },
    { email: 'viejo@x.com', name: 'V', active: false },
  ]

  it('sin configuración: partes iguales entre socios activos y 0 al taller', () => {
    const s = defaultSharesFor(members, null)
    expect(s).toEqual({ 'a@x.com': 3334, 'b@x.com': 3333, 'c@x.com': 3333, taller: 0 })
  })

  it('usa el reparto configurado si es válido', () => {
    const cfg = { 'a@x.com': 4000, 'b@x.com': 4000, taller: 2000 }
    expect(defaultSharesFor(members, cfg)).toEqual(cfg)
  })

  it('ignora el configurado si menciona a un socio inactivo o que ya no existe', () => {
    const cfg = { 'viejo@x.com': 5000, 'a@x.com': 5000 }
    expect(defaultSharesFor(members, cfg)).toEqual({ 'a@x.com': 3334, 'b@x.com': 3333, 'c@x.com': 3333, taller: 0 })
  })
})

describe('edición de porcentajes', () => {
  it('convierte bp a texto editable y vuelta', () => {
    const inputs = bpMapToPercentInputs({ 'a@x.com': 3333, taller: 0 })
    expect(inputs).toEqual({ 'a@x.com': '33,33', taller: '0' })
  })

  it('valida y suma lo que escribe el usuario', () => {
    const ok = parsePercentInputs({ a: '33,33', b: '33.33', taller: '33,34' })
    expect(ok).toEqual({ ok: true, shares: { a: 3333, b: 3333, taller: 3334 }, totalBp: 10000 })

    const short = parsePercentInputs({ a: '50', b: '37,5' })
    expect(short.ok).toBe(false)
    expect(short.totalBp).toBe(8750)
    expect(short.error).toMatch(/faltan 12,5 %/i)

    const over = parsePercentInputs({ a: '60', b: '50' })
    expect(over.error).toMatch(/sobran 10 %/i)
  })

  it('un campo vacío cuenta como 0 y uno inválido da error', () => {
    expect(parsePercentInputs({ a: '100', b: '' })).toMatchObject({ ok: true, shares: { a: 10000, b: 0 } })
    expect(parsePercentInputs({ a: 'abc', b: '100' }).ok).toBe(false)
    expect(parsePercentInputs({ a: '33,333', b: '66,667' }).ok).toBe(false)
    expect(parsePercentInputs({ a: '-5', b: '105' }).ok).toBe(false)
  })
})
