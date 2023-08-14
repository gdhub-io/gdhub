// import { useState } from 'react'
// import ProjectIdeaModal from '@/components/modals/ProjectIdeaModal'
import { List, Row } from 'antd'
import Head from 'next/head'
import Link from 'next/link'
// import { TbPlus } from 'react-icons/tb'
import useSWR from 'swr'
import { fetcher } from '@/helpers/fetcher'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'

const MyProjectsPage: NextPageWithLayout = () => {
	// const [showProjectIdeaModal, setShowProjectIdeaModal] = useState(false)
	const {
		data: myProjects,
		// mutate: fetchMyProjects,
		// isValidating: isLoadingMyProjects,
	} = useSWR({ url: '/api/my/projects' }, fetcher, { revalidateOnFocus: false })

	// const handleNewProject = () => {
	// 	setShowProjectIdeaModal(true)
	// }

	// const handleSaveProjectIdea = async () => {
	// 	setShowProjectIdeaModal(false)
	// 	await fetchMyProjects()
	// }

	return (
		<>
			<Head>
				<title>Мои проекты</title>
			</Head>
			<Row align="stretch" justify="space-between">
				<h1>Мои проекты</h1>
				{/* <Button type="primary" icon={<TbPlus size={16} />} onClick={handleNewProject}>
					Создать новый
				</Button> */}
			</Row>

			{myProjects?.data?.length > 0 ? (
				<List
					bordered
					dataSource={myProjects.data}
					renderItem={(myProject: any) => (
						<List.Item
							style={{ cursor: 'pointer' }}
							// extra={
							// 	myProject['Cover Image'] ? (
							// 		<Image width={272} height={272 * 0.5625} alt="logo" src={myProject['Cover Image']} />
							// 	) : null
							// }
						>
							<Link href={`/my/projects/${myProject.id}`}>{myProject.Name}</Link>
						</List.Item>
					)}
				/>
			) : (
				<p>У вас нет проектов</p>
			)}

			{/* <ProjectIdeaModal
				seasonId="indie"
				open={showProjectIdeaModal}
				onOk={handleSaveProjectIdea}
				onCancel={() => setShowProjectIdeaModal(false)}
			/> */}
		</>
	)
}

MyProjectsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default MyProjectsPage
