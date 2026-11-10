/**
 * Dibuja los muebles en una imagen (para el PDF) con three.js, sin mostrar nada en
 * pantalla. Misma geometría que el visor. Devuelve null si no hay WebGL.
 */
import { layoutItems, sceneBounds, type Box3 } from '@/domain/furniture3d'
import type { FurnitureItem } from '@/model'

type Geometry = Pick<
  FurnitureItem,
  'widthMm' | 'heightMm' | 'depthMm' | 'shelves' | 'dividers' | 'structure' | 'back' | 'fronts' | 'doors' | 'drawers'
>

export async function renderFurniturePng(
  items: Geometry[],
  materialName: (id: string | null) => string | undefined,
  size: { width: number; height: number } = { width: 1400, height: 800 },
): Promise<string | null> {
  if (items.length === 0) return null
  const THREE = await import('three')
  let renderer: InstanceType<typeof THREE.WebGLRenderer> | null = null
  const disposables: { dispose(): void }[] = []
  try {
    const canvas = document.createElement('canvas')
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.setSize(size.width, size.height, false)
    renderer.setClearColor('#ffffff', 1)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight('#ffffff', 0.75))
    scene.add(new THREE.HemisphereLight('#ffffff', '#b9a998', 0.5))
    const sun = new THREE.DirectionalLight('#ffffff', 1.3)
    sun.position.set(3, 5, 4)
    scene.add(sun)
    const fill = new THREE.DirectionalLight('#ffffff', 0.35)
    fill.position.set(-4, 2, -3)
    scene.add(fill)

    const laid = layoutItems(items, materialName)
    const all: Box3[] = []
    const edgeMat = new THREE.LineBasicMaterial({ color: '#3f3a36' })
    disposables.push(edgeMat)
    for (const { offsetX, boxes } of laid) {
      for (const b of boxes) {
        const geo = new THREE.BoxGeometry(...b.size)
        const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.75, metalness: 0.02 })
        const edges = new THREE.EdgesGeometry(geo, 15)
        disposables.push(geo, mat, edges)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(b.position[0] + offsetX, b.position[1], b.position[2])
        mesh.rotation.y = b.rotationY
        mesh.add(new THREE.LineSegments(edges, edgeMat))
        scene.add(mesh)
        all.push({ ...b, position: [b.position[0] + offsetX, b.position[1], b.position[2]] })
      }
    }

    // Encuadre: mismo ángulo que el visor, ajustado al ancho de la imagen.
    const { min, max } = sceneBounds(all)
    const center = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
    const radius = Math.max(Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2, 0.3)
    const camera = new THREE.PerspectiveCamera(35, size.width / size.height, 0.01, radius * 40)
    const dist = radius * 3
    camera.position.set(center.x + dist * 0.45, center.y + dist * 0.3, center.z + dist)
    // Mirando un poco por debajo del centro, la vista desde arriba queda centrada en la imagen.
    camera.lookAt(center.x, center.y - radius * 0.15, center.z)

    renderer.render(scene, camera)
    return canvas.toDataURL('image/png')
  } catch {
    return null
  } finally {
    disposables.forEach((d) => d.dispose())
    renderer?.dispose()
    renderer?.forceContextLoss()
  }
}
