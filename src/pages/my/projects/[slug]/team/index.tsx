import { useContext } from 'react'
import MyTeam from '@/components/MyTeam'
import { ProjectContext } from '@/contexts/ProjectContext'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'

export const MyProjectTeamPage = () => {
	const { t } = useTolgee()

	return (
		<ProtectedProjectLayout title={t('Project Team')}>
			<MyTeam />
		</ProtectedProjectLayout>
	)
}

export default MyProjectTeamPage
