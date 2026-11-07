import type { CONTACT_CHANNELS } from '@/model'

export const CHANNEL_LABELS: Record<(typeof CONTACT_CHANNELS)[number], string> = {
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  email: 'Email',
  presencial: 'Presencial',
  otro: 'Otro',
}
