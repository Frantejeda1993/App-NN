/**
 * Contenido del PDF del presupuesto, sin depender de la librería que lo dibuja
 * (así se prueba). Los motivos de los ajustes son internos: el cliente solo ve
 * una línea neta ("Descuento" o "Ajustes").
 */
import type { QuoteData } from '@/model'
import { formatDateEs } from './dates'
import { formatEuros } from './money'
import { formatPercent } from './percent'
import type { CatalogLike, QuoteTotals } from './quote'

export interface PdfRow {
  description: string
  detail: string
  measures: string
  qty: string
  amount: string
  /** No aceptado (aceptación parcial): se muestra atenuado. */
  excluded: boolean
}

export interface PdfTotal {
  label: string
  amount: string
  strong?: boolean
}

export interface QuotePdfModel {
  workshopLines: string[]
  clientLines: string[]
  title: string
  meta: string[]
  rows: PdfRow[]
  totals: PdfTotal[]
  terms: string
  notes: string
  draft: boolean
}

// Intl usa espacios duros; en el PDF van espacios normales.
const eur = (c: number) => formatEuros(c).replace(/[\u00a0\u202f]/g, ' ')
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function quotePdfModel({
  quote,
  totals,
  catalog,
  workshop,
  client,
  today,
}: {
  quote: QuoteData
  totals: QuoteTotals
  catalog: Pick<CatalogLike, 'materials'>
  workshop: { name: string; taxId: string; address: string; phone: string; email: string }
  client: { name: string; phone: string; email: string; address: string } | null
  today: string
}): QuotePdfModel {
  const contact = (phone: string, email: string) => [phone && `Tel. ${phone}`, email].filter(Boolean).join(' · ')
  const lines = (xs: string[]) => xs.filter((x) => x.trim() !== '')

  const partial = quote.items.some((i) => !i.accepted) || quote.freeLines.some((l) => !l.accepted)
  const showExcluded = partial && quote.status !== 'borrador'

  const rows: PdfRow[] = quote.items.map((i, idx) => {
    const material = i.structure.materialId ? catalog.materials.get(i.structure.materialId)?.name : undefined
    const detail = [
      material,
      i.doors.count > 0 && plural(i.doors.count, 'puerta', 'puertas'),
      i.drawers.count > 0 && plural(i.drawers.count, 'cajón', 'cajones'),
      i.shelves > 0 && plural(i.shelves, 'estante', 'estantes'),
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      description: i.name,
      detail,
      measures: `${i.widthMm} × ${i.heightMm} × ${i.depthMm}`,
      qty: String(i.quantity),
      amount: eur(totals.items[idx]?.totalCents ?? 0),
      excluded: showExcluded && !i.accepted,
    }
  })
  for (const l of quote.freeLines) {
    rows.push({ description: l.description, detail: '', measures: '', qty: '', amount: eur(l.amountCents), excluded: showExcluded && !l.accepted })
  }

  const out: PdfTotal[] = []
  if (totals.adjustmentsCents !== 0) {
    out.push({ label: 'Subtotal', amount: eur(totals.itemsCents + totals.freeLinesCents) })
    out.push({ label: totals.adjustmentsCents < 0 ? 'Descuento' : 'Ajustes', amount: eur(totals.adjustmentsCents) })
  }
  if (totals.vatCents !== 0) out.push({ label: 'IVA', amount: eur(totals.vatCents) })
  out.push({ label: 'Total', amount: eur(totals.totalCents), strong: true })
  if (quote.depositBp > 0) out.push({ label: `Seña (${formatPercent(quote.depositBp)})`, amount: eur(totals.depositCents) })
  if (showExcluded) out.push({ label: 'Total aceptado', amount: eur(totals.acceptedTotalCents), strong: true })

  return {
    workshopLines: lines([workshop.name, workshop.taxId && `NIF ${workshop.taxId}`, workshop.address, contact(workshop.phone, workshop.email)]),
    clientLines: client ? lines([client.name, client.address, contact(client.phone, client.email)]) : [],
    title: `Presupuesto: ${quote.title}`,
    meta: lines([
      quote.version > 1 ? `Versión ${quote.version}` : '',
      `Fecha ${formatDateEs(quote.sentAt ?? today)}`,
      quote.validUntil ? `Válido hasta ${formatDateEs(quote.validUntil)}` : '',
    ]),
    rows,
    totals: out,
    terms: quote.terms.trim(),
    notes: quote.notes.trim(),
    draft: quote.status === 'borrador',
  }
}

/** "Presupuesto - Cliente - Título v2.pdf", sin caracteres que rompan el nombre. */
export function pdfFileName(quote: { title: string; version: number }, clientName: string | null): string {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = ['Presupuesto', clientName && clean(clientName), `${clean(quote.title)}${quote.version > 1 ? ` v${quote.version}` : ''}`]
  return `${parts.filter(Boolean).join(' - ')}.pdf`
}
