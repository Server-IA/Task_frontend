import '@testing-library/jest-dom/vitest'

// jsdom no implementa matchMedia (lo usa el selector de tema)
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

// El tiempo real abre una conexión al montarse con sesión: en las pruebas de pantallas no hay servidor. Sus propias
// pruebas lo cargan de verdad con vi.importActual
vi.mock('@/features/realtime/RealtimeSync', () => ({ RealtimeSync: () => null }))
