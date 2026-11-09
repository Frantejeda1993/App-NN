/**
 * Lista de compras de un presupuesto (solo lo aceptado): placas enteras por
 * material (misma regla que el presupuesto), metros de canto y herrajes,
 * agrupados por proveedor.
 */
import type { QuoteData } from '@/model'
import { computeQuote } from './quote'

type Supplier = { supplier: string; url: string }

export interface ShoppingCatalog {
  materials: Map<string, { name: string; sheetWidthMm: number; sheetHeightMm: number; sheetPriceCents: number; wasteFactor: number } & Supplier>
  hardware: Map<string, { name: string; priceCents: number; unit: 'u' | 'par' | 'ml' } & Supplier>
  edgeBanding: Map<string, { name: string; pricePerMeterCents: number } & Supplier>
}

export interface ShoppingLine {
  /** Clave estable (para marcar "comprado"): sheet:<id>, edge:<id>, hw:<id>. */
  key: string
  kind: 'placa' | 'canto' | 'herraje'
  name: string
  qty: number
  unit: 'placa' | 'm' | 'u' | 'par' | 'ml'
  unitPriceCents: number
  totalCents: number
  url: string
}

export interface ShoppingGroup {
  supplier: string
  lines: ShoppingLine[]
  totalCents: number
}

export interface ShoppingList {
  groups: ShoppingGroup[]
  /** "Otros herrajes" cargados a mano en €: no tienen artículo del catálogo. */
  manualCents: number
  totalCents: number
}

export const NO_SUPPLIER = 'Sin proveedor'
const KIND_ORDER = { placa: 0, canto: 1, herraje: 2 }
// Evita errores de coma flotante al sumar metros (1,5 + 1,5…).
const tidy = (n: number) => Math.round(n * 1000) / 1000

export function shoppingList(quote: Pick<QuoteData, 'items'>, catalog: ShoppingCatalog): ShoppingList {
  const items = quote.items.filter((i) => i.accepted)
  const lines = new Map<string, ShoppingLine & { supplier: string }>()

  // Placas: el mismo cálculo de placas enteras que el presupuesto.
  const zero = { cutAndEdgePerM2Cents: 0, laborPerM2Cents: 0, laborPerDoorCents: 0, laborPerDrawerCents: 0, laborPerHardwareUnitCents: 0, materialsMultiplier: 0 }
  const sheets = computeQuote({ items, freeLines: [], adjustments: [], depositBp: 0, vatBp: 0 }, catalog, zero).sheets
  for (const s of sheets) {
    const m = catalog.materials.get(s.materialId)!
    if (s.sheets === 0) continue
    lines.set(`sheet:${s.materialId}`, {
      key: `sheet:${s.materialId}`,
      kind: 'placa',
      name: m.name,
      qty: s.sheets,
      unit: 'placa',
      unitPriceCents: m.sheetPriceCents,
      totalCents: s.costCents,
      url: m.url,
      supplier: m.supplier,
    })
  }

  const addHardware = (id: string | null, qty: number) => {
    const h = id ? catalog.hardware.get(id) : undefined
    if (!id || !h || qty <= 0) return
    const key = `hw:${id}`
    const prev = lines.get(key)
    const total = tidy((prev?.qty ?? 0) + qty)
    lines.set(key, {
      key,
      kind: 'herraje',
      name: h.name,
      qty: total,
      unit: h.unit,
      unitPriceCents: h.priceCents,
      totalCents: Math.round(total * h.priceCents),
      url: h.url,
      supplier: h.supplier,
    })
  }

  let manualCents = 0
  for (const i of items) {
    const q = i.quantity
    for (const h of i.doors.hinges) addHardware(h.hardwareId, h.qty * q)
    addHardware(i.drawers.slideHardwareId, i.drawers.count * q)
    for (const h of i.hardware) addHardware(h.hardwareId, h.qty * q)
    for (const h of i.linearExtras) addHardware(h.hardwareId, h.meters * q)
    manualCents += i.otherHardwareCents

    const e = i.edgeBanding.edgeBandingId ? catalog.edgeBanding.get(i.edgeBanding.edgeBandingId) : undefined
    if (e && i.edgeBanding.meters > 0) {
      const key = `edge:${i.edgeBanding.edgeBandingId}`
      const meters = tidy((lines.get(key)?.qty ?? 0) + i.edgeBanding.meters * q)
      lines.set(key, {
        key,
        kind: 'canto',
        name: e.name,
        qty: meters,
        unit: 'm',
        unitPriceCents: e.pricePerMeterCents,
        totalCents: Math.round(meters * e.pricePerMeterCents),
        url: e.url,
        supplier: e.supplier,
      })
    }
  }

  const bySupplier = new Map<string, ShoppingLine[]>()
  for (const { supplier, ...line } of lines.values()) {
    const name = supplier.trim() || NO_SUPPLIER
    bySupplier.set(name, [...(bySupplier.get(name) ?? []), line])
  }
  const groups = [...bySupplier.entries()]
    .map(([supplier, ls]) => ({
      supplier,
      lines: ls.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name, 'es')),
      totalCents: ls.reduce((s, l) => s + l.totalCents, 0),
    }))
    // Alfabético, con "Sin proveedor" al final.
    .sort((a, b) => Number(a.supplier === NO_SUPPLIER) - Number(b.supplier === NO_SUPPLIER) || a.supplier.localeCompare(b.supplier, 'es'))

  return { groups, manualCents, totalCents: groups.reduce((s, g) => s + g.totalCents, 0) + manualCents }
}

const UNIT_LABEL: Record<ShoppingLine['unit'], [string, string]> = {
  placa: ['placa', 'placas'],
  m: ['m', 'm'],
  ml: ['m', 'm'],
  u: ['u', 'u'],
  par: ['par', 'pares'],
}

export const formatQty = (l: Pick<ShoppingLine, 'qty' | 'unit'>) =>
  `${l.qty.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${UNIT_LABEL[l.unit][l.qty === 1 ? 0 : 1]}`

/** Texto del pedido para pegar en WhatsApp o un email. */
export function orderText(group: ShoppingGroup, title: string): string {
  return [`Pedido ${group.supplier} – ${title}`, ...group.lines.map((l) => `- ${l.name}: ${formatQty(l)}`)].join('\n')
}
