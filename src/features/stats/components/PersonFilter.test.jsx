import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PersonFilter } from './PersonFilter'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
})

const ana = { id: 'ana', fullName: 'Ana', email: 'ana@test.com' }
const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez', email: 'luis@test.com' }

describe('PersonFilter («+ persona»)', () => {
  it('agrega una persona desde la lista de miembros', async () => {
    const onChange = vi.fn()
    render(<PersonFilter users={[ana, luis]} selected={[ana]} onChange={onChange} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '+ persona' }))
    await user.click(await screen.findByRole('option', { name: /Luis Muñoz Pérez/ }))
    expect(onChange).toHaveBeenCalledWith(['ana', 'luis'])
  })

  it('cada persona elegida se quita con su ×', async () => {
    const onChange = vi.fn()
    render(<PersonFilter users={[ana, luis]} selected={[ana, luis]} onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Quitar a Ana' }))
    expect(onChange).toHaveBeenCalledWith(['luis'])
  })
})
