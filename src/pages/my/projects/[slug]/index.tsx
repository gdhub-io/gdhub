import { DevLogWall } from '@/components/DevLogWall'
import { useCurrentProject } from '@/hooks/project'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { useTolgee } from '@tolgee/react'

export const MyProjectHomePage = () => {
	const { t } = useTolgee()
	const { project } = useCurrentProject()

	return <ProtectedProjectLayout>{!!project && <DevLogWall slug={project.slug} />}</ProtectedProjectLayout>
}

export default MyProjectHomePage
