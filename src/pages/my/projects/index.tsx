// import { useState } from 'react'
// import ProjectModal from '@/components/modals/ProjectModal'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { useQuery } from '@tanstack/react-query'
import { List, Row } from 'antd'
import axios from 'axios'
import Head from 'next/head'
import Link from 'next/link'
// import { TbPlus } from 'react-icons/tb'

const MyProjectsPage: NextPageWithLayout = () => {
	// const [showProjectModal, setShowProjectModal] = useState(false)

	const { data: myProjects } = useQuery(['user-projects'], () => axios.get('/api/user/projects'), {
		refetchOnWindowFocus: false,
	})

	// const handleNewProject = () => {
	// 	setShowProjectModal(true)
	// }

	// const handleSaveProjectIdea = async () => {
	// 	setShowProjectModal(false)
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
					dataSource={myProjects?.data}
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

			{/* <ProjectModal
				seasonId="indie"
				open={showProjectModal}
				onOk={handleSaveProjectIdea}
				onCancel={() => setShowProjectModal(false)}
			/> */}
		</>
	)
}

MyProjectsPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default MyProjectsPage
