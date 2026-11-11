import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INTRO,
  markAppShown,
  markFirstScreen,
  markLoginIntroShown,
  markSplash,
  peekAppIntro,
  peekIntro,
  playLogoutOutro,
  requestAppIntro,
  resetIntro,
  splashElapsed,
} from './intro'

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
    expect(peekIntro()).toEqual({ elapsed: 0, fromLogout: false })
    expect(peekIntro()).toEqual({ elapsed: 0, fromLogout: false })
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
    expect(peekIntro()).toEqual({ elapsed: 400, fromLogout: false })
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

  it('al cerrar sesión la app sale primero y el login que llega entra animado, con el logo ya dibujado', async () => {
    vi.useFakeTimers()
    markFirstScreen()
    const shell = document.createElement('div')
    shell.setAttribute('data-app-shell', '')
    document.body.append(shell)
    const start = vi.fn()

    let done = false
    const outro = playLogoutOutro(start).then(() => {
      done = true
    })
    expect(start).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(INTRO.out - 10)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(20)
    await outro
    expect(done).toBe(true)

    // Aunque ya se mostraron otras pantallas, este login sí entra animado; después, como siempre
    expect(peekIntro()).toEqual({ elapsed: INTRO.draw, fromLogout: true })
    markLoginIntroShown()
    expect(peekIntro()).toBeNull()
    shell.remove()
    vi.useRealTimers()
  })

  it('sin la app a la vista no hay salida: se cierra sesión de una vez', async () => {
    const start = vi.fn()
    await playLogoutOutro(start)
    expect(start).not.toHaveBeenCalled()
    markFirstScreen()
    expect(peekIntro()).toBeNull()
  })
})
