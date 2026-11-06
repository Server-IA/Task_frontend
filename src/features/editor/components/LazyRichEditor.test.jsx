import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LazyRichEditor } from './LazyRichEditor'

// El archivo del editor no llega (sin conexión, o una versión nueva publicada con la pestaña abierta)
vi.mock('../editor/RichEditor', () => {
  throw new TypeError('Failed to fetch dynamically imported module')
})
vi.mock('./MarkdownView', () => ({ MarkdownView: ({ markdown }) => <p>{markdown}</p> }))

describe('LazyRichEditor sin el archivo del editor', () => {
  it('muestra el texto y un aviso en su lugar, sin tirar la página entera', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <div>
        <h1>Nueva tarea</h1>
        <LazyRichEditor value="Pasos para reproducir" onChange={() => {}} />
      </div>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el editor')
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
    expect(screen.getByText('Pasos para reproducir')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nueva tarea' })).toBeInTheDocument()
  })
})
