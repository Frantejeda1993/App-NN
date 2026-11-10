/**
 * Escena 3D (three.js + react-three-fiber). Se carga solo al abrir una vista 3D
 * (ver Furniture3DView), así three.js no pesa en el resto de la app.
 */
import { Edges, Html, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { sceneBounds, type Box3 } from '@/domain/furniture3d'

export interface SceneItem {
  key: string
  label?: string
  offsetX: number
  boxes: Box3[]
}

type Controls = { target: { set(x: number, y: number, z: number): void }; update(): void }

function Piece({ box, offsetX }: { box: Box3; offsetX: number }) {
  const [x, y, z] = box.position
  return (
    <mesh position={[x + offsetX, y, z]} rotation={[0, box.rotationY, 0]}>
      <boxGeometry args={box.size} />
      <meshStandardMaterial color={box.color} roughness={0.75} metalness={0.02} />
      <Edges threshold={15} color="#3f3a36" />
    </mesh>
  )
}

/** Encuadra la cámara cuando cambia el tamaño de lo que se muestra. */
function FitCamera({ center, radius, fitKey }: { center: [number, number, number]; radius: number; fitKey: string }) {
  const get = useThree((s) => s.get)
  const controls = useThree((s) => s.controls)
  useEffect(() => {
    // El estado de three.js se lee y se ajusta acá (no se modifica lo que devuelve un hook).
    const { camera, invalidate } = get()
    const dist = Math.max(radius, 0.3) * 2.6
    camera.position.set(center[0] + dist * 0.55, center[1] + dist * 0.35, center[2] + dist)
    camera.near = 0.01
    camera.far = dist * 20
    camera.updateProjectionMatrix()
    const c = controls as unknown as Controls | null
    if (c) {
      c.target.set(...center)
      c.update()
    }
    invalidate()
    // Solo al cambiar el encuadre (no en cada cambio de color o puertas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, controls, get])
  return null
}

export default function Furniture3D({ items }: { items: SceneItem[] }) {
  const { center, radius, fitKey, floorY, labels } = useMemo(() => {
    const all = items.flatMap((it) => it.boxes.map((b) => ({ ...b, position: [b.position[0] + it.offsetX, b.position[1], b.position[2]] as Box3['position'] })))
    const { min, max } = sceneBounds(all)
    const c: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
    const r = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2
    // Etiqueta centrada sobre cada mueble; alternando la altura para que las de
    // muebles vecinos (y angostos) no se pisen.
    const labels = items.map((it, i) => {
      const b = sceneBounds(it.boxes)
      return [it.offsetX + (b.min[0] + b.max[0]) / 2, b.max[1] + 0.08 + (i % 2) * 0.16, (b.min[2] + b.max[2]) / 2] as [number, number, number]
    })
    return { center: c, radius: r, fitKey: [min, max].flat().map((v) => v.toFixed(2)).join(','), floorY: min[1], labels }
  }, [items])

  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 40 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#ffffff', '#b9a998', 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} />
      {items.map((it, i) => (
        <group key={it.key}>
          {it.boxes.map((b) => (
            <Piece key={b.key} box={b} offsetX={it.offsetX} />
          ))}
          {it.label && (
            <Html position={labels[i]} center zIndexRange={[10, 0]}>
              <span className="block max-w-40 truncate whitespace-nowrap rounded bg-card/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow" title={it.label}>
                {it.label}
              </span>
            </Html>
          )}
        </group>
      ))}
      <gridHelper args={[Math.max(radius * 6, 2), 20, '#8a7f75', '#5c544d']} position={[center[0], floorY - 0.001, center[2]]} />
      <OrbitControls makeDefault enableDamping={false} minDistance={0.2} maxDistance={radius * 10 + 2} />
      <FitCamera center={center} radius={radius} fitKey={fitKey} />
    </Canvas>
  )
}
