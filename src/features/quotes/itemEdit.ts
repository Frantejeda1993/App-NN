import type { FurnitureItem } from '@/model'

/**
 * Mueble en edición. Se identifica por su `id` (no por la posición en la lista):
 * si otro socio agrega o quita muebles mientras tanto, se guarda en el correcto.
 */
export interface ItemEdit {
  /** null = mueble nuevo. */
  itemId: string | null
  item: FurnitureItem
  errors: Record<string, string>
}

/** La lista de muebles con el de la edición aplicado (reemplaza por id, o lo agrega si es nuevo). */
export function withEditedItem(items: FurnitureItem[], edit: { itemId: string | null }, item: FurnitureItem): FurnitureItem[] {
  if (edit.itemId === null) return [...items, item]
  const exists = items.some((x) => x.id === edit.itemId)
  // Si otro socio lo quitó mientras se editaba, se vuelve a agregar (no se pierde lo editado).
  return exists ? items.map((x) => (x.id === edit.itemId ? item : x)) : [...items, item]
}
