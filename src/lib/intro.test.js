import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { markAppShown, markFirstScreen, markSplash, peekAppIntro, peekIntro, requestAppIntro, resetIntro, splashElapsed } from './intro'

describe('entrada animada del login', () => {
  const originalAnimate = Element.prototype.animate

  beforeEach(() => {
    resetIntro()
    // jsdom no trae animaciones por script: aquí se simula un navegador que sí
    Element.prototype.animate = () => ({})
  })
  afterEach(() => {
    Element.prototype.animate = originalAnimate
    vi.restoreAllMocks()
  })

  it('le toca a la primera pantalla de la carga, y se puede consultar varias veces sin gastarla', () => {
    expect(peekIntro()).toEqual({ elapsed: 0 })
    expect(peekIntro()).toEqual({ elapsed: 0 })
  })

  it('después de mostrar una pantalla, las siguientes no la llevan', () => {
    markFirstScreen()
    expect(peekIntro()).toBeNull()
  })

  it('cuenta lo que lleva el logo de carga a la vista desde la primera vez que apareció', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(1000)
    markSplash()
    clock.mockReturnValue(1400)
    markSplash()
    expect(splashElapsed()).toBe(400)
    expect(peekIntro()).toEqual({ elapsed: 400 })
  })

  it('sin animaciones por script o con «menos movimiento» no hay entrada', () => {
    Element.prototype.animate = undefined
    expect(peekIntro()).toBeNull()
    Element.prototype.animate = () => ({})
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true })
    expect(peekIntro()).toBeNull()
  })

  it('la app entra animada al abrirla con el logo de carga a la vista y después de cada inicio de sesión', () => {
    // Sin logo de carga ni inicio de sesión, la app aparece sin más
    expect(peekAppIntro()).toBe(false)
    markSplash()
    expect(peekAppIntro()).toBe(true)
    markAppShown()
    expect(peekAppIntro()).toBe(false)
    // Cerrar sesión y volver a entrar la pide otra vez
    requestAppIntro()
    expect(peekAppIntro()).toBe(true)
    markAppShown()
    expect(peekAppIntro()).toBe(false)
  })
})
