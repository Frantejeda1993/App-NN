import type { FixedStatus } from '@/domain/generalExpenses'

/** Enlace al formulario de movimiento con el gasto general ya elegido. */
export const payLink = (expenseId: string) => `/billetera/nuevo?tipo=gasto_general&gasto=${encodeURIComponent(expenseId)}`

export const FIXED_STATUS_LABELS: Record<FixedStatus, { label: string; tone: 'default' | 'warning' | 'danger' | 'muted' }> = {
  pagado: { label: 'Pagado este mes', tone: 'muted' },
  pendiente_pago: { label: 'Registrado, pendiente de pago', tone: 'warning' },
  vence: { label: 'Pendiente este mes', tone: 'danger' },
  proximo: { label: 'Próximo', tone: 'default' },
}
