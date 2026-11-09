/**
 * Ciclo de vida del presupuesto: alta, nuevas versiones, estados y aceptación.
 * Las reglas de Firestore impiden volver a borrador y cambiar la versión.
 */
import type { FurnitureItem, QuoteData, QuoteStatus, TemplateData } from '@/model'
import { addDays, formatDateEs } from './dates'

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  aceptado_parcial: 'Aceptado parcial',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
  finalizado: 'Finalizado',
  archivado: 'Archivado',
}

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  borrador: ['enviado', 'archivado'],
  enviado: ['aceptado', 'aceptado_parcial', 'rechazado', 'vencido', 'archivado'],
  aceptado: ['aceptado_parcial', 'finalizado', 'archivado'],
  aceptado_parcial: ['aceptado', 'finalizado', 'archivado'],
  rechazado: ['enviado', 'archivado'],
  vencido: ['enviado', 'aceptado', 'aceptado_parcial', 'rechazado', 'archivado'],
  finalizado: ['archivado'],
  archivado: ['enviado'],
}

export const nextStatuses = (from: QuoteStatus): QuoteStatus[] => TRANSITIONS[from]
export const canTransition = (from: QuoteStatus, to: QuoteStatus) => TRANSITIONS[from].includes(to)
export const isAcceptedStatus = (s: QuoteStatus) => s === 'aceptado' || s === 'aceptado_parcial' || s === 'finalizado'

/** Id local para muebles / líneas dentro de un presupuesto. */
export const newLocalId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

export function itemFromTemplate(t: TemplateData['item']): FurnitureItem {
  return { ...structuredClone(t), id: newLocalId(), accepted: true }
}

export function newQuoteInput({
  project,
  settings,
  today,
}: {
  project: { id: string; clientId: string | null; title: string } | null
  settings: {
    quoteValidityDays: number
    defaultQuoteTerms: string
    defaultQuoteNotes: string
  }
  today: string
}) {
  return {
    title: project?.title ?? `Presupuesto ${formatDateEs(today)}`,
    projectId: project?.id ?? null,
    clientId: project?.clientId ?? null,
    status: 'borrador' as const,
    validUntil: addDays(today, settings.quoteValidityDays),
    terms: settings.defaultQuoteTerms,
    notes: settings.defaultQuoteNotes,
  }
}

/** Copia para una nueva versión (v+1, borrador, todo marcado como aceptado). */
export function newVersionInput(q: QuoteData & { id: string }, today: string, validityDays: number): QuoteData {
  const { id, ...rest } = structuredClone(q) as QuoteData & {
    id: string
  } & Record<string, unknown>
  for (const k of ['createdBy', 'createdAt', 'updatedBy', 'updatedAt']) delete rest[k]
  return {
    ...(rest as QuoteData),
    version: q.version + 1,
    parentQuoteId: id,
    status: 'borrador',
    sentAt: null,
    acceptedAt: null,
    validUntil: addDays(today, validityDays),
    items: rest.items.map((i) => ({ ...i, accepted: true })),
    freeLines: rest.freeLines.map((l) => ({ ...l, accepted: true })),
  }
}

/** Cambia de estado fijando fechas y, al aceptar entero, marca todo como aceptado. */
export function applyStatus<T extends QuoteData>(q: T, to: QuoteStatus, today: string): T {
  if (!canTransition(q.status, to)) throw new Error(`No se puede pasar de ${STATUS_LABELS[q.status]} a ${STATUS_LABELS[to]}`)
  const next: T = { ...q, status: to }
  if (to === 'enviado') next.sentAt = q.sentAt ?? today
  if (to === 'aceptado' || to === 'aceptado_parcial') next.acceptedAt = q.acceptedAt ?? today
  if (to === 'aceptado') {
    next.items = q.items.map((i) => ({ ...i, accepted: true }))
    next.freeLines = q.freeLines.map((l) => ({ ...l, accepted: true }))
  }
  return next
}

/**
 * Qué cambiar en el proyecto al cambiar el estado de un presupuesto:
 * - enviado: fecha de presupuesto si faltaba.
 * - aceptado / parcial / finalizado: queda como presupuesto aceptado del proyecto.
 * - rechazado / vencido / archivado: si era el aceptado, deja de serlo.
 * Devuelve null si no hay nada que cambiar.
 */
export function projectPatchForQuote(
  project: { acceptedQuoteId: string | null; quotedAt: string | null },
  quote: {
    id: string
    status: QuoteStatus
    sentAt: string | null
    acceptedAt: string | null
  },
): { acceptedQuoteId?: string | null; quotedAt?: string } | null {
  const patch: { acceptedQuoteId?: string | null; quotedAt?: string } = {}
  const sent = quote.sentAt ?? quote.acceptedAt
  if (quote.status !== 'borrador' && !project.quotedAt && sent) patch.quotedAt = sent
  if (isAcceptedStatus(quote.status) && project.acceptedQuoteId !== quote.id) patch.acceptedQuoteId = quote.id
  if (['rechazado', 'vencido', 'archivado'].includes(quote.status) && project.acceptedQuoteId === quote.id) patch.acceptedQuoteId = null
  return Object.keys(patch).length > 0 ? patch : null
}
