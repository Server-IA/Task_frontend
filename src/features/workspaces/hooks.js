import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { queryKeys } from '@/api/queryKeys'
import { isManager } from '@/lib/permissions'
import { invitationsApi, workspacesApi } from './api'

export function useWorkspaces() {
  return useQuery({ queryKey: queryKeys.workspaces, queryFn: workspacesApi.list })
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
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.workspace(slug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
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

export function useRemoveMember(slug) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId) => workspacesApi.removeMember(slug, userId),
    onSuccess: () => {
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
