import { useMemo } from 'react'
import { useProjectMembers } from '@/features/projects/hooks'
import { useMembers } from '@/features/workspaces/hooks'
import { roleNameOf } from '@/lib/permissions'

/**
 * Personas que se pueden mencionar en un proyecto (las que reciben el aviso): sus miembros y los project managers
 * del workspace. Cada una con su rol en el workspace, ordenadas por nombre.
 * @returns {(import('@/api/types').UserSummary & { role: 'OWNER' | 'MEMBER', roleName: string })[]}
 */
export function useMentionPeople(slug, projectId) {
  const { data: projectMembers } = useProjectMembers(slug, projectId)
  const { data: workspaceMembers } = useMembers(slug)

  return useMemo(() => {
    const byUser = new Map((workspaceMembers ?? []).map((member) => [member.user.id, member]))
    const people = new Map()
    for (const member of workspaceMembers ?? []) {
      if (member.role === 'OWNER') people.set(member.user.id, { ...member.user, role: 'OWNER', roleName: roleNameOf(member) })
    }
    for (const member of projectMembers ?? []) {
      if (people.has(member.user.id)) continue
      const membership = byUser.get(member.user.id)
      people.set(member.user.id, { ...member.user, role: membership?.role ?? 'MEMBER', roleName: roleNameOf(membership ?? { role: 'MEMBER' }) })
    }
    return [...people.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
  }, [projectMembers, workspaceMembers])
}
