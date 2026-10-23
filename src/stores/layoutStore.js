import { create } from 'zustand'

/** Estado efímero del layout (no se guarda): sidebar abierta en móvil. */
export const useLayoutStore = create((set) => ({
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
}))
