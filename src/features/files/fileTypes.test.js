import { describe, expect, it } from 'vitest'
import { formatSize, isImageFile, MB, pastedName, validateFile } from './fileTypes'

const file = (name, size, type = '') => ({ name, size, type })

describe('tipos de archivo', () => {
  it('acepta los permitidos con su tipo canónico', () => {
    expect(validateFile(file('foto.JPG', 100, 'image/jpeg'))).toEqual({ ok: true, contentType: 'image/jpeg', group: 'image' })
    expect(validateFile(file('export.csv', 100, 'application/vnd.ms-excel')).contentType).toBe('text/csv')
    expect(validateFile(file('notas.md', 100, '')).contentType).toBe('text/markdown')
    expect(validateFile(file('iconos.zip', 100, 'application/x-zip-compressed')).contentType).toBe('application/zip')
  })

  it('rechaza ejecutables, HTML, SVG y tipos que no coinciden', () => {
    for (const name of ['setup.exe', 'pagina.html', 'logo.svg', 'script.sh', 'run.bat', 'sin-extension']) {
      expect(validateFile(file(name, 100, 'application/octet-stream'))).toEqual({ ok: false, error: 'Este tipo de archivo no se puede adjuntar.' })
    }
    expect(validateFile(file('foto.png', 100, 'text/html')).error).toBe('El tipo del archivo no coincide con su extensión.')
  })

  it('imágenes hasta 5 MB y lo demás hasta 10 MB', () => {
    expect(validateFile(file('a.png', 5 * MB, 'image/png')).ok).toBe(true)
    expect(validateFile(file('a.png', 7.2 * MB, 'image/png')).error).toBe('La imagen pesa 7,2 MB y el límite es 5 MB.')
    expect(validateFile(file('a.pdf', 10 * MB, 'application/pdf')).ok).toBe(true)
    expect(validateFile(file('a.mov.zip', 38 * MB, 'application/zip')).error).toBe('Pesa 38 MB y el límite es 10 MB. Súbelo comprimido o pega un enlace.')
    expect(validateFile(file('vacio.txt', 0, 'text/plain')).error).toBe('El archivo está vacío.')
  })

  it('en un texto solo imágenes', () => {
    expect(validateFile(file('a.pdf', 10, 'application/pdf'), { imagesOnly: true }).error).toBe('Solo se pueden pegar imágenes PNG, JPG, GIF o WebP.')
    expect(validateFile(file('a.webp', 10, 'image/webp'), { imagesOnly: true }).ok).toBe(true)
    expect(isImageFile(file('image.png', 1, 'image/png'))).toBe(true)
    expect(isImageFile(file('logo.svg', 1, 'image/svg+xml'))).toBe(false)
  })

  it('tamaños como en la interfaz', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(86 * 1024)).toBe('86 KB')
    expect(formatSize(2.4 * MB)).toBe('2,4 MB')
    expect(formatSize(38 * MB)).toBe('38 MB')
    expect(formatSize(2048 * MB)).toBe('2 GB')
    expect(formatSize(1.2 * 1024 * MB)).toBe('1,2 GB')
  })

  it('las capturas pegadas sin nombre se llaman captura-fecha-hora', () => {
    const now = new Date(2026, 9, 30, 10, 42)
    expect(pastedName(new File(['x'], 'image.png', { type: 'image/png' }), now)).toBe('captura-2026-10-30-1042.png')
    expect(pastedName(new File(['x'], 'image.jpeg', { type: 'image/jpeg' }), now)).toBe('captura-2026-10-30-1042.jpeg')
    expect(pastedName(new File(['x'], '', { type: 'image/webp' }), now)).toBe('captura-2026-10-30-1042.webp')
    expect(pastedName(new File(['x'], 'mockup-perfil.png', { type: 'image/png' }), now)).toBe('mockup-perfil.png')
  })
})
