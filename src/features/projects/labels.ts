import type { StatusGroup } from '@/domain/projects'
import type { ProjectStatus } from '@/model'

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  entregado: 'Entregado',
  finalizado: 'Finalizado',
  cobrado: 'Cobrado',
  cancelado: 'Cancelado',
  archivado: 'Archivado',
}

export const STATUS_TONES: Record<ProjectStatus, 'default' | 'warning' | 'danger' | 'muted'> = {
  pendiente: 'warning',
  en_proceso: 'default',
  entregado: 'default',
  finalizado: 'muted',
  cobrado: 'muted',
  cancelado: 'danger',
  archivado: 'muted',
}

export const GROUP_LABELS: Record<StatusGroup, string> = {
  activos: 'Activos',
  finalizados: 'Finalizados',
  cancelados: 'Cancelados',
  archivados: 'Archivados',
  todos: 'Todos',
}

export const WORKSHOP_LABEL = 'Taller (fondo común)'
