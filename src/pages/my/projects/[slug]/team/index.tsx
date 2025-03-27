import { useContext } from 'react'
import MyTeam from '@/components/MyTeam'
import UserTeam from '@/components/UserTeam'
import { ProjectContext } from '@/contexts/ProjectContext'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'

export const MyProjectTeamPage = () => {
	const { t } = useTolgee()
	const contextProject = useContext(ProjectContext)?.contextProject

	return (
		<ProtectedProjectLayout title={t('Project Team')}>
			{contextProject?.isProjectAuthor ? <MyTeam /> : <UserTeam />}
		</ProtectedProjectLayout>
	)
}

export default MyProjectTeamPage
