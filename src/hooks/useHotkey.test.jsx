import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useHotkey } from './useHotkey'

function Shortcut({ onPress }) {
  useHotkey('m', onPress)
  return (
    <>
      <button type="button">fuera</button>
      <div role="menu" data-state="open">
        <div role="menuitem" tabIndex={-1}>
          Módulos
        </div>
      </div>
      <button type="button" role="combobox" aria-expanded="false">
        select
      </button>
    </>
  )
}

describe('useHotkey', () => {
  it('fuera de menús y campos, la letra dispara el atajo', () => {
    const onPress = vi.fn()
    const { getByText } = render(<Shortcut onPress={onPress} />)
    // Sin menús abiertos
    getByText('Módulos').parentElement.removeAttribute('data-state')
    fireEvent.keyDown(getByText('fuera'), { key: 'm' })
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('dentro de un menú o un select de Radix la letra es para buscar una opción', () => {
    const onPress = vi.fn()
    const { getByText } = render(<Shortcut onPress={onPress} />)
    fireEvent.keyDown(getByText('Módulos'), { key: 'm' })
    fireEvent.keyDown(getByText('select'), { key: 'm' })
    // Con un menú abierto, aunque el foco esté en otro lado
    fireEvent.keyDown(getByText('fuera'), { key: 'm' })
    expect(onPress).not.toHaveBeenCalled()
  })

  it('si otro ya atendió la tecla (preventDefault), no se repite', () => {
    const onPress = vi.fn()
    const { getByText } = render(<Shortcut onPress={onPress} />)
    getByText('Módulos').parentElement.removeAttribute('data-state')
    const button = getByText('fuera')
    button.addEventListener('keydown', (event) => event.preventDefault())
    fireEvent.keyDown(button, { key: 'm' })
    expect(onPress).not.toHaveBeenCalled()
  })
})
