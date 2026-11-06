import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { forgetQueries } from '@/api/forgetQueries'
import { queryKeys } from '@/api/queryKeys'
import { isManager } from '@/lib/permissions'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { invitationsApi, workspacesApi } from './api'

export function useWorkspaces() {
  return useQuery({ queryKey: queryKeys.workspaces, queryFn: workspacesApi.list })
}

/**
 * El último workspace abierto entre los del usuario: por su slug o, si un project manager le cambió la URL, por su
 * id; si ya no es miembro (o nunca abrió uno), el primero. null sin workspaces.
 * @param {import('@/api/types').WorkspaceResponse[] | undefined} workspaces
 * @param {{ slug?: string | null, id?: string | null }} last
 */
export function resolveLastWorkspace(workspaces, { slug, id } = {}) {
  if (!workspaces?.length) return null
  return (
    workspaces.find((workspace) => workspace.slug === slug) ??
    (id ? workspaces.find((workspace) => workspace.id === id) : undefined) ??
    workspaces[0]
  )
}

/** Slugs viejos por los que ya se recargó el listado (una vez cada uno: si sigue sin estar, no se insiste). */
const refreshedForStaleSlug = new Set()

/**
 * Último workspace abierto (ver resolveLastWorkspace). Fuera de un workspace, como en el perfil o la Bandeja, el menú
 * lateral y la paleta lo usan para sus enlaces. Si el slug guardado no está en el listado (le cambiaron la URL o el
 * listado en caché es viejo), recarga el listado una vez y, encontrado por id, guarda su slug nuevo.
 */
export function useLastWorkspace() {
  const lastWorkspaceSlug = usePreferencesStore((state) => state.lastWorkspaceSlug)
  const lastWorkspaceId = usePreferencesStore((state) => state.lastWorkspaceId)
  const setLastWorkspace = usePreferencesStore((state) => state.setLastWorkspace)
  const queryClient = useQueryClient()
  const { data: workspaces } = useWorkspaces()
  const workspace = resolveLastWorkspace(workspaces, { slug: lastWorkspaceSlug, id: lastWorkspaceId })
  const stale = Boolean(workspaces && lastWorkspaceSlug) && !workspaces.some((item) => item.slug === lastWorkspaceSlug)
  const movedTo = stale && lastWorkspaceId && workspace?.id === lastWorkspaceId ? workspace : null

  useEffect(() => {
    if (!stale || refreshedForStaleSlug.has(lastWorkspaceSlug)) return
    refreshedForStaleSlug.add(lastWorkspaceSlug)
    queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
  }, [stale, lastWorkspaceSlug, queryClient])

  useEffect(() => {
    if (movedTo) setLastWorkspace(movedTo)
  }, [movedTo, setLastWorkspace])

  return workspace
}

export function useLastWorkspaceSlug() {
  return useLastWorkspace()?.slug ?? null
}

/** Consultas propias de un workspace (las del listado de workspaces no). */
const workspaceKeys = (slug) => [
  queryKeys.workspace(slug),
  queryKeys.members(slug),
  queryKeys.invitations(slug),
  queryKeys.projects(slug),
  ['project', slug],
  ['myWork', slug],
  queryKeys.workspaceActivityOf(slug),
  ['search', slug],
]

/**
 * Quita del caché un workspace que el usuario ya no puede abrir (lo eliminó o salió de él): si no, «/»
 * elegiría el listado viejo y lo mandaría de vuelta al mismo workspace.
 *
 * Se llama antes de navegar fuera del workspace. Lo que no se ve se borra enseguida; lo que la página vieja todavía
 * muestra (el workspace, sus proyectos, Mi trabajo) se cancela y se borra recién cuando nadie lo mira: borrarlo antes
 * hacía que la página vieja, al volver a dibujarse antes de irse, lo pidiera de nuevo (y recibiera 403).
 */
