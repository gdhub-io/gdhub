import { useState } from 'react'
import CreateProjectModal from '@/components/modals/CreateProjectModal'
import { UserRole } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Avatar, Button, Card, Col, Flex, Row, Space, Tag, Typography } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const { Title, Text } = Typography

export const MyProjectList = () => {
	const { data: session } = useSession()
	const [openCreateProjectModal, setOpenCreateProjectModal] = useState(false)
	const { data: myProjects } = useQuery(['user-projects'], () => axios.get('/api/user/projects'), {
		refetchOnWindowFocus: false,
	})

	return (
		<Space direction="vertical" size={16} style={{ width: '100%' }}>
			<Flex justify="space-between">
				<Title level={2}>
					<T>My Projects</T>
				</Title>

				{session?.user.roles.includes(UserRole.Author) && (
					<Button type="primary" onClick={() => setOpenCreateProjectModal(true)}>
						<Space>Add Project</Space>
					</Button>
				)}
			</Flex>

			<Row gutter={[16, 16]} wrap>
				{myProjects?.data?.length > 0 ? (
					myProjects?.data.map((myProject: any) => (
						<Col key={myProject.id} xs={24} lg={8}>
							<Link href={`/my/projects/${myProject.slug}`}>
								<Card hoverable>
									<Card.Meta
										avatar={<Avatar shape="square" size="large" src={myProject.coverImage} />}
										title={
											<Flex justify="space-between">
												<Text>{myProject.name}</Text>
												<Tag color="blue">{myProject.stage?.name}</Tag>
											</Flex>
										}
										description={
											myProject.description ? (
												<Text type="secondary">{myProject.description?.slice(0, 100)}...</Text>
											) : null
										}
									/>
								</Card>
							</Link>
						</Col>
					))
				) : (
					<Text type="secondary">
						You don&apos;t have any project yet. Create <span>a new one</span> or join <span>existing ones</span>.
					</Text>
				)}
			</Row>

			<CreateProjectModal open={openCreateProjectModal} onCancel={() => setOpenCreateProjectModal(false)} />
		</Space>
	)
}
