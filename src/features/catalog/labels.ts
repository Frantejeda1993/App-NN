import type { HARDWARE_KINDS, HARDWARE_UNITS } from '@/model'

export const HARDWARE_KIND_LABELS: Record<(typeof HARDWARE_KINDS)[number], string> = {
  bisagra: 'Bisagra',
  guia: 'Guía / cajón',
  tip_on: 'Tip-on / push',
  tirador: 'Tirador',
  led: 'LED',
  perfil: 'Perfil',
  zocalo: 'Zócalo',
  otro: 'Otro',
}

export const HARDWARE_UNIT_LABELS: Record<(typeof HARDWARE_UNITS)[number], string> = {
  u: 'unidad',
  par: 'par / juego',
  ml: 'metro lineal',
}
