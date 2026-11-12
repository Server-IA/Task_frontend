import { create } from 'zustand'

/** Estado efímero del layout (no se guarda): sidebar abierta en móvil y paleta de comandos (Ctrl/⌘ K). */
export const useLayoutStore = create((set) => ({
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),

  commandOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),

  /** Se acaba de iniciar sesión y el login está saliendo (se desvanece y su logo va al centro). */
  enteringApp: false,
  setEnteringApp: (enteringApp) => set({ enteringApp }),

  /** La app está saliendo (animación de cerrar sesión): el layout tapa todo con el logo. */
  leaving: false,
  setLeaving: (leaving) => set({ leaving }),
}))
