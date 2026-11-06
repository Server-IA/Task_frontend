import { onlineManager } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OfflineBanner } from './OfflineBanner'

afterEach(() => act(() => onlineManager.setOnline(true)))

describe('OfflineBanner', () => {
  it('avisa mientras no hay conexión y se va al volver', () => {
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toHaveTextContent('')

    act(() => onlineManager.setOnline(false))
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión.')

    act(() => onlineManager.setOnline(true))
    expect(screen.getByRole('status')).not.toHaveTextContent('Sin conexión')
  })
})
