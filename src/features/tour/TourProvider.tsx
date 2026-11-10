import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useData, useMyEmail } from '@/data/DataProvider'
import { useMyPrefs } from '@/data/hooks'
import { TOUR_STEPS, TOUR_VERSION } from './steps'
import { TourContext } from './tourContext'
import { TourOverlay } from './TourOverlay'

/**
 * Tour de la app: arranca solo la primera vez que cada usuario entra (o cuando
 * cambia la versión del tour) y se puede repetir desde Ajustes. Al terminarlo o
 * saltarlo queda guardado en sus preferencias, en cualquier dispositivo.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const api = useData()
  const email = useMyEmail()
  const prefs = useMyPrefs(email)
  // idle: decide la preferencia guardada; manual: lo pidió el usuario; off: cerrado.
  const [mode, setMode] = useState<'idle' | 'manual' | 'off'>('idle')
  const [index, setIndex] = useState(0)

  const pending = prefs !== undefined && (prefs?.tourSeenVersion ?? 0) < TOUR_VERSION
  const active = mode === 'manual' || (mode === 'idle' && pending)

  const finish = useCallback(() => {
    setMode('off')
    setIndex(0)
    // Si no se pudiera guardar (sin conexión), solo se volvería a ofrecer.
    api.saveMyPrefs(email, { tourSeenVersion: TOUR_VERSION }).committed.catch(() => {})
  }, [api, email])

  const next = useCallback(() => (index + 1 >= TOUR_STEPS.length ? finish() : setIndex(index + 1)), [index, finish])
  const back = useCallback(() => setIndex(Math.max(0, index - 1)), [index])

  const value = useMemo(
    () => ({
      active,
      start: () => {
        setIndex(0)
        setMode('manual')
      },
    }),
    [active],
  )

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <TourOverlay
          key={TOUR_STEPS[index].id}
          step={TOUR_STEPS[index]}
          index={index}
          total={TOUR_STEPS.length}
          onNext={next}
          onBack={back}
          onClose={finish}
        />
      )}
    </TourContext.Provider>
  )
}
