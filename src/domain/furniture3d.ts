/**
 * Geometría simplificada de un mueble para el visor 3D: cada pieza es una caja.
 * Ejes: x de izquierda a derecha, y hacia arriba, z de atrás (0) hacia delante.
 * Se calcula en mm y se devuelve en metros (la escala de three.js).
 */
import type { FurnitureItem } from '@/model'

export type PieceKind = 'lateral' | 'techo' | 'base' | 'trasera' | 'estante' | 'division' | 'puerta' | 'cajon' | 'cajon_caja'

export interface Box3 {
  key: string
  kind: PieceKind
  /** Ancho, alto, profundidad (m). */
  size: [number, number, number]
  /** Centro (m). */
  position: [number, number, number]
  /** Giro sobre el eje vertical (rad), para puertas abiertas. */
  rotationY: number
  color: string
}

type ItemGeometry = Pick<
  FurnitureItem,
  'widthMm' | 'heightMm' | 'depthMm' | 'shelves' | 'dividers' | 'structure' | 'back' | 'fronts' | 'doors' | 'drawers'
>
type NameOf = (materialId: string | null) => string | undefined

const GAP = 3 // mm entre frentes
const DRAWER_MM = 180 // alto de cada cajón cuando comparte frente con puertas
const OPEN_ANGLE = (100 * Math.PI) / 180

const COLORS: [RegExp, string][] = [
  [/blanc|white/i, '#f2efe9'],
  [/negro|black/i, '#2f2f2f'],
  [/nogal/i, '#6b4a33'],
  [/roble/i, '#b48a5c'],
  [/abedul|contrachapado/i, '#dcc49c'],
  [/terracota|nude/i, '#c47e5f'],
  [/madera|list[oó]n/i, '#a9774f'],
  [/mdf/i, '#c9b38f'],
  [/gris|grey|gray/i, '#8e8e8e'],
]
const DEFAULT_COLOR = '#a8a29e'

/** Color aproximado según el nombre del material. */
export function materialColor(name: string | undefined): string {
  if (!name) return DEFAULT_COLOR
  return COLORS.find(([re]) => re.test(name))?.[1] ?? DEFAULT_COLOR
}

const m = (mm: number) => mm / 1000

export function furnitureBoxes(item: ItemGeometry, nameOf: NameOf, opts: { open?: boolean } = {}): Box3[] {
  const W = item.widthMm
  const H = item.heightMm
  const D = item.depthMm
  const t = Math.min(item.structure.thicknessMm, W / 2, H / 2)
  const b = item.back ? item.back.thicknessMm : 0
  const body = materialColor(nameOf(item.structure.materialId))
  const front = materialColor(nameOf(item.fronts.materialId ?? item.structure.materialId))
  const out: Box3[] = []
  const add = (key: string, kind: PieceKind, size: [number, number, number], pos: [number, number, number], color: string, rotationY = 0) =>
    out.push({ key, kind, size: size.map(m) as Box3['size'], position: pos.map(m) as Box3['position'], rotationY, color })

  // Cuerpo
  add('lat-izq', 'lateral', [t, H, D], [t / 2, H / 2, D / 2], body)
  add('lat-der', 'lateral', [t, H, D], [W - t / 2, H / 2, D / 2], body)
  add('techo', 'techo', [W - 2 * t, t, D], [W / 2, H - t / 2, D / 2], body)
  add('base', 'base', [W - 2 * t, t, D], [W / 2, t / 2, D / 2], body)
  if (item.back) add('trasera', 'trasera', [W - 2 * t, H - 2 * t, b], [W / 2, H / 2, b / 2], materialColor(nameOf(item.back.materialId)))

  // Interior: estantes y divisiones a la misma distancia
  const innerW = W - 2 * t
  const innerH = H - 2 * t
  const innerD = D - b
  for (let k = 1; k <= item.shelves; k++) {
    add(`estante-${k}`, 'estante', [innerW, t, innerD], [W / 2, t + (innerH * k) / (item.shelves + 1), b + innerD / 2], body)
  }
  for (let k = 1; k <= item.dividers; k++) {
    add(`division-${k}`, 'division', [t, innerH, innerD], [t + (innerW * k) / (item.dividers + 1), H / 2, b + innerD / 2], body)
  }

  // Frentes: cajones abajo, puertas arriba
  const f = item.fronts.thicknessMm
  const zFront = D + f / 2
  const doors = item.doors.count
  const drawers = item.drawers.count
  const drawerZone = drawers === 0 ? 0 : doors === 0 ? H : Math.min(drawers * DRAWER_MM, H / 2)

  if (drawers > 0) {
    const slot = drawerZone / drawers
    const pull = opts.open ? D * 0.6 : 0
    for (let k = 0; k < drawers; k++) {
      const yc = k * slot + slot / 2
      add(`cajon-${k + 1}`, 'cajon', [W - GAP, slot - GAP, f], [W / 2, yc, zFront + pull], front)
      if (opts.open) {
        add(`cajon-caja-${k + 1}`, 'cajon_caja', [innerW - 20, Math.max(slot * 0.6, 40), D * 0.85], [W / 2, yc, D - (D * 0.85) / 2 + pull], body)
      }
    }
  }

  if (doors > 0) {
    const zoneH = H - drawerZone
    const doorW = (W - GAP * (doors + 1)) / doors
    const doorH = zoneH - GAP
    const yc = drawerZone + zoneH / 2
    const leftHinged = Math.ceil(doors / 2)
    for (let k = 0; k < doors; k++) {
      const x0 = GAP + k * (doorW + GAP)
      const x1 = x0 + doorW
      if (!opts.open) {
        add(`puerta-${k + 1}`, 'puerta', [doorW, doorH, f], [x0 + doorW / 2, yc, zFront], front)
        continue
      }
      // Gira sobre la bisagra (borde izquierdo o derecho) hacia fuera.
      const cos = Math.cos(OPEN_ANGLE)
      const sin = Math.sin(OPEN_ANGLE)
      if (k < leftHinged) {
        add(`puerta-${k + 1}`, 'puerta', [doorW, doorH, f], [x0 + (cos * doorW) / 2, yc, zFront + (sin * doorW) / 2], front, -OPEN_ANGLE)
      } else {
        add(`puerta-${k + 1}`, 'puerta', [doorW, doorH, f], [x1 - (cos * doorW) / 2, yc, zFront + (sin * doorW) / 2], front, OPEN_ANGLE)
      }
    }
  }
  return out
}

export interface LaidOutItem {
  index: number
  offsetX: number
  boxes: Box3[]
}

const SPACING_MM = 100

/** Varios muebles uno al lado del otro (en el orden de la lista), separados 10 cm. */
export function layoutItems(items: ItemGeometry[], nameOf: NameOf, opts: { open?: boolean } = {}): LaidOutItem[] {
  let x = 0
  return items.map((item, index) => {
    const laid = { index, offsetX: m(x), boxes: furnitureBoxes(item, nameOf, opts) }
    x += item.widthMm + SPACING_MM
    return laid
  })
}

/** Caja que contiene todas las piezas (sin contar giros), para encuadrar la cámara. */
export function sceneBounds(boxes: Pick<Box3, 'size' | 'position'>[]): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const b of boxes) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], b.position[i] - b.size[i] / 2)
      max[i] = Math.max(max[i], b.position[i] + b.size[i] / 2)
    }
  }
  if (boxes.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] }
  return { min, max }
}
