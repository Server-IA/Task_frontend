import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flash, useFlashStore } from './flash'

describe('marcas de animación', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    useFlashStore.setState({ settled: null, created: null, closedCycle: null })
  })

  it('una marca dura lo que se le pide y luego se quita', () => {
    flash('created', 'a', 1000)
    expect(useFlashStore.getState().created).toBe('a')
    vi.advanceTimersByTime(999)
    expect(useFlashStore.getState().created).toBe('a')
    vi.advanceTimersByTime(2)
    expect(useFlashStore.getState().created).toBeNull()
  })

  it('una marca nueva del mismo tipo reemplaza a la anterior y no la borra el reloj de la vieja', () => {
    flash('settled', 'a', 500)
    vi.advanceTimersByTime(300)
    flash('settled', 'b', 500)
    vi.advanceTimersByTime(300)
    expect(useFlashStore.getState().settled).toBe('b')
    vi.advanceTimersByTime(250)
    expect(useFlashStore.getState().settled).toBeNull()
  })

  it('cada tipo va por su cuenta', () => {
    flash('created', 'a', 1000)
    flash('closedCycle', 'c', 1000)
    expect(useFlashStore.getState()).toMatchObject({ created: 'a', closedCycle: 'c', settled: null })
  })
})
