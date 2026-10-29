/** Solo enlaces http(s), mailto o rutas de la app; cualquier otra cosa («javascript:») queda como texto. */
export function safeHref(href = '') {
  if (href.startsWith('/') && !href.startsWith('//')) return href
  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : null
  } catch {
    return null
  }
}

/** Lo escrito en el campo «Enlace»: sin protocolo se asume https (www.ejemplo.com → https://www.ejemplo.com). */
export function normalizeHref(value = '') {
  const href = value.trim()
  if (!href) return ''
  if (/^(https?:|mailto:|\/)/i.test(href)) return href
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)) return `mailto:${href}`
  return `https://${href}`
}
