/**
 * Catálogo: precios por placa / m² y la carga inicial con los valores de la
 * hoja "DB" (y "Precios de mercado") del Excel del taller.
 */
import { eurosToCents } from './money'
import { TemplateDataSchema, type EdgeBandingData, type HardwareData, type MaterialData, type ServiceRates, type TemplateData } from '@/model'

const DEFAULT_SHEET = { widthMm: 2850, heightMm: 2100 }

export function pricePerM2Cents(m: { sheetWidthMm: number; sheetHeightMm: number; sheetPriceCents: number }): number {
  const area = (m.sheetWidthMm * m.sheetHeightMm) / 1_000_000
  return area > 0 ? Math.round(m.sheetPriceCents / area) : 0
}

/** "… 2440x1220x19" → 2440 × 1220. */
export function parseSheetSize(name: string): { widthMm: number; heightMm: number } | null {
  const m = name.match(/(\d{3,4})\s*x\s*(\d{3,4})/i)
  return m ? { widthMm: Number(m[1]), heightMm: Number(m[2]) } : null
}

/** "16mm", "MDF 3mm", "…x19" → espesor; por defecto 19 mm. */
export function parseThickness(name: string): number {
  const mm = name.match(/(?<!\d)(\d{1,2})\s*mm/i)
  if (mm) return Number(mm[1])
  const tail = name.match(/\d{3,4}\s*x\s*\d{3,4}\s*x\s*(\d{1,2})/i)
  return tail ? Number(tail[1]) : 19
}

// [nombre, precio m² compra (€), factor desperdicio] — hoja DB del Excel.
const DB_MATERIALS: [string, number, number][] = [
  ['Melamina Blanca 19mm (Estructura)', 20.7, 1.3],
  ['Melamina Blanca 16mm (Cajon/Int)', 18.5, 1.3],
  ['MDF Crudo 10mm', 9.5, 1.3],
  ['MDF Crudo 19mm', 22, 1.3],
  ['MDF Crudo 22mm', 16.4, 1.3],
  ['Trasera / MDF 3mm', 13.8, 1.5],
  ['Color Premium (Gris/Madera)', 42, 1.65],
  ['PerfectSense / Alto Brillo', 60, 1.65],
  ['Madera Maciza / Listón', 90, 1.4],
  ['Melamina superpan Finsa Roble Ideal claro', 20.17, 1.3],
  ['Tablero Melamina Superpan Blanc 120 Extra Soft 2440x1220x30', 29.67, 1.3],
  ['Melamina EGGER U830 Nude TERRACOTA (gama colores lisos)', 22.9, 1.3],
  ['Melamina 10mm KRONOSPAN K359 Roble Coñac Castello', 13.6, 1.3],
  ['Tablero Melamina Nogal Canaletto 30mm', 29.9, 1.3],
  ['TAAB2121 Tablero Abedul -B/BB 2500x1250x21', 98.7, 1.3],
  ['Tablero Melamina Nogal Valentina MESURA 2850x2100x30', 32.8, 1.3],
  ['Tablero Melamina Blanc Llis 120 30mm', 29.7, 1.3],
  ['Roble Vicenza Blanqueado', 29, 1.3],
  ['Roble Hamilton Nat', 31.5, 1.4],
  ['Tablero Melamina Negro S3 2850x2100x19', 18.04, 1.4],
  ['Tablero Melamina Nogal Canaletto MESURA 2440x1220x19', 23.9, 1.4],
]

const ESTEBA = 'Esteba'

export interface CatalogSeed {
  materials: MaterialData[]
  edgeBanding: EdgeBandingData[]
  hardware: HardwareData[]
  services: Pick<ServiceRates, 'cutAndEdgePerM2Cents'>
}

const extra = { supplier: '', url: '', active: true, notes: '' }

export function excelSeed(): CatalogSeed {
  const materials: MaterialData[] = DB_MATERIALS.map(([name, perM2, waste]) => {
    const sheet = parseSheetSize(name) ?? DEFAULT_SHEET
    const area = (sheet.widthMm * sheet.heightMm) / 1_000_000
    return {
      name,
      sheetWidthMm: sheet.widthMm,
      sheetHeightMm: sheet.heightMm,
      thicknessMm: parseThickness(name),
      sheetPriceCents: eurosToCents(perM2 * area),
      wasteFactor: waste,
      ...extra,
      notes: parseSheetSize(name) ? '' : 'Medida de placa supuesta (2850×2100): revisala.',
    }
  })

  const hw = (name: string, kind: HardwareData['kind'], unit: HardwareData['unit'], euros: number, url = '', supplier = ESTEBA): HardwareData => ({
    name,
    kind,
    unit,
    priceCents: eurosToCents(euros),
    ...extra,
    supplier,
    url,
  })

  const hardware: HardwareData[] = [
    hw('110° Bisagra Blum 71B3550 Clip Blumotion recta niquelado', 'bisagra', 'u', 4.6, 'https://www.esteba.com/es/bisagra-blum-71b3550-clip-blumotion-recta'),
    hw('155° Bisagra Blum 71B7550 Clip Blumotion recta niquelado', 'bisagra', 'u', 10.1, 'https://www.esteba.com/es/bisagra-blum-71b7550-clip-blumotion-recta'),
    hw('450 DTC D-Motion DS80 (juego de guías)', 'guia', 'par', 23.38, 'https://www.esteba.com/es/juego-guias-dtc-d-motion-ds80-extraccion-total-3d'),
    hw('450 Juego guías Super Rail extracción total soft close', 'guia', 'par', 10.97, 'https://www.esteba.com/es/juego-guias-super-rail-extraccion-total-soft-close'),
    hw('550 DTC D-Motion DS80 (juego de guías)', 'guia', 'par', 27),
    hw('GTV + estructura (guías)', 'guia', 'par', 22),
    hw('Cajón Magic 550', 'guia', 'u', 60),
    hw('Perfil de aluminio para LED', 'perfil', 'ml', 5, '', ''),
    hw('Tira LED', 'led', 'ml', 4, '', ''),
    hw('Fuente para LED', 'led', 'u', 20, '', ''),
  ]

  const edgeBanding: EdgeBandingData[] = [
    { name: 'Canto blanco', pricePerMeterCents: 178, ...extra, supplier: 'Fustas Esteban' },
    { name: 'Canto color', pricePerMeterCents: 200, ...extra, supplier: 'Fustas Esteban' },
  ]

  return { materials, edgeBanding, hardware, services: { cutAndEdgePerM2Cents: 1600 } }
}

