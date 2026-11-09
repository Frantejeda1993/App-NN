/**
 * Cálculo del presupuesto (puro, en céntimos). Reglas acordadas:
 * - m² estructura = 2·alto·prof + 2·ancho·prof + estantes·ancho·prof; frentes = ancho·alto·puertas;
 *   trasera = ancho·alto. Todo × cantidad.
 * - Placas enteras: por material se suman los m² × desperdicio de todos los muebles,
 *   se redondea hacia arriba a placas y ese coste se reparte entre los muebles según sus m².
 * - Corte/canteado = m² totales × tarifa; canto = metros × precio.
 * - Herrajes = bisagras + guías (1 por cajón) + otros + extras por metro + otros en €.
 * - Mano de obra sugerida = m² × tarifa + puertas, cajones y herrajes × su tarifa
 *   (o la escrita a mano). Total = suma + complejidad, o el precio final a mano.
 * - El multiplicador sobre materiales se informa como referencia, no cambia el total.
 */
import { allocateByWeights } from './percent'

interface PanelLike {
  materialId: string | null
}

export interface ItemLike {
  id: string
  name: string
  quantity: number
  widthMm: number
  heightMm: number
  depthMm: number
  shelves: number
  structure: PanelLike
  back: PanelLike | null
  fronts: PanelLike
  doors: { count: number; hinges: { hardwareId: string; qty: number }[] }
  drawers: { count: number; slideHardwareId: string | null }
  edgeBanding: { edgeBandingId: string | null; meters: number }
  hardware: { hardwareId: string; qty: number }[]
  linearExtras: { hardwareId: string; meters: number }[]
  otherHardwareCents: number
  laborCents: number | null
  complexityCents: number
  finalPriceCents: number | null
  accepted: boolean
}

export interface CatalogLike {
  materials: Map<
    string,
    {
      name: string
      sheetWidthMm: number
      sheetHeightMm: number
      sheetPriceCents: number
      wasteFactor: number
    }
  >
  hardware: Map<string, { priceCents: number }>
  edgeBanding: Map<string, { pricePerMeterCents: number }>
}

export interface RatesLike {
  cutAndEdgePerM2Cents: number
  laborPerM2Cents: number
  laborPerDoorCents: number
  laborPerDrawerCents: number
  laborPerHardwareUnitCents: number
  materialsMultiplier: number
}

export interface ItemBreakdown {
  id: string
  m2: number
  materialCents: number
  cutCents: number
  edgeCents: number
  hardwareCents: number
  laborSuggestedCents: number
  laborCents: number
  complexityCents: number
  /** Suma calculada (antes del precio manual). */
  computedCents: number
  /** Precio del mueble (manual si hay, si no el calculado). */
  totalCents: number
}

export interface SheetLine {
  materialId: string
  name: string
  m2WithWaste: number
  sheets: number
  costCents: number
}

export interface QuoteTotals {
  items: ItemBreakdown[]
  sheets: SheetLine[]
  itemsCents: number
  freeLinesCents: number
  adjustmentsCents: number
  subtotalCents: number
  vatCents: number
  totalCents: number
  acceptedTotalCents: number
  depositCents: number
  /** Materiales × multiplicador (solo referencia; 0 si no se usa). */
  multiplierRefCents: number
}

const m2 = (a: number, b: number) => (a * b) / 1_000_000
const round = (x: number) => Math.round(x)

/** m² por panel (ya multiplicado por la cantidad). */
export function itemAreas(i: ItemLike) {
  const q = i.quantity
  const structure = (2 * m2(i.heightMm, i.depthMm) + 2 * m2(i.widthMm, i.depthMm) + i.shelves * m2(i.widthMm, i.depthMm)) * q
  const fronts = m2(i.widthMm, i.heightMm) * i.doors.count * q
  const back = i.back ? m2(i.widthMm, i.heightMm) * q : 0
  return { structure, fronts, back, total: structure + fronts + back }
}

