import { describe, expect, it } from 'vitest'
import { USUARIOS, verificarClave } from './usuarios'

const ENTORNO = { CLAVE_JHERRERA: 'clave-de-jherrera', CLAVE_JVARGAS: 'clave-de-jvargas' }

describe('verificarClave', () => {
  it('son exactamente dos cuentas, con el mismo poder', () => {
    expect(USUARIOS.map((cuenta) => cuenta.usuario)).toEqual(['jherrera', 'jvargas'])
  })

  it('acepta la clave que dice la variable de entorno de ese usuario', () => {
    expect(verificarClave('jherrera', 'clave-de-jherrera', ENTORNO)?.usuario).toBe('jherrera')
    expect(verificarClave('jvargas', 'clave-de-jvargas', ENTORNO)?.nombre).toBe('Joseph')
  })

  it('ignora mayúsculas y espacios en el usuario, pero no en la clave', () => {
    expect(verificarClave('  JVargas ', 'clave-de-jvargas', ENTORNO)?.usuario).toBe('jvargas')
    expect(verificarClave('jvargas', 'Clave-de-jvargas', ENTORNO)).toBeNull()
    expect(verificarClave('jvargas', 'clave-de-jvargas ', ENTORNO)).toBeNull()
  })

  it('rechaza la clave del otro usuario', () => {
    expect(verificarClave('jherrera', 'clave-de-jvargas', ENTORNO)).toBeNull()
  })

  it('rechaza un usuario que no existe', () => {
    expect(verificarClave('admin', 'clave-de-jherrera', ENTORNO)).toBeNull()
  })

  it('sin la variable de entorno nadie entra, ni siquiera con la clave vacía', () => {
    expect(verificarClave('jherrera', '', {})).toBeNull()
    expect(verificarClave('jherrera', 'cualquier-cosa', {})).toBeNull()
    expect(verificarClave('jherrera', '', { CLAVE_JHERRERA: '' })).toBeNull()
  })
})
