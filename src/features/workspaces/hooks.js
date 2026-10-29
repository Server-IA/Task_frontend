import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { queryKeys } from '@/api/queryKeys'
import { isManager } from '@/lib/permissions'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { invitationsApi, workspacesApi } from './api'

export function useWorkspaces() {
  return useQuery({ queryKey: queryKeys.workspaces, queryFn: workspacesApi.list })
}

/**
 * Último workspace abierto, solo si el usuario sigue siendo miembro (fuera de un workspace, como en el
 * perfil o la Bandeja, el menú lateral y la paleta lo usan para sus enlaces).
 */
export function useLastWorkspaceSlug() {
  const lastWorkspaceSlug = usePreferencesStore((state) => state.lastWorkspaceSlug)
  const { data: workspaces } = useWorkspaces()
  if (!lastWorkspaceSlug || !workspaces) return null
  return workspaces.some((workspace) => workspace.slug === lastWorkspaceSlug) ? lastWorkspaceSlug : null
}

/**
 * Quita del caché un workspace que el usuario ya no puede abrir (lo eliminó o salió de él) antes de
 * navegar: si no, «/» elegiría el listado viejo y lo mandaría de vuelta al mismo workspace.
 */
export function forgetWorkspace(queryClient, slug) {
  queryClient.setQueryData(queryKeys.workspaces, (list) => list?.filter((workspace) => workspace.slug !== slug))
  for (const key of [
    queryKeys.workspace(slug),
    queryKeys.members(slug),
    queryKeys.invitations(slug),
    queryKeys.projects(slug),
    ['project', slug],
    ['myWork', slug],
    queryKeys.workspaceActivityOf(slug),
    ['search', slug],
  ]) {
    queryClient.removeQueries({ queryKey: key })
  }
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

export function useDeleteWorkspace(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => workspacesApi.remove(slug),
    onSuccess: () => forgetWorkspace(queryClient, slug),
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

export function useRemoveMember(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId) => workspacesApi.removeMember(slug, userId),
    onSuccess: (_, userId) => {
      // Salir del workspace es quitarse a uno mismo
      if (userId === useSessionStore.getState().user?.id) {
        forgetWorkspace(queryClient, slug)
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.members(slug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
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
