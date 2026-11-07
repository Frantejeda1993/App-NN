/**
 * Dinero en céntimos de euro (enteros). Nunca se guardan ni se suman floats.
 */

/** Redondeo a entero de `value * factor` sin errores de coma flotante, simétrico (lejos de 0). */
export function scaleRound(value: number, factor: number): number {
  if (!Number.isFinite(value)) throw new Error(`Número inválido: ${value}`)
  // toFixed evita 1234.565 → 123456.49999 → 123456.
  const scaled = Number((Math.abs(value) * factor).toFixed(4))
  const r = Math.round(scaled)
  return r === 0 ? 0 : Math.sign(value) * r
}

export function eurosToCents(euros: number): number {
  return scaleRound(euros, 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

const eurFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEuros(cents: number): string {
  return eurFormatter.format(cents / 100)
}

/**
 * Interpreta lo que escribe el usuario. Acepta "1.234,56", "1234,56", "1234.56",
 * "1.234" (miles) y "7,5 €". Devuelve céntimos o null si no es un importe válido.
 */
export function parseEuros(input: string): number | null {
  let s = input.replace(/€/g, '').replace(/\s/g, '')
  if (!s) return null

  let negative = false
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }

  let normalized: string
  if (s.includes(',')) {
    // Coma decimal; los puntos son separadores de miles.
    const [intPart, decPart, ...rest] = s.split(',')
    if (rest.length > 0 || decPart.length > 2) return null
    if (!/^[1-9]\d{0,2}(\.\d{3})+$|^\d+$/.test(intPart)) return null
    normalized = `${intPart.replace(/\./g, '')}.${decPart || '0'}`
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    // Un solo punto con 1-2 decimales: punto decimal ("1234.56").
    normalized = s
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$|^\d+$/.test(s)) {
    // Solo miles con punto ("1.234") o entero. "0.500" es ambiguo → inválido.
    normalized = s.replace(/\./g, '')
  } else {
    return null
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const cents = eurosToCents(Number(normalized))
  return negative && cents !== 0 ? -cents : cents
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => {
    if (!Number.isInteger(v)) throw new Error(`Importe no entero en céntimos: ${v}`)
    return acc + v
  }, 0)
}
