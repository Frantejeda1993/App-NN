/**
 * Casos de la revisión de código: cada test reproduce un error encontrado.
 */
import { describe, expect, it } from 'vitest'
import type { QuoteData } from '@/model'
import { QuoteDataSchema } from '@/model'
import { contactAlerts } from './clients'
import { futureIncome, keptAcceptedIds, projectCollection, type QuoteLike } from './dashboard'
import { defaultSharesFor } from './projects'
import { applyStatus, fallbackAcceptedQuote, newVersionInput, projectPatchForQuote } from './quoteLifecycle'
import { projectAmount, type WalletMovement } from './wallet'

const q = (over: Partial<QuoteLike>): QuoteLike => ({
  id: 'q1',
  projectId: 'p',
  status: 'aceptado',
  parentQuoteId: null,
  totals: { totalCents: 1_000_000, acceptedTotalCents: 1_000_000 },
  ...over,
})

describe('panel: nueva versión de un presupuesto aceptado', () => {
  it('un borrador v2 NO borra el presupuesto aceptado v1', () => {
    const quotes = [q({ id: 'v1' }), q({ id: 'v2', status: 'borrador', parentQuoteId: 'v1' })]
    expect(futureIncome(quotes, []).acceptedCents).toBe(1_000_000)
    expect(projectCollection([{ id: 'p' }], quotes, [])[0].budgetCents).toBe(1_000_000)
  })

  it('un v2 rechazado o archivado tampoco', () => {
    for (const status of ['rechazado', 'archivado', 'vencido']) {
      const quotes = [q({ id: 'v1' }), q({ id: 'v2', status, parentQuoteId: 'v1' })]
      expect(futureIncome(quotes, []).acceptedCents).toBe(1_000_000)
    }
  })

  it('un v2 enviado o aceptado sí reemplaza al v1 (no se suman)', () => {
    const v2 = q({ id: 'v2', status: 'aceptado', parentQuoteId: 'v1', totals: { totalCents: 800_000, acceptedTotalCents: 800_000 } })
    expect(futureIncome([q({ id: 'v1' }), v2], []).acceptedCents).toBe(800_000)
  })

  it('un finalizado archivado que el proyecto conserva como aceptado sigue contando', () => {
    const quotes = [q({ id: 'v1', status: 'archivado' })]
    const projects = [{ id: 'p', acceptedQuoteId: 'v1' }]
    expect(projectCollection(projects, quotes, [])[0].budgetCents).toBe(1_000_000)
    expect(futureIncome(quotes, [], new Set(), keptAcceptedIds(projects)).acceptedCents).toBe(1_000_000)
    expect(projectCollection([{ id: 'p', acceptedQuoteId: null }], quotes, [])[0].budgetCents).toBe(0)
  })
})

describe('ciclo de vida del presupuesto', () => {
  const base = QuoteDataSchema.parse({ title: 'Cocina', status: 'aceptado', sentAt: '2026-01-10', acceptedAt: '2026-01-15', rev: 4 })

  it('reabrir (archivado → enviado) pone fechas nuevas y borra la aceptación vieja', () => {
    const archived = applyStatus(base, 'archivado', '2026-02-01')
    const resent = applyStatus(archived, 'enviado', '2026-06-01')
    expect(resent.sentAt).toBe('2026-06-01')
    expect(resent.acceptedAt).toBeNull()
    const accepted = applyStatus(resent, 'aceptado', '2026-07-01')
    expect(accepted.acceptedAt).toBe('2026-07-01')
  })

  it('pasar de aceptado a parcial conserva la fecha de aceptación', () => {
    expect(applyStatus(base, 'aceptado_parcial', '2026-03-01').acceptedAt).toBe('2026-01-15')
  })

  it('archivar un finalizado no desvincula el presupuesto del proyecto', () => {
    const project = { acceptedQuoteId: 'q1', quotedAt: '2026-01-10' }
    const quote = { id: 'q1', status: 'archivado' as const, sentAt: '2026-01-10', acceptedAt: '2026-01-15' }
    expect(projectPatchForQuote(project, quote, { previousStatus: 'finalizado' })).toBeNull()
    expect(projectPatchForQuote(project, quote, { previousStatus: 'aceptado' })).toEqual({ acceptedQuoteId: null })
  })

  it('al dejar de ser aceptado, el proyecto pasa a otro presupuesto aceptado', () => {
    const quotes = [
      { id: 'A', projectId: 'p', status: 'aceptado' as const, acceptedAt: '2026-01-01' },
      { id: 'B', projectId: 'p', status: 'rechazado' as const, acceptedAt: '2026-02-01' },
      { id: 'C', projectId: 'otro', status: 'aceptado' as const, acceptedAt: '2026-03-01' },
    ]
    const fallback = fallbackAcceptedQuote(quotes, 'p', 'B')
    expect(fallback).toBe('A')
    const patch = projectPatchForQuote(
      { acceptedQuoteId: 'B', quotedAt: '2026-01-01' },
      { id: 'B', status: 'rechazado', sentAt: '2026-01-01', acceptedAt: null },
      { fallbackAcceptedId: fallback },
    )
    expect(patch).toEqual({ acceptedQuoteId: 'A' })
  })

  it('una versión nueva arranca con rev 0 y el total aceptado igual al total', () => {
    const v1: QuoteData & { id: string } = {
      ...base,
      id: 'q1',
      totals: { subtotalCents: 1000, totalCents: 1210, acceptedTotalCents: 300 },
    }
    const v2 = newVersionInput(v1, '2026-04-01', 15)
    expect(v2.rev).toBe(0)
    expect(v2.totals.acceptedTotalCents).toBe(1210)
  })
})

describe('otros', () => {
  it('sin socios activos el reparto por defecto es 100 % taller (suma 100 %)', () => {
    expect(defaultSharesFor([{ email: 'x@x.com', active: false }], null)).toEqual({ taller: 10000 })
  })

  it('un cliente nunca contactado genera alerta según su fecha de alta', () => {
    const created = { toDate: () => new Date('2026-01-01T10:00:00Z') }
    const c = { followUp: true, lastContactAt: null, nextContactAt: null, createdAt: created }
    expect(contactAlerts([c], '2026-02-01', 14).stale).toEqual([c])
    expect(contactAlerts([c], '2026-01-10', 14).stale).toEqual([])
  })

  it('el reparto entre proyectos solo cuenta en gastos de proyecto', () => {
    const m = {
      type: 'cobro',
      status: 'pagado',
      amountCents: 100,
      projectId: 'A',
      projectSplits: [{ projectId: 'B', amountCents: 9_999_999 }],
    } as unknown as WalletMovement
    expect(projectAmount(m, 'B')).toBe(0)
    expect(projectAmount(m, 'A')).toBe(100)
  })
})
