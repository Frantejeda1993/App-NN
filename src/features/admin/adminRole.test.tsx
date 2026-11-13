import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemberDataSchema } from '@/model'
import { FakeDataApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

describe('rol de administrador: esquema', () => {
  it('sin role es socio (los documentos existentes no cambian)', () => {
    expect(MemberDataSchema.parse({ name: 'Nacho', active: true }).role).toBe('socio')
  })

  it('acepta "admin" y rechaza cualquier otro rol', () => {
    expect(MemberDataSchema.parse({ name: 'Ana', active: true, role: 'admin' }).role).toBe('admin')
    expect(MemberDataSchema.safeParse({ name: 'Ana', active: true, role: 'superuser' }).success).toBe(false)
  })
})

describe('el administrador no es socio', () => {
  function withAdmin() {
    const api = new FakeDataApi()
    api.seedAdmin('admin@gmail.com', 'Ana Admin')
    const client = api.seedClient({ name: 'Raquel' })
    return { api, client }
  }

  it('no aparece en la participación de un proyecto nuevo ni se le reparte nada', async () => {
    const { api, client } = withAdmin()
    renderApp(`/proyectos/nuevo?cliente=${client.id}`, api)

    expect(await screen.findByLabelText('Nacho')).toHaveValue('50')
    expect(screen.getByLabelText('Nahuel')).toHaveValue('50')
    expect(screen.queryByLabelText('Ana Admin')).not.toBeInTheDocument()
  })

  it('no aparece en el reparto por defecto de Ajustes', async () => {
    const { api } = withAdmin()
    renderApp('/ajustes', api)

    expect(await screen.findByLabelText('Nacho')).toBeInTheDocument()
    expect(screen.queryByLabelText('Ana Admin')).not.toBeInTheDocument()
  })
})
