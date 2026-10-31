import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { filesApi } from '@/features/files/api'
import { localPreview } from '@/features/files/fileRefs'
import { uploadQueue } from '@/features/files/uploadQueue'
import { ApiError } from '@/lib/errors'
import { useSessionStore } from '@/stores/sessionStore'
import { renderCrop } from './cropImage'
import { ProfilePage } from './ProfilePage'

const FILE_ID = '0b7c6a52-4f7e-4d8e-9a43-5f1d2c3b4a59'
let me = { id: 'u1', fullName: 'Ana Pérez', email: 'ana@correo.com', avatarUrl: null }

const changePassword = vi.fn()
const updateProfile = vi.fn()
vi.mock('@/features/auth/hooks', () => ({
  useMe: () => ({ data: me, isLoading: false }),
  useChangePassword: () => ({ mutate: changePassword, isPending: false }),
  useUpdateProfile: () => ({ mutate: updateProfile, isPending: false }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspaces: () => ({ data: [] }) }))
vi.mock('@/features/files/api', () => ({
  filesApi: { urls: vi.fn(async () => []), removeAvatar: vi.fn(), createAvatarUpload: vi.fn(), confirmAvatar: vi.fn() },
}))
vi.mock('./cropImage', async (importOriginal) => ({
  ...(await importOriginal()),
  // jsdom no carga ni dibuja imágenes
  loadImage: vi.fn(async () => ({ image: { tag: 'original' }, url: 'blob:original', width: 3024, height: 4032 })),
  renderCrop: vi.fn(async () => new Blob(['recorte'], { type: 'image/webp' })),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  me = { id: 'u1', fullName: 'Ana Pérez', email: 'ana@correo.com', avatarUrl: null }
  URL.createObjectURL = vi.fn(() => 'blob:recorte')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  useSessionStore.setState({ user: null })
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Cambiar contraseña', () => {
  it('tras un 429 el botón espera lo que indica Retry-After', async () => {
    const user = userEvent.setup()
    changePassword.mockImplementation((_body, { onError }) =>
      onError(new ApiError({ status: 429, message: 'Demasiados intentos', retryAfter: 30 })),
    )
    renderPage()

    await user.type(screen.getByLabelText('Contraseña actual'), 'vieja1234')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva1234')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva1234')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(toast.warning).toHaveBeenCalledWith('Demasiados intentos', expect.anything())
    expect(await screen.findByRole('button', { name: 'Espera 30 s' })).toBeDisabled()
  })

  it('el botón usa el estilo primario (crema), como los demás botones principales', () => {
    renderPage()
    const button = screen.getByRole('button', { name: 'Cambiar contraseña' })
    expect(button).toHaveAttribute('data-variant', 'default')
    expect(button).toHaveClass('bg-primary')
    expect(button).not.toHaveClass('bg-foreground')
  })
})

describe('Datos personales', () => {
  it('ya no tiene el campo de URL del avatar y solo manda el nombre', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(screen.queryByLabelText('URL del avatar')).not.toBeInTheDocument()

    const name = screen.getByLabelText('Nombre completo')
    await user.clear(name)
    await user.type(name, 'Ana María Pérez')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateProfile).toHaveBeenCalledWith({ fullName: 'Ana María Pérez' }, expect.anything())
  })
})

describe('Foto de perfil', () => {
  const photo = (name, type, size = 2048) => {
    const file = new File(['x'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  it('sin foto ofrece «Subir foto» y no «Quitar foto»', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: 'Subir foto' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).not.toBeInTheDocument()
    expect(screen.getByText('PNG, JPG o WebP · hasta 5 MB · se recorta en cuadrado')).toBeInTheDocument()
  })

  it('rechaza lo que no es PNG, JPG o WebP y lo que pesa más de 5 MB', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage()
    const input = screen.getByTestId('avatar-input')
    expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp')

    await user.upload(input, photo('animada.gif', 'image/gif'))
    expect(screen.getByRole('alert')).toHaveTextContent('Solo se aceptan fotos PNG, JPG o WebP.')

    await user.upload(input, photo('enorme.jpg', 'image/jpeg', 6 * 1024 * 1024))
    expect(screen.getByRole('alert')).toHaveTextContent('La imagen pesa 6 MB y el límite es 5 MB.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('recorta la foto, la sube por la cola y actualiza la sesión al confirmarse', async () => {
    const user = userEvent.setup()
    const add = vi.spyOn(uploadQueue, 'add').mockReturnValue('upload-1')
    renderPage()

    await user.upload(screen.getByTestId('avatar-input'), photo('foto-ana.jpg', 'image/jpeg', 3.4 * 1024 * 1024))
    const dialog = await screen.findByRole('dialog', { name: 'Ajusta tu foto' })
    expect(await within(dialog).findByText('foto-ana.jpg · 3,4 MB · 3024 × 4032')).toBeInTheDocument()
    expect(within(dialog).getByRole('slider', { name: 'Zoom' })).toHaveValue('100')

    await user.click(within(dialog).getByRole('button', { name: 'Guardar foto' }))

    // El recorte central de la original (3024 × 4032 → cuadrado de 3024)
    expect(renderCrop).toHaveBeenCalledWith({ tag: 'original' }, expect.objectContaining({ sx: 0 }))
    expect(renderCrop.mock.calls[0][1].size).toBeCloseTo(3024)
    expect(renderCrop.mock.calls[0][1].sy).toBeCloseTo(504)
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(add).toHaveBeenCalledTimes(1)
    const [file, options] = add.mock.calls[0]
    expect(file).toMatchObject({ name: 'avatar.webp', type: 'image/webp' })
    expect(options).toMatchObject({ scope: 'avatar', contentType: 'image/webp', meta: { previewUrl: 'blob:recorte' } })

    // Al confirmarse: la vista previa queda recordada y la sesión tiene la foto nueva
    const saved = { ...me, avatarUrl: `/files/${FILE_ID}` }
    options.target.onDone(saved)
    expect(localPreview(FILE_ID)).toBe('blob:recorte')
    expect(useSessionStore.getState().user).toEqual(saved)

    // Y pide la subida al endpoint de la foto de perfil
    filesApi.createAvatarUpload.mockResolvedValue({})
    await options.target.create({ contentType: 'image/webp', size: 7 })
    expect(filesApi.createAvatarUpload).toHaveBeenCalledWith({ contentType: 'image/webp', size: 7 })
  })

  it('«Quitar foto» vuelve a las iniciales', async () => {
    const user = userEvent.setup()
    me = { ...me, avatarUrl: `/files/${FILE_ID}` }
    const withoutPhoto = { ...me, avatarUrl: null }
    filesApi.removeAvatar.mockResolvedValue(withoutPhoto)
    renderPage()

    expect(screen.getAllByRole('button', { name: 'Cambiar foto' }).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))

    expect(filesApi.removeAvatar).toHaveBeenCalled()
    await vi.waitFor(() => expect(useSessionStore.getState().user).toEqual(withoutPhoto))
    expect(toast.success).toHaveBeenCalledWith('Foto quitada', expect.anything())
  })
})
