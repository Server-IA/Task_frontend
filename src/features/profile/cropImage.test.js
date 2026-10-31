import { describe, expect, it, vi } from 'vitest'
import {
  AVATAR_SIZE,
  AVATAR_TYPE_ERROR,
  avatarFile,
  clampOffset,
  cropRect,
  maxOffset,
  renderCrop,
  validateAvatarFile,
  zoomOffset,
} from './cropImage'

const FRAME = 260

/** Compara números con tolerancia (las escalas no son exactas en coma flotante). */
const close = (actual, expected) => {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort())
  for (const key of Object.keys(expected)) expect(actual[key]).toBeCloseTo(expected[key], 6)
}

describe('cropRect', () => {
  it('con zoom 1 y sin mover toma el cuadrado central del lado más corto', () => {
    close(cropRect({ width: 3024, height: 4032 }, { frame: FRAME }), { sx: 0, sy: 504, size: 3024 })
    close(cropRect({ width: 1600, height: 900 }, { frame: FRAME }), { sx: 350, sy: 0, size: 900 })
    close(cropRect({ width: 800, height: 800 }, { frame: FRAME }), { sx: 0, sy: 0, size: 800 })
  })

  it('el zoom achica el cuadrado alrededor del centro', () => {
    const rect = cropRect({ width: 1000, height: 1000 }, { frame: FRAME, zoom: 2 })
    close(rect, { sx: 250, sy: 250, size: 500 })
  })

  it('mover la imagen a la derecha y abajo muestra lo de la izquierda y arriba', () => {
    // 1000 px de la original en 260 px de pantalla con zoom 2: 1 px de pantalla = 500 / 260 px de la original
    const rect = cropRect({ width: 1000, height: 1000 }, { frame: FRAME, zoom: 2, offset: { x: 52, y: 26 } })
    expect(rect.size).toBeCloseTo(500)
    expect(rect.sx).toBeCloseTo(250 - 100)
    expect(rect.sy).toBeCloseTo(250 - 50)
  })

  it('nunca se sale de la imagen aunque se arrastre de más', () => {
    const size = { width: 3024, height: 4032 }
    const far = cropRect(size, { frame: FRAME, zoom: 1.4, offset: { x: 5000, y: -5000 } })
    expect(far.sx).toBe(0)
    expect(far.sy).toBeCloseTo(4032 - far.size)
    expect(far.size).toBeCloseTo(3024 / 1.4)
    const other = cropRect(size, { frame: FRAME, zoom: 1.4, offset: { x: -5000, y: 5000 } })
    expect(other.sx).toBeCloseTo(3024 - other.size)
    expect(other.sy).toBe(0)
  })

  it('en una imagen apaisada con zoom 1 solo se mueve a lo ancho', () => {
    const size = { width: 1600, height: 900 }
    const rect = cropRect(size, { frame: FRAME, offset: { x: -10_000, y: 300 } })
    close(rect, { sx: 700, sy: 0, size: 900 })
  })

  it('el zoom se limita entre 100 % y 300 %', () => {
    const size = { width: 900, height: 900 }
    expect(cropRect(size, { frame: FRAME, zoom: 0.2 }).size).toBeCloseTo(900)
    expect(cropRect(size, { frame: FRAME, zoom: 10 }).size).toBeCloseTo(300)
  })
})

describe('desplazamiento', () => {
  it('maxOffset: cuánto sobra de la imagen a cada lado del marco', () => {
    close(maxOffset({ width: 1000, height: 500 }, { zoom: 1, frame: 100 }), { x: 50, y: 0 })
    close(maxOffset({ width: 1000, height: 500 }, { zoom: 2, frame: 100 }), { x: 150, y: 50 })
  })

  it('clampOffset lo deja dentro de lo permitido', () => {
    const size = { width: 1000, height: 500 }
    close(clampOffset(size, { zoom: 1, frame: 100, offset: { x: 80, y: -20 } }), { x: 50, y: 0 })
    close(clampOffset(size, { zoom: 2, frame: 100, offset: { x: -10, y: 20 } }), { x: -10, y: 20 })
  })

  it('al cambiar el zoom el mismo punto queda en el centro (y al alejar se vuelve a limitar)', () => {
    const size = { width: 1000, height: 1000 }
    close(zoomOffset(size, { frame: 100, offset: { x: 20, y: -10 }, from: 2, to: 3 }), { x: 30, y: -15 })
    close(zoomOffset(size, { frame: 100, offset: { x: 50, y: 0 }, from: 2, to: 1 }), { x: 0, y: 0 })
  })
})

