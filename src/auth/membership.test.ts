import { describe, expect, it } from 'vitest'
import { isActiveMember, memberKey } from './membership'

describe('memberKey', () => {
  it('normaliza el email a minúsculas y sin espacios', () => {
    expect(memberKey('  Fran.Tejeda@Gmail.com ')).toBe('fran.tejeda@gmail.com')
  })
})

describe('isActiveMember', () => {
  it('rechaza cuando no existe el documento', () => {
    expect(isActiveMember(undefined)).toBe(false)
  })

  it('rechaza un socio desactivado', () => {
    expect(isActiveMember({ name: 'Nacho', active: false })).toBe(false)
  })

  it('rechaza un documento sin el campo active', () => {
    expect(isActiveMember({ name: 'Nacho' })).toBe(false)
  })

  it('acepta un socio activo', () => {
    expect(isActiveMember({ name: 'Nacho', active: true })).toBe(true)
  })
})
