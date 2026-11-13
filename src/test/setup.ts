import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// findBy*/waitFor esperan 1 s por defecto: con la máquina cargada (suite completa
// en paralelo, CI) algunas pantallas tardan más en renderizar y el test falla sin
// que haya un error real.
configure({ asyncUtilTimeout: 4000 })

afterEach(() => {
  cleanup()
})
