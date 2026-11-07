import { toast } from 'sonner'
import type { WriteResult } from '@/data/repo'

function describeError(e: unknown): string {
  const code = (e as { code?: string }).code
  if (code === 'permission-denied') {
    return 'no tenés permiso o los datos cambiaron mientras editabas. Recargá e intentá de nuevo.'
  }
  return e instanceof Error ? e.message : 'error desconocido'
}

/**
 * Avisa al instante (la escritura ya está en la caché local) y, si el servidor
 * después la rechaza, muestra el error.
 */
export function notifyWrite(result: WriteResult, okMessage: string) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  toast.success(offline ? `${okMessage} (sin conexión: se sincroniza al volver)` : okMessage)
  result.committed.catch((e) => toast.error(`No se pudo guardar: ${describeError(e)}`))
}

/** Para errores de validación o lógicos antes de escribir. */
export function notifyError(e: unknown) {
  toast.error(describeError(e))
}
