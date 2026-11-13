import { describe, expect, it } from 'vitest'
import { QuoteDataSchema } from '@/model'
import { computeQuote, type CatalogLike, type RatesLike } from './quote'
import { pdfFileName, quotePdfModel } from './quotePdf'

const rates: RatesLike = {
  cutAndEdgePerM2Cents: 0,
  laborPerM2Cents: 0,
  laborPerDoorCents: 0,
  laborPerDrawerCents: 0,
  laborPerHardwareUnitCents: 0,
  materialsMultiplier: 0,
}
const catalog: CatalogLike = {
  materials: new Map([['m', { name: 'Melamina blanca', sheetWidthMm: 2000, sheetHeightMm: 1000, sheetPriceCents: 4000, wasteFactor: 1 }]]),
  hardware: new Map(),
  edgeBanding: new Map(),
}

const quote = (over: Record<string, unknown> = {}) =>
  QuoteDataSchema.parse({
    title: 'Cocina',
    version: 2,
    status: 'enviado',
    sentAt: '2026-11-08',
    validUntil: '2026-11-23',
    items: [
      { id: 'a', name: 'Bajo 60', quantity: 2, widthMm: 600, heightMm: 800, depthMm: 580, shelves: 1, doors: { count: 2 }, drawers: { count: 0 }, structure: { materialId: 'm' }, finalPriceCents: 30000 },
      { id: 'b', name: 'Cajonera', widthMm: 600, heightMm: 800, depthMm: 580, drawers: { count: 3 }, finalPriceCents: 25000, accepted: false },
    ],
    freeLines: [{ id: 'l', description: 'Colocación', amountCents: 10000 }],
    adjustments: [
      { id: 'x', reason: 'Cliente frecuente', amountCents: -6000 },
      { id: 'y', reason: 'Diseño', amountCents: 1000 },
    ],
    depositBp: 5000,
    terms: '50 % al aceptar',
    notes: 'No incluye electrodomésticos',
    ...over,
  })

const workshop = { name: 'Taller NN', taxId: 'B123', address: 'Calle 1', phone: '600', email: 'a@b.es' }
const client = { name: 'Ana Pérez', phone: '611', email: '', address: '' }

const model = (q = quote()) => quotePdfModel({ quote: q, totals: computeQuote(q, catalog, rates), catalog, workshop, client, today: '2026-11-10' })

describe('quotePdfModel', () => {
  it('encabezado con taller, cliente, versión y fechas', () => {
    const m = model()
    expect(m.workshopLines).toEqual(['Taller NN', 'NIF B123', 'Calle 1', 'Tel. 600 · a@b.es'])
    expect(m.clientLines).toEqual(['Ana Pérez', 'Tel. 611'])
    expect(m.title).toBe('Presupuesto: Cocina')
    expect(m.meta).toEqual(['Versión 2', 'Fecha 08/11/2026', 'Válido hasta 23/11/2026'])
    expect(m.draft).toBe(false)
  })

  it('muebles con medidas, detalle, cantidad e importe; líneas libres', () => {
    const m = model()
    expect(m.rows[0]).toEqual({ description: 'Bajo 60', detail: 'Melamina blanca · 2 puertas · 1 estante', measures: '600 × 800 × 580', qty: '2', amount: '300,00 €', excluded: false })
    expect(m.rows[1]).toMatchObject({ description: 'Cajonera', detail: '3 cajones', excluded: true })
    expect(m.rows[2]).toEqual({ description: 'Colocación', detail: '', measures: '', qty: '', amount: '100,00 €', excluded: false })
  })

  it('los ajustes van en una sola línea neta, sin los motivos internos', () => {
    const m = model()
    expect(m.totals).toContainEqual({ label: 'Descuento', amount: '-50,00 €' })
    expect(JSON.stringify(m)).not.toMatch(/cliente frecuente|diseño/i)
  })

  it('totales, seña y total aceptado cuando es parcial', () => {
    const m = model()
    // 300 + 250 + 100 − 50 = 600
    expect(m.totals).toContainEqual({ label: 'Total', amount: '600,00 €', strong: true })
    // aceptado: 300 + 100 = 400 de 650 → ajustes −50 × 400/650 = −30,77 → 369,23
    expect(m.totals).toContainEqual({ label: 'Total aceptado', amount: '369,23 €', strong: true })
    // La seña es sobre lo aceptado: 50 % de 369,23
    expect(m.totals).toContainEqual({ label: 'Seña (50 %)', amount: '184,62 €' })
    expect(m.terms).toBe('50 % al aceptar')
    expect(m.notes).toBe('No incluye electrodomésticos')
  })

  it('borrador: marca de agua y fecha de hoy', () => {
    const m = model(quote({ status: 'borrador', sentAt: null, adjustments: [], items: [] }))
    expect(m.draft).toBe(true)
    expect(m.meta).toContain('Fecha 10/11/2026')
    expect(m.totals.some((t) => t.label === 'Total aceptado' || t.label === 'Descuento')).toBe(false)
  })
})

describe('pdfFileName', () => {
  it('arma un nombre legible y sin caracteres inválidos', () => {
    expect(pdfFileName({ title: 'Cocina / baño: "L"', version: 2 }, 'Ana Pérez')).toBe('Presupuesto - Ana Pérez - Cocina baño L v2.pdf')
    expect(pdfFileName({ title: 'Placard', version: 1 }, null)).toBe('Presupuesto - Placard.pdf')
  })
})
