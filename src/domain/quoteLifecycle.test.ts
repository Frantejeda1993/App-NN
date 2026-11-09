import { describe, expect, it } from 'vitest'
import { QuoteDataSchema } from '@/model'
import { applyStatus, canTransition, newQuoteInput, newVersionInput, nextStatuses, projectPatchForQuote } from './quoteLifecycle'

const base = () =>
  QuoteDataSchema.parse({
    title: 'Cocina',
    items: [
      {
        id: 'i1',
        name: 'Bajo',
        widthMm: 600,
        heightMm: 720,
        depthMm: 560,
        accepted: false,
      },
    ],
    freeLines: [{ id: 'l1', description: 'Flete', amountCents: 5000, accepted: false }],
  })

describe('newQuoteInput', () => {
  it('toma proyecto, cliente, validez, condiciones y notas por defecto', () => {
    const q = newQuoteInput({
      project: { id: 'p1', clientId: 'c1', title: 'Cocina Pérez' },
      settings: {
        quoteValidityDays: 15,
        defaultQuoteTerms: '50 % al aceptar',
        defaultQuoteNotes: 'Gracias',
      },
      today: '2026-11-07',
    })
    expect(q).toMatchObject({
      title: 'Cocina Pérez',
      projectId: 'p1',
      clientId: 'c1',
      validUntil: '2026-11-22',
      terms: '50 % al aceptar',
      notes: 'Gracias',
      status: 'borrador',
    })
    expect(QuoteDataSchema.safeParse(q).success).toBe(true)
  })

  it('sin proyecto queda suelto y con título genérico', () => {
    const q = newQuoteInput({
      project: null,
      settings: {
        quoteValidityDays: 30,
        defaultQuoteTerms: '',
        defaultQuoteNotes: '',
      },
      today: '2026-11-07',
    })
    expect(q.projectId).toBeNull()
    expect(q.title).toBe('Presupuesto 07/11/2026')
  })
})

describe('newVersionInput', () => {
  it('copia todo con versión +1, vuelve a borrador y limpia fechas', () => {
    const v = newVersionInput(
      {
        ...base(),
        id: 'q1',
        status: 'enviado',
        version: 2,
        sentAt: '2026-11-01',
      },
      '2026-11-07',
      15,
    )
    expect(v.version).toBe(3)
    expect(v.parentQuoteId).toBe('q1')
    expect(v.status).toBe('borrador')
    expect(v.sentAt).toBeNull()
    expect(v.acceptedAt).toBeNull()
    expect(v.validUntil).toBe('2026-11-22')
    expect(v.items[0].accepted).toBe(true)
    expect(v.freeLines[0].accepted).toBe(true)
    expect(v).not.toHaveProperty('id')
  })
})

describe('transiciones de estado', () => {
  it('borrador solo puede enviarse (o archivarse)', () => {
    expect(nextStatuses('borrador')).toEqual(['enviado', 'archivado'])
  })

  it('nunca se vuelve a borrador', () => {
    for (const s of ['enviado', 'aceptado', 'rechazado', 'vencido', 'finalizado', 'archivado'] as const) {
      expect(canTransition(s, 'borrador')).toBe(false)
    }
  })

  it('enviado puede aceptarse, rechazarse o vencer', () => {
    expect(nextStatuses('enviado')).toEqual(['aceptado', 'aceptado_parcial', 'rechazado', 'vencido', 'archivado'])
  })

  it('aceptado puede finalizarse; archivado puede reabrirse como enviado', () => {
    expect(canTransition('aceptado', 'finalizado')).toBe(true)
    expect(canTransition('archivado', 'enviado')).toBe(true)
  })
})

describe('applyStatus', () => {
  it('al enviar fija la fecha de envío', () => {
    const q = applyStatus(base(), 'enviado', '2026-11-07')
    expect(q.status).toBe('enviado')
    expect(q.sentAt).toBe('2026-11-07')
  })

  it('aceptar entero marca todos los muebles y líneas', () => {
    const q = applyStatus({ ...base(), status: 'enviado' }, 'aceptado', '2026-11-08')
    expect(q.acceptedAt).toBe('2026-11-08')
    expect(q.items.every((i) => i.accepted)).toBe(true)
    expect(q.freeLines.every((l) => l.accepted)).toBe(true)
  })

  it('aceptar parcial respeta lo marcado', () => {
    const q = applyStatus({ ...base(), status: 'enviado' }, 'aceptado_parcial', '2026-11-08')
    expect(q.items[0].accepted).toBe(false)
    expect(q.acceptedAt).toBe('2026-11-08')
  })

  it('rechaza transiciones inválidas', () => {
    expect(() => applyStatus({ ...base(), status: 'enviado' }, 'borrador', '2026-11-08')).toThrow()
  })
})

describe('projectPatchForQuote', () => {
  const q = (status: Parameters<typeof projectPatchForQuote>[1]['status'], extra = {}) => ({
    id: 'q1',
    status,
    sentAt: '2026-11-07',
    acceptedAt: null,
    ...extra,
  })

  it('al enviar completa la fecha de presupuesto si faltaba', () => {
    expect(projectPatchForQuote({ acceptedQuoteId: null, quotedAt: null }, q('enviado'))).toEqual({ quotedAt: '2026-11-07' })
    expect(projectPatchForQuote({ acceptedQuoteId: null, quotedAt: '2026-10-01' }, q('enviado'))).toBeNull()
  })

  it('al aceptar queda como presupuesto aceptado del proyecto', () => {
    expect(projectPatchForQuote({ acceptedQuoteId: 'viejo', quotedAt: '2026-10-01' }, q('aceptado_parcial'))).toEqual({
      acceptedQuoteId: 'q1',
    })
  })

  it('al rechazar o archivar el aceptado, el proyecto queda sin aceptado', () => {
    expect(projectPatchForQuote({ acceptedQuoteId: 'q1', quotedAt: '2026-10-01' }, q('archivado'))).toEqual({ acceptedQuoteId: null })
    expect(projectPatchForQuote({ acceptedQuoteId: 'otro', quotedAt: '2026-10-01' }, q('rechazado'))).toBeNull()
  })
})