// ---- plantillas -------------------------------------------------------------

const STRUCTURE = 'Melamina Blanca 19mm (Estructura)'
const BACK = 'Trasera / MDF 3mm'
const BATH = 'Melamina superpan Finsa Roble Ideal claro'
const HINGE = '110° Bisagra Blum'
const SLIDE_450 = '450 DTC D-Motion'
const SLIDE_550 = '550 DTC D-Motion'

interface TemplateSpec {
  name: string
  category: string
  w: number
  h: number
  d: number
  shelves?: number
  doors?: number
  hinges?: number
  drawers?: number
  back?: boolean
  material?: string
  notes?: string
}

/** Los muebles que más se repiten en la hoja "Presupuestos" del Excel. */
const EXCEL_TEMPLATES: TemplateSpec[] = [
  { name: 'Bajo cocina 60', category: 'Cocina', w: 600, h: 800, d: 580, shelves: 1, doors: 2, hinges: 4 },
  { name: 'Bajo cocina 120', category: 'Cocina', w: 1200, h: 800, d: 580, shelves: 1, doors: 2, hinges: 4 },
  { name: 'Bajo cajonera cocina', category: 'Cocina', w: 600, h: 800, d: 580, drawers: 3 },
  { name: 'Alto cocina 60', category: 'Cocina', w: 600, h: 900, d: 400, shelves: 1, doors: 2, hinges: 4 },
  { name: 'Columna / módulo 60', category: 'Cocina', w: 600, h: 1100, d: 600, shelves: 3 },
  { name: 'Placard 2 puertas con cajones', category: 'Dormitorio', w: 800, h: 2500, d: 550, shelves: 3, doors: 2, hinges: 8, drawers: 3 },
  { name: 'Placard alto empotrado', category: 'Dormitorio', w: 830, h: 2500, d: 450, shelves: 6, doors: 2, hinges: 6 },
  { name: 'Sinfonier', category: 'Dormitorio', w: 500, h: 1110, d: 400, drawers: 4 },
  { name: 'Cajonera de habitación', category: 'Dormitorio', w: 900, h: 1000, d: 550, drawers: 4 },
  { name: 'Mesita de noche', category: 'Dormitorio', w: 420, h: 420, d: 350, shelves: 1, drawers: 1 },
  { name: 'Cajonera de escritorio', category: 'Escritorio', w: 300, h: 700, d: 480, drawers: 3 },
  { name: 'Mueble de baño', category: 'Baño', w: 450, h: 537, d: 450, shelves: 1, doors: 2, hinges: 4, material: BATH },
  { name: 'Aparador con puertas', category: 'Living', w: 1260, h: 720, d: 600, shelves: 1, doors: 2, hinges: 4 },
  { name: 'Estantería abierta', category: 'Living', w: 600, h: 1500, d: 450, shelves: 4, back: false },
]

/** Nombres de las plantillas del Excel (para saber si ya se cargaron). */
export const EXCEL_TEMPLATE_NAMES: readonly string[] = EXCEL_TEMPLATES.map((t) => t.name)

/**
 * Plantillas del Excel. Materiales y herrajes se buscan por nombre en el
 * catálogo cargado; lo que no está queda vacío y se informa en `missing`.
 */
export function excelTemplates(
  materials: { id: string; name: string }[],
  hardware: { id: string; name: string }[],
): { templates: TemplateData[]; missing: string[] } {
  const missing = new Set<string>()
  const find = (list: { id: string; name: string }[], prefix: string) => {
    const hit = list.find((x) => x.name.toLowerCase().startsWith(prefix.toLowerCase()))
    if (!hit) missing.add(prefix)
    return hit?.id ?? null
  }
  const templates = EXCEL_TEMPLATES.map((t) => {
    const mat = find(materials, t.material ?? STRUCTURE)
    const hinge = t.hinges ? find(hardware, HINGE) : null
    const slide = t.drawers ? find(hardware, t.d >= 550 ? SLIDE_550 : SLIDE_450) : null
    return TemplateDataSchema.parse({
      name: t.name,
      category: t.category,
      item: {
        name: t.name,
        widthMm: t.w,
        heightMm: t.h,
        depthMm: t.d,
        shelves: t.shelves ?? 0,
        structure: { materialId: mat, thicknessMm: 19 },
        back: t.back === false ? null : { materialId: find(materials, BACK), thicknessMm: 3 },
        fronts: { materialId: t.doors || t.drawers ? mat : null, thicknessMm: 19 },
        doors: { count: t.doors ?? 0, hinges: hinge ? [{ hardwareId: hinge, qty: t.hinges }] : [] },
        drawers: { count: t.drawers ?? 0, slideHardwareId: slide },
        notes: t.notes ?? 'Plantilla basada en el Excel del taller.',
      },
    })
  })
  return { templates, missing: [...missing] }
}
