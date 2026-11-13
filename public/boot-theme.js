// Aplica el tema antes del primer render para evitar el parpadeo. Va como archivo aparte (no en línea en index.html)
// para que la Content-Security-Policy solo permita scripts de la propia app.
try {
  const stored = JSON.parse(localStorage.getItem('taskflow-preferences') || '{}')
  const theme = stored.state?.theme ?? 'system'
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
} catch {
  // Sin almacenamiento: tema claro hasta que cargue la app
}
