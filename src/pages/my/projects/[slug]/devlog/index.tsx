import { DevLogWall } from '@/components/DevLogWall'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { NextPageWithLayout } from '@/pages/_app'

const MyProjectPage: NextPageWithLayout = () => {
	return (
		<ProtectedProjectLayout>
			<DevLogWall />
		</ProtectedProjectLayout>
	)
}

export default MyProjectPage
