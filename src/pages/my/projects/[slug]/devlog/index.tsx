import { DevLogWall } from '@/components/DevLogWall'
import { ProtectedProjectLayout } from '@/layouts/ProtectedProjectLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useRouter } from 'next/router'

const MyProjectPage: NextPageWithLayout = () => {
	const router = useRouter()
	const projectSlug = router.query.slug as string

	return (
		<ProtectedProjectLayout>
			<DevLogWall slug={projectSlug} />
		</ProtectedProjectLayout>
	)
}

export default MyProjectPage