export function computeQuote(
  quote: {
    items: ItemLike[]
    freeLines: { amountCents: number; accepted: boolean }[]
    adjustments: { amountCents: number }[]
    depositBp: number
    vatBp: number
  },
  catalog: CatalogLike,
  rates: RatesLike,
): QuoteTotals {
  // 1) m² con desperdicio por material y por mueble.
  const byMaterial = new Map<string, Record<string, number>>()
  for (const item of quote.items) {
    const a = itemAreas(item)
    const parts: [PanelLike | null, number][] = [
      [item.structure, a.structure],
      [item.fronts, a.fronts],
      [item.back, a.back],
    ]
    for (const [panel, area] of parts) {
      const mat = panel?.materialId ? catalog.materials.get(panel.materialId) : undefined
      if (!panel?.materialId || !mat || area <= 0) continue
      const w = byMaterial.get(panel.materialId) ?? {}
      w[item.id] = (w[item.id] ?? 0) + area * mat.wasteFactor
      byMaterial.set(panel.materialId, w)
    }
  }

  // 2) Placas enteras y su coste repartido entre muebles según m².
  const materialCost: Record<string, number> = {}
  const sheets: SheetLine[] = []
  for (const [materialId, weights] of byMaterial) {
    const mat = catalog.materials.get(materialId)!
    const total = Object.values(weights).reduce((s, v) => s + v, 0)
    const sheetArea = m2(mat.sheetWidthMm, mat.sheetHeightMm)
    const count = sheetArea > 0 ? Math.ceil(total / sheetArea - 1e-9) : 0
    const cost = count * mat.sheetPriceCents
    sheets.push({
      materialId,
      name: mat.name,
      m2WithWaste: Math.round(total * 100) / 100,
      sheets: count,
      costCents: cost,
    })
    for (const [itemId, c] of Object.entries(allocateByWeights(cost, weights))) materialCost[itemId] = (materialCost[itemId] ?? 0) + c
  }

  // 3) Resto del desglose por mueble.
  const price = (id: string | null) => (id ? (catalog.hardware.get(id)?.priceCents ?? 0) : 0)
  const items: ItemBreakdown[] = quote.items.map((i) => {
    const q = i.quantity
    const a = itemAreas(i)
    const hingeUnits = i.doors.hinges.reduce((s, h) => s + h.qty, 0)
    const otherUnits = i.hardware.reduce((s, h) => s + h.qty, 0)
    const hardwareCents =
      round(
        i.doors.hinges.reduce((s, h) => s + h.qty * price(h.hardwareId), 0) +
          i.drawers.count * price(i.drawers.slideHardwareId) +
          i.hardware.reduce((s, h) => s + h.qty * price(h.hardwareId), 0) +
          i.linearExtras.reduce((s, h) => s + h.meters * price(h.hardwareId), 0),
      ) *
        q +
      i.otherHardwareCents
    const cutCents = round(a.total * rates.cutAndEdgePerM2Cents)
    const edge = i.edgeBanding.edgeBandingId ? catalog.edgeBanding.get(i.edgeBanding.edgeBandingId) : undefined
    const edgeCents = round(i.edgeBanding.meters * (edge?.pricePerMeterCents ?? 0)) * q
    const laborSuggestedCents =
      round(a.total * rates.laborPerM2Cents) +
      (i.doors.count * rates.laborPerDoorCents +
        i.drawers.count * rates.laborPerDrawerCents +
        (hingeUnits + otherUnits) * rates.laborPerHardwareUnitCents) *
        q
    const laborCents = i.laborCents ?? laborSuggestedCents
    const materialCents = materialCost[i.id] ?? 0
    const computedCents = materialCents + cutCents + edgeCents + hardwareCents + laborCents + i.complexityCents
    return {
      id: i.id,
      m2: Math.round(a.total * 100) / 100,
      materialCents,
      cutCents,
      edgeCents,
      hardwareCents,
      laborSuggestedCents,
      laborCents,
      complexityCents: i.complexityCents,
      computedCents,
      totalCents: i.finalPriceCents ?? computedCents,
    }
  })

  const itemsCents = items.reduce((s, b) => s + b.totalCents, 0)
  const freeLinesCents = quote.freeLines.reduce((s, l) => s + l.amountCents, 0)
  const adjustmentsCents = quote.adjustments.reduce((s, a) => s + a.amountCents, 0)
  const subtotalCents = itemsCents + freeLinesCents + adjustmentsCents
  const vatCents = round((subtotalCents * quote.vatBp) / 10000)
  const totalCents = subtotalCents + vatCents

  const acceptedItems = items.filter((_, idx) => quote.items[idx].accepted).reduce((s, b) => s + b.totalCents, 0)
  const acceptedLines = quote.freeLines.filter((l) => l.accepted).reduce((s, l) => s + l.amountCents, 0)
  const acceptedSub = acceptedItems + acceptedLines + adjustmentsCents
  const acceptedTotalCents = acceptedSub + round((acceptedSub * quote.vatBp) / 10000)

  const materialsTotal = sheets.reduce((s, x) => s + x.costCents, 0)
  return {
    items,
    sheets,
    itemsCents,
    freeLinesCents,
    adjustmentsCents,
    subtotalCents,
    vatCents,
    totalCents,
    acceptedTotalCents,
    depositCents: round((totalCents * quote.depositBp) / 10000),
    multiplierRefCents: rates.materialsMultiplier > 0 ? round(materialsTotal * rates.materialsMultiplier) : 0,
  }
}