/** Un lienzo de mentira: jsdom no dibuja. */
function fakeCanvas({ types = ['image/webp'] } = {}) {
  const context = { drawImage: vi.fn(), imageSmoothingEnabled: false, imageSmoothingQuality: 'low' }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback, type) => {
      // Un navegador sin WebP devuelve PNG aunque se le pida WebP
      const produced = types.includes(type) ? type : 'image/png'
      callback(new Blob(['x'], { type: produced }))
    }),
  }
  const createCanvas = vi.fn((width, height) => Object.assign(canvas, { width, height }))
  return { canvas, context, createCanvas }
}

describe('renderCrop', () => {
  const source = { tag: 'imagen' }
  const rect = { sx: 120, sy: 504, size: 2160 }

  it('dibuja el recorte en 512 × 512 y lo devuelve como WebP', async () => {
    const { canvas, context, createCanvas } = fakeCanvas()
    const blob = await renderCrop(source, rect, { createCanvas })

    expect(createCanvas).toHaveBeenCalledWith(AVATAR_SIZE, AVATAR_SIZE)
    expect(canvas.width).toBe(512)
    expect(canvas.height).toBe(512)
    expect(context.imageSmoothingQuality).toBe('high')
    expect(context.drawImage).toHaveBeenCalledWith(source, 120, 504, 2160, 2160, 0, 0, 512, 512)
    expect(canvas.toBlob).toHaveBeenCalledTimes(1)
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9)
    expect(blob.type).toBe('image/webp')
  })

  it('si el navegador no codifica WebP se queda con PNG', async () => {
    const { createCanvas } = fakeCanvas({ types: ['image/png'] })
    const blob = await renderCrop(source, rect, { createCanvas })
    expect(blob.type).toBe('image/png')
  })

  it('si el lienzo no devuelve nada en WebP lo pide en PNG', async () => {
    const { canvas, createCanvas } = fakeCanvas()
    canvas.toBlob.mockImplementationOnce((callback) => callback(null))
    const blob = await renderCrop(source, rect, { createCanvas })
    expect(canvas.toBlob).toHaveBeenLastCalledWith(expect.any(Function), 'image/png', undefined)
    expect(blob.type).toBe('image/png')
  })

  it('avatarFile nombra el archivo según el formato', () => {
    expect(avatarFile(new Blob(['x'], { type: 'image/webp' }))).toMatchObject({ name: 'avatar.webp', type: 'image/webp' })
    expect(avatarFile(new Blob(['x'], { type: 'image/png' }))).toMatchObject({ name: 'avatar.png', type: 'image/png' })
  })
})

describe('validateAvatarFile', () => {
  const file = (name, type, size = 1000) => ({ name, type, size })

  it('acepta PNG, JPG y WebP de hasta 5 MB', () => {
    expect(validateAvatarFile(file('yo.png', 'image/png'))).toEqual({ ok: true })
    expect(validateAvatarFile(file('yo.JPG', 'image/jpeg'))).toEqual({ ok: true })
    expect(validateAvatarFile(file('yo.webp', 'image/webp', 5 * 1024 * 1024))).toEqual({ ok: true })
  })

  it('rechaza GIF y lo que no es imagen', () => {
    expect(validateAvatarFile(file('yo.gif', 'image/gif'))).toEqual({ ok: false, error: AVATAR_TYPE_ERROR })
    expect(validateAvatarFile(file('cv.pdf', 'application/pdf'))).toEqual({ ok: false, error: AVATAR_TYPE_ERROR })
  })

  it('rechaza las de más de 5 MB diciendo cuánto pesan', () => {
    expect(validateAvatarFile(file('yo.jpg', 'image/jpeg', 7.2 * 1024 * 1024))).toEqual({
      ok: false,
      error: 'La imagen pesa 7,2 MB y el límite es 5 MB.',
    })
  })
})
