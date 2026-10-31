import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filesApi } from '@/features/files/api'
import { useSessionStore } from '@/stores/sessionStore'
import { UserAvatar } from './UserAvatar'

vi.mock('@/features/files/api', () => ({ filesApi: { urls: vi.fn() } }))

const FILE_ID = '0b7c6a52-4f7e-4d8e-9a43-5f1d2c3b4a59'
const ana = (avatarUrl) => ({ id: 'u1', fullName: 'Ana Pérez', email: 'ana@correo.com', avatarUrl })
const signed = (url) => ({ id: FILE_ID, url, expiresAt: new Date(Date.now() + 3600_000).toISOString(), fileName: 'avatar.webp', contentType: 'image/webp', size: 1000, image: true })

/** jsdom no carga imágenes: estas «cargan» al instante, salvo las URL que se marquen como rotas. */
const broken = new Set()
const OriginalImage = window.Image
class FakeImage extends EventTarget {
  set src(value) {
    this._src = value
    this.complete = true
    this.naturalWidth = broken.has(value) ? 0 : 64
  }
  get src() {
    return this._src
  }
}

function renderAvatar(user, size) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <UserAvatar user={user} size={size} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.Image = FakeImage
  broken.clear()
  filesApi.urls.mockReset()
  useSessionStore.setState({ accessToken: 'token', status: 'authenticated' })
})

afterEach(() => {
  window.Image = OriginalImage
  useSessionStore.setState({ accessToken: null, status: 'anonymous' })
})

describe('UserAvatar', () => {
  it('una foto subida (/files/<id>) se muestra con su URL firmada', async () => {
    filesApi.urls.mockResolvedValue([signed('https://r2.example/avatar-1.webp?firma=1')])
    renderAvatar(ana(`/files/${FILE_ID}`))

    // Mientras llega la URL, las iniciales
    expect(screen.getByText('AP')).toBeInTheDocument()
    const image = await screen.findByRole('img', { name: 'Ana Pérez' })
    expect(image).toHaveAttribute('src', 'https://r2.example/avatar-1.webp?firma=1')
    expect(filesApi.urls).toHaveBeenCalledWith([FILE_ID], false)
    expect(screen.queryByText('AP')).not.toBeInTheDocument()
  })

  it('si la URL ya venció pide otra', async () => {
    broken.add('https://r2.example/vencida.webp')
    filesApi.urls
      .mockResolvedValueOnce([signed('https://r2.example/vencida.webp')])
      .mockResolvedValueOnce([signed('https://r2.example/nueva.webp')])
    renderAvatar(ana(`/files/${FILE_ID}`))

    const image = await screen.findByRole('img', { name: 'Ana Pérez' })
    expect(image).toHaveAttribute('src', 'https://r2.example/nueva.webp')
    expect(filesApi.urls).toHaveBeenCalledTimes(2)
  })

  it('si la foto no se puede ver quedan las iniciales', async () => {
    filesApi.urls.mockResolvedValue([])
    renderAvatar(ana(`/files/${FILE_ID}`))
    await waitFor(() => expect(filesApi.urls).toHaveBeenCalled())
    expect(screen.getByText('AP')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Ana Pérez' })).not.toBeInTheDocument()
  })

  it('sin sesión no pide nada y muestra las iniciales', () => {
    useSessionStore.setState({ accessToken: null, status: 'anonymous' })
    renderAvatar(ana(`/files/${FILE_ID}`))
    expect(screen.getByText('AP')).toBeInTheDocument()
    expect(filesApi.urls).not.toHaveBeenCalled()
  })

  it('una foto antigua (enlace) se usa tal cual', () => {
    renderAvatar(ana('https://fotos.example/ana.png'))
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveAttribute('src', 'https://fotos.example/ana.png')
    expect(filesApi.urls).not.toHaveBeenCalled()
  })

  it('las iniciales usan el tamaño del avatar (el text-sm del fallback las agrandaba y se cortaban en las pilas)', () => {
    renderAvatar(ana(null), 'sm')
    const fallback = screen.getByText('AP')
    expect(fallback).toHaveClass('text-[11px]')
    expect(fallback).not.toHaveClass('text-sm')
  })
})
