import { createContext, useContext } from 'react'

export interface TourContextValue {
  /** Empieza el recorrido desde el primer paso. */
  start(): void
  active: boolean
}

export const TourContext = createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour debe usarse dentro de <TourProvider>')
  return ctx
}