export function forgetWorkspace(queryClient, slug) {
  queryClient.setQueryData(queryKeys.workspaces, (list) => list?.filter((workspace) => workspace.slug !== slug))
  forgetQueries(queryClient, workspaceKeys(slug))
  if (usePreferencesStore.getState().lastWorkspaceSlug === slug) {
    usePreferencesStore.getState().setLastWorkspaceSlug(null)
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
  // Notificaciones de ese workspace
  queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll })
}

export function useWorkspace(slug) {
  return useQuery({
    queryKey: queryKeys.workspace(slug),
    queryFn: () => workspacesApi.get(slug),
    enabled: Boolean(slug),
  })
}

/** Workspace de la URL actual (/:slug/...). Solo se usa dentro de WorkspaceLayout, que ya lo cargó. */
export function useCurrentWorkspace() {
  const { slug } = useParams()
  const { data } = useWorkspace(slug)
  return data
}

/** Si el usuario es project manager del workspace de la URL (decide qué acciones se muestran). */
export function useIsManager() {
  return isManager(useCurrentWorkspace()?.myRole)
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: workspacesApi.create,
    onSuccess: (workspace) => {
      queryClient.setQueryData(queryKeys.workspace(workspace.slug), workspace)
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
    },
  })
}

export function useUpdateWorkspace(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => workspacesApi.update(slug, body),
    onSuccess: (workspace) => {
      queryClient.setQueryData(queryKeys.workspace(workspace.slug), workspace)
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
    },
  })
}

/**
 * @param {string} slug
 * @param {{ onGone?: () => void }} [options] `onGone` navega fuera del workspace, justo después de olvidarlo (ver
 *   forgetWorkspace); va aquí y no como callback de `mutate` para que corra aunque la página que lo pidió se desmonte.
 */
export function useDeleteWorkspace(slug, { onGone } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => workspacesApi.remove(slug),
    onSuccess: () => {
      forgetWorkspace(queryClient, slug)
      onGone?.()
    },
  })
}

export function useMembers(slug) {
  return useQuery({
    queryKey: queryKeys.members(slug),
    queryFn: () => workspacesApi.members(slug),
    enabled: Boolean(slug),
  })
}

export function useUpdateMemberRole(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }) => workspacesApi.updateMemberRole(slug, userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members(slug) }),
  })
}

/**
 * @param {string} slug
 * @param {{ onGone?: () => void }} [options] `onGone` corre solo al quitarse a uno mismo (salir), después de
 *   olvidar el workspace (igual que en useDeleteWorkspace).
 */
export function useRemoveMember(slug, { onGone } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId) => workspacesApi.removeMember(slug, userId),
    onSuccess: (_, userId) => {
      // Salir del workspace es quitarse a uno mismo
      if (userId === useSessionStore.getState().user?.id) {
        forgetWorkspace(queryClient, slug)
        onGone?.()
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.members(slug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
      // Sale también de sus proyectos: sus miembros y las tarjetas del inicio (que traen los primeros miembros)
      queryClient.invalidateQueries({ queryKey: ['projectMembers'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(slug) })
      queryClient.invalidateQueries({ queryKey: ['project', slug] })
    },
  })
}

export function useInvitations(slug, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.invitations(slug),
    queryFn: () => invitationsApi.pending(slug),
    enabled: Boolean(slug) && enabled,
  })
}

export function useInvite(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => invitationsApi.invite(slug, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations(slug) }),
  })
}

export function useRevokeInvitation(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId) => invitationsApi.revoke(slug, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invitations(slug) }),
  })
}

export function useInvitationDetails(token) {
  return useQuery({
    queryKey: queryKeys.invitation(token),
    queryFn: () => invitationsApi.details(token),
    enabled: Boolean(token),
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: invitationsApi.accept,
    onSuccess: (workspace) => {
      queryClient.setQueryData(queryKeys.workspace(workspace.slug), workspace)
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
    },
  })
}
