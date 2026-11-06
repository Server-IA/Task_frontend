import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Preferencias de la interfaz que se guardan en el navegador.
 * La clave 'taskflow-preferences' también la lee index.html para aplicar el tema sin parpadeo.
 */
export const usePreferencesStore = create(
  persist(
    (set) => ({
      /** 'light' | 'dark' | 'system' */
      theme: 'system',
      sidebarCollapsed: false,
      /** Vista de issues: 'list' | 'board' */
      issuesView: 'list',
      /** Cómo se muestran y escriben los criterios de aceptación: 'gherkin' (Dado / cuando / entonces) | 'plain' */
      criteriaFormat: 'gherkin',
      lastWorkspaceSlug: null,
      /** Id del último workspace: si un project manager le cambia la URL (el slug), se sigue encontrando. */
      lastWorkspaceId: null,

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setIssuesView: (issuesView) => set({ issuesView }),
      setCriteriaFormat: (criteriaFormat) => set({ criteriaFormat }),
      /** Con null olvida el último workspace (slug e id). */
      setLastWorkspaceSlug: (lastWorkspaceSlug) =>
        set(lastWorkspaceSlug ? { lastWorkspaceSlug } : { lastWorkspaceSlug: null, lastWorkspaceId: null }),
      /** @param {{ slug: string, id: string }} workspace */
      setLastWorkspace: (workspace) => set({ lastWorkspaceSlug: workspace.slug, lastWorkspaceId: workspace.id ?? null }),
    }),
    { name: 'taskflow-preferences' },
  ),
)
