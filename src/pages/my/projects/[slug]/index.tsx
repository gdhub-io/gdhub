import { DevLogWall } from '@/components/DevLogWall'
import { useCurrentProject } from '@/hooks/project'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { Spin } from 'antd'

const MyProjectPage: NextPageWithLayout = () => {
	const { project, isLoading } = useCurrentProject()

	return (
		<ProtectedProjectLayout>
			<Spin spinning={isLoading}>
				<DevLogWall project={project} />
			</Spin>
		</ProtectedProjectLayout>
	)
}

export default MyProjectPage
