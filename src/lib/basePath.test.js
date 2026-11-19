import { appPath, appUrl } from './basePath'

describe('appPath', () => {
  it('quita la subruta de la app', () => {
    expect(appPath('/taskflow/equipo/projects', '/taskflow')).toBe('/equipo/projects')
    expect(appPath('/taskflow', '/taskflow')).toBe('/')
    expect(appPath('/taskflow/', '/taskflow')).toBe('/')
  })

  it('no confunde otra ruta que empieza igual', () => {
    expect(appPath('/taskflowx/equipo', '/taskflow')).toBe('/taskflowx/equipo')
  })

  it('sin subruta deja la ruta como está', () => {
    expect(appPath('/equipo/projects', '')).toBe('/equipo/projects')
  })
})

describe('appUrl', () => {
  it('arma la dirección completa con el origen del navegador', () => {
    expect(appUrl('/equipo/projects/1')).toBe(`${window.location.origin}/equipo/projects/1`)
  })
})
