import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { isAdminRole } from '@/lib/permissions'
import { GeneralSettings } from '../components/GeneralSettings'
import { InvitationsSettings } from '../components/InvitationsSettings'
import { MembersSettings } from '../components/MembersSettings'
import { useCurrentWorkspace } from '../hooks'

const TABS = ['general', 'members', 'invitations']

export function WorkspaceSettingsPage() {
  const workspace = useCurrentWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAdmin = isAdminRole(workspace.myRole)
  const requested = searchParams.get('tab')
  const tab = TABS.includes(requested) && (requested !== 'invitations' || isAdmin) ? requested : 'general'

  return (
    <>
      <PageHeader breadcrumbs={[{ label: workspace.name, to: `/${workspace.slug}` }, { label: 'Ajustes' }]} />
      <PageBody>
        <div className="mx-auto max-w-4xl p-4 sm:p-8">
          <h1 className="mb-6 text-2xl font-semibold tracking-tight">Ajustes del workspace</h1>
          <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Miembros</TabsTrigger>
              {isAdmin && <TabsTrigger value="invitations">Invitaciones</TabsTrigger>}
            </TabsList>
            <TabsContent value="general" className="mt-6">
              <GeneralSettings workspace={workspace} />
            </TabsContent>
            <TabsContent value="members" className="mt-6">
              <MembersSettings workspace={workspace} />
            </TabsContent>
            {isAdmin && (
              <TabsContent value="invitations" className="mt-6">
                <InvitationsSettings workspace={workspace} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PageBody>
    </>
  )
}
