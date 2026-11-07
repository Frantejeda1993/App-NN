import { describe, expect, it } from 'vitest'
import { contactAlerts, matchesSearch, normalizeText, whatsappLink } from './clients'

describe('whatsappLink', () => {
  it('agrega el prefijo de España a un número de 9 dígitos', () => {
    expect(whatsappLink('610 602 069')).toBe('https://wa.me/34610602069')
  })

  it('respeta un número con prefijo internacional', () => {
    expect(whatsappLink('+54 9 11 1234-5678')).toBe('https://wa.me/5491112345678')
    expect(whatsappLink('0034 610602069')).toBe('https://wa.me/34610602069')
  })

  it('devuelve null si no hay un número usable', () => {
    expect(whatsappLink('')).toBeNull()
    expect(whatsappLink('12345')).toBeNull()
  })

  it('no inventa +34 para 9 dígitos que no son un móvil/fijo español', () => {
    expect(whatsappLink('123456789')).toBeNull()
  })
})

describe('búsqueda', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(normalizeText('  Marína  BAÑO ')).toBe('marina bano')
  })

  it('busca en varios campos', () => {
    const c = { name: 'Raquel Montmeló', phone: '610602069', source: 'Wallapop', email: '' }
    expect(matchesSearch(c, 'montmelo')).toBe(true)
    expect(matchesSearch(c, 'walla')).toBe(true)
    expect(matchesSearch(c, '6106')).toBe(true)
    expect(matchesSearch(c, 'ikea')).toBe(false)
    expect(matchesSearch(c, '')).toBe(true)
  })

  it('el teléfono se busca solo si lo escrito es un número, con o sin +34', () => {
    const c = { name: 'Raquel', phone: '610602069', source: '', email: '' }
    expect(matchesSearch(c, '+34 610 60')).toBe(true)
    expect(matchesSearch(c, '0034610602069')).toBe(true)
    expect(matchesSearch(c, 'ana 610')).toBe(false)
  })
})

describe('contactAlerts', () => {
  const today = '2026-11-07'
  const base = { followUp: true, lastContactAt: null, nextContactAt: null }
  const clients = [
    { ...base, id: 'vencido', nextContactAt: '2026-11-05' },
    { ...base, id: 'hoy', nextContactAt: '2026-11-07' },
    { ...base, id: 'futuro', nextContactAt: '2026-11-20', lastContactAt: '2026-10-01' },
    { ...base, id: 'olvidado', lastContactAt: '2026-10-01' },
    { ...base, id: 'reciente', lastContactAt: '2026-11-01' },
    { ...base, id: 'sin-seguimiento', followUp: false, lastContactAt: '2026-01-01', nextContactAt: '2026-11-01' },
    { ...base, id: 'nunca', lastContactAt: null },
  ]

  it('separa vencidos/hoy de los que llevan mucho sin contacto', () => {
    const r = contactAlerts(clients, today, 14)
    expect(r.due.map((c) => c.id)).toEqual(['vencido', 'hoy'])
    expect(r.stale.map((c) => c.id)).toEqual(['olvidado'])
  })

  it('un cliente con próximo contacto agendado a futuro no cuenta como olvidado', () => {
    const r = contactAlerts(clients, today, 14)
    expect(r.stale.some((c) => c.id === 'futuro')).toBe(false)
  })

  it('ordena los vencidos del más antiguo al más nuevo', () => {
    const r = contactAlerts([clients[1], clients[0]], today, 14)
    expect(r.due.map((c) => c.id)).toEqual(['vencido', 'hoy'])
  })
})
