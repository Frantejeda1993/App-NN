import type { MovementType } from '@/model'

export const TYPE_LABELS: Record<MovementType, string> = {
  cobro: 'Cobro',
  gasto_proyecto: 'Gasto de proyecto',
  gasto_general: 'Gasto general',
  retiro: 'Retiro de socio',
  aporte: 'Aporte de socio',
  transferencia: 'Transferencia',
  reintegro: 'Reintegro a socio',
  reparto: 'Reparto del fondo del taller',
}

/** Tipos que se cargan desde el formulario (gasto general llega en el paso 6). */
export const FORM_TYPES: MovementType[] = ['cobro', 'gasto_proyecto', 'retiro', 'aporte', 'reintegro', 'transferencia']

export const FIELD_LABELS: Record<string, string> = {
  type: 'Tipo',
  status: 'Estado',
  amountCents: 'Importe',
  date: 'Fecha',
  boxId: 'Caja',
  toBoxId: 'Caja destino',
  paidBy: 'Pagó de su bolsillo',
  memberEmail: 'Socio',
  projectId: 'Proyecto',
  projectSplits: 'Reparto entre proyectos',
  generalExpenseId: 'Gasto general',
  category: 'Categoría',
  description: 'Descripción',
  deleted: 'Eliminado',
}

export const ACTION_LABELS = { create: 'Creado', update: 'Editado', delete: 'Eliminado' } as const
