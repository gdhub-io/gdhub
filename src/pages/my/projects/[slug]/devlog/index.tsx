import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { List } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'

const MyProjectsPage: NextPageWithLayout = () => {
	const { t } = useTolgee()

	const { data: myProjects } = useQuery(['user-projects'], () => axios.get('/api/user/projects'), {
		refetchOnWindowFocus: false,
	})

	return (
		<ProtectedLayout title={t('My Projects')}>
			{myProjects?.data?.length > 0 ? (
				<List
					bordered
					dataSource={myProjects?.data}
					renderItem={(myProject: any) => (
						<List.Item
							style={{ cursor: 'pointer' }}
							extra={
								myProject.coverImage ? (
									<Image width={272} height={272 * 0.5625} alt="logo" src={myProject.coverImage} />
								) : null
							}
						>
							<Link href={`/my/projects/${myProject.slug}`}>{myProject.name}</Link>
						</List.Item>
					)}
				/>
			) : (
				<p>
					<T>You have no projects</T>
				</p>
			)}
		</ProtectedLayout>
	)
}

export default MyProjectsPage
