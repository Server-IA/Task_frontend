import { useRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useInView } from './useInView'

function Card() {
  const ref = useRef(null)
  const visible = useInView(ref)
  return <div ref={ref}>{visible ? 'visible' : 'oculta'}</div>
}

describe('useInView', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('pasa a true cuando la tarjeta entra en pantalla, y no vuelve', () => {
    let notify
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback) {
          notify = callback
        }
        observe() {}
        disconnect = disconnect
      },
    )
    render(<Card />)
    expect(screen.getByText('oculta')).toBeInTheDocument()

    act(() => notify([{ isIntersecting: true }]))
    expect(screen.getByText('visible')).toBeInTheDocument()
    expect(disconnect).toHaveBeenCalled()
  })

  it('sin IntersectionObserver cuenta como visible', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Card />)
    expect(screen.getByText('visible')).toBeInTheDocument()
  })
})
