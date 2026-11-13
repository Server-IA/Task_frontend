// Tras una recarga hecha a propósito (cambiar de idioma) la página empieza con el logo de carga ya puesto, en el mismo
// lugar donde lo pinta la app: así no hay un salto en blanco mientras carga. La app lo reemplaza al montar. Va como
// archivo aparte (no en línea en index.html) para que la Content-Security-Policy solo permita scripts de la app.
try {
  if (sessionStorage.getItem('taskflow-splash') === '1') {
    const dark = document.documentElement.classList.contains('dark')
    document.getElementById('root').innerHTML =
      '<div aria-hidden="true" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center">' +
      '<svg viewBox="0 0 32 32" width="112" height="112">' +
      '<rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="' +
      (dark ? '#38332b' : '#23201B') +
      '" stroke="' +
      (dark ? '#5a5246' : 'none') +
      '"/>' +
      '<path d="M8.5 16.5l5 5L23.5 11 M17.5 11h6v6" fill="none" stroke="#EAD9B0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
  }
} catch {
  // Sin almacenamiento: la app pinta su propio logo de carga
}
