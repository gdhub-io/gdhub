import { useState } from 'react'
import CreateProjectModal from '@/components/modals/CreateProjectModal'
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
		<Space direction="vertical" size={16}>
			<Flex justify="space-between">
				<Title level={2}>
					<T>My Projects</T>
				</Title>

				<Button type="primary" onClick={() => setOpenCreateProjectModal(true)}>
					<Space>Add Project</Space>
				</Button>
			</Flex>

			<Row gutter={[16, 16]} wrap>
				{myProjects?.data?.length > 0 &&
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
											<Text ellipsis type="secondary">
												{myProject.description}
											</Text>
										}
									/>
								</Card>
							</Link>
						</Col>
					))}
			</Row>

			<CreateProjectModal open={openCreateProjectModal} onCancel={() => setOpenCreateProjectModal(false)} />
		</Space>
	)
}
