import { describe, expect, it } from 'vitest'
import { isFramed } from './frameGuard'

describe('isFramed', () => {
  it('fuera de un marco, la app arranca', () => {
    const w = {}
    expect(isFramed({ self: w, top: w })).toBe(false)
  })

  it('dentro de un marco de otra página, no', () => {
    expect(isFramed({ self: {}, top: {} })).toBe(true)
  })

  it('si leer `top` lanza (otro origen), se considera enmarcada', () => {
    const win = {
      self: {},
      get top(): unknown {
        throw new Error('SecurityError')
      },
    }
    expect(isFramed(win)).toBe(true)
  })
})
