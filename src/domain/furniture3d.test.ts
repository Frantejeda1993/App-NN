import { describe, expect, it } from 'vitest'
import { FurnitureItemSchema } from '@/model'
import { furnitureBoxes, layoutItems, materialColor, sceneBounds } from './furniture3d'

const names: Record<string, string> = { blanco: 'Melamina Blanca 19mm', mdf: 'Trasera / MDF 3mm', nogal: 'Tablero Melamina Nogal Canaletto' }
const nameOf = (id: string | null) => (id ? names[id] : undefined)

const item = (over: Record<string, unknown> = {}) =>
  FurnitureItemSchema.parse({
    id: 'a',
    name: 'Bajo',
    widthMm: 600,
    heightMm: 800,
    depthMm: 580,
    structure: { materialId: 'blanco', thicknessMm: 19 },
    back: { materialId: 'mdf', thicknessMm: 3 },
    fronts: { materialId: 'nogal', thicknessMm: 19 },
    ...over,
  })

const kinds = (boxes: { kind: string }[]) => boxes.reduce<Record<string, number>>((acc, b) => ({ ...acc, [b.kind]: (acc[b.kind] ?? 0) + 1 }), {})
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 4)

describe('furnitureBoxes', () => {
  it('cuerpo: laterales, techo, base y trasera con sus espesores (en metros)', () => {
    const boxes = furnitureBoxes(item(), nameOf)
    expect(kinds(boxes)).toEqual({ lateral: 2, techo: 1, base: 1, trasera: 1 })
    const [left, right] = boxes.filter((b) => b.kind === 'lateral')
    expect(left.size).toEqual([0.019, 0.8, 0.58])
    close(left.position[0], 0.0095)
    close(right.position[0], 0.6 - 0.0095)
    const top = boxes.find((b) => b.kind === 'techo')!
    close(top.size[0], 0.6 - 0.038)
    close(top.position[1], 0.8 - 0.0095)
    const back = boxes.find((b) => b.kind === 'trasera')!
    close(back.size[2], 0.003)
    close(back.position[2], 0.0015)
  })

  it('sin trasera no hay pieza trasera', () => {
    expect(kinds(furnitureBoxes(item({ back: null }), nameOf)).trasera).toBeUndefined()
  })

  it('estantes y divisiones repartidos a la misma distancia', () => {
    const boxes = furnitureBoxes(item({ shelves: 3, dividers: 1 }), nameOf)
    const ys = boxes.filter((b) => b.kind === 'estante').map((b) => b.position[1])
    const inner = 0.8 - 0.038
    expect(ys).toHaveLength(3)
    ys.forEach((y, k) => close(y, 0.019 + (inner * (k + 1)) / 4))
    const div = boxes.find((b) => b.kind === 'division')!
    close(div.position[0], 0.3)
  })

  it('puertas: dividen el ancho con separación, delante del cuerpo', () => {
    const doors = furnitureBoxes(item({ doors: { count: 2 } }), nameOf).filter((b) => b.kind === 'puerta')
    expect(doors).toHaveLength(2)
    const total = doors.reduce((s, d) => s + d.size[0], 0)
    expect(total).toBeLessThan(0.6)
    expect(total).toBeGreaterThan(0.59)
    close(doors[0].position[2], 0.58 + 0.0095)
    close(doors[0].size[1], 0.8 - 0.003)
  })

  it('cajones abajo y puertas arriba cuando hay de los dos', () => {
    const boxes = furnitureBoxes(item({ heightMm: 2000, doors: { count: 2 }, drawers: { count: 2 } }), nameOf)
    const drawers = boxes.filter((b) => b.kind === 'cajon')
    const doors = boxes.filter((b) => b.kind === 'puerta')
    expect(drawers).toHaveLength(2)
    const drawerTop = Math.max(...drawers.map((d) => d.position[1] + d.size[1] / 2))
    const doorBottom = Math.min(...doors.map((d) => d.position[1] - d.size[1] / 2))
    expect(drawerTop).toBeLessThanOrEqual(doorBottom + 1e-9)
    close(drawers[0].size[1], 0.18 - 0.003) // 180 mm por cajón
  })

  it('solo cajones: ocupan todo el alto', () => {
    const drawers = furnitureBoxes(item({ drawers: { count: 4 } }), nameOf).filter((b) => b.kind === 'cajon')
    expect(drawers).toHaveLength(4)
    const span = Math.max(...drawers.map((d) => d.position[1] + d.size[1] / 2)) - Math.min(...drawers.map((d) => d.position[1] - d.size[1] / 2))
    expect(span).toBeGreaterThan(0.79)
  })

  it('abiertas: las puertas giran sobre la bisagra y los cajones salen hacia delante', () => {
    const closed = furnitureBoxes(item({ doors: { count: 2 }, drawers: { count: 1 } }), nameOf)
    const open = furnitureBoxes(item({ doors: { count: 2 }, drawers: { count: 1 } }), nameOf, { open: true })
    const [l, r] = open.filter((b) => b.kind === 'puerta')
    expect(l.rotationY).toBeLessThan(0)
    expect(r.rotationY).toBeGreaterThan(0)
    expect(l.position[2]).toBeGreaterThan(closed.find((b) => b.kind === 'puerta')!.position[2])
    const dClosed = closed.find((b) => b.kind === 'cajon')!
    const dOpen = open.find((b) => b.kind === 'cajon')!
    expect(dOpen.position[2]).toBeGreaterThan(dClosed.position[2] + 0.2)
  })

  it('colores según el material de cada parte', () => {
    const boxes = furnitureBoxes(item({ doors: { count: 1 } }), nameOf)
    expect(boxes.find((b) => b.kind === 'lateral')!.color).toBe(materialColor('Melamina Blanca'))
    expect(boxes.find((b) => b.kind === 'puerta')!.color).toBe(materialColor('Nogal'))
  })
})

describe('materialColor', () => {
  it('reconoce los materiales comunes y usa gris si no', () => {
    expect(materialColor('Melamina Blanca 19mm')).not.toBe(materialColor('Tablero Melamina Negro S3'))
    expect(materialColor('Roble Vicenza')).not.toBe(materialColor('Melamina Blanca'))
    expect(materialColor('MDF Crudo 19mm')).not.toBe(materialColor('Algo raro'))
    expect(materialColor(undefined)).toBe(materialColor('Algo raro'))
  })
})

describe('layoutItems', () => {
  it('pone los muebles uno al lado del otro con separación', () => {
    const laid = layoutItems([item({ id: 'a', widthMm: 600 }), item({ id: 'b', widthMm: 1200 })], nameOf)
    expect(laid.map((l) => l.offsetX)).toEqual([0, 0.7])
    const b = sceneBounds(laid.flatMap((l) => l.boxes.map((x) => ({ ...x, position: [x.position[0] + l.offsetX, x.position[1], x.position[2]] as [number, number, number] }))))
    close(b.max[0], 1.9)
    close(b.max[1], 0.8)
  })
})
