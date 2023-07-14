import { useMemo } from 'react'
import { fetcher } from '@/helpers/fetcher'
import { Avatar, List, Space, Typography } from 'antd'
import useSWR from 'swr'

const { Title } = Typography

interface TeamMembersArgs {
	project: any
}

const TeamMembers = ({ project }: TeamMembersArgs) => {
	const { data: teamMembers } = useSWR({ url: '/api/project/members', data: { projectId: project?.id } }, fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !project?.id,
	})

	const data: any[] = useMemo(() => {
		if (!teamMembers) return undefined

		return teamMembers?.data.map((member: any) => ({
			title: member.Name,
			description: member.Position,
			avatar: member.Avatar,
		}))
	}, [teamMembers])

	if (teamMembers && teamMembers.length == 0) return null

	return (
		<>
			<Space direction="vertical" style={{ marginTop: 60, width: '100%' }}>
				<Title level={5}>Команда</Title>

				<List
					grid={{ gutter: 16, xs: 1, sm: 1, md: 1, column: 2 }}
					itemLayout="horizontal"
					dataSource={data}
					renderItem={(item, index) => (
						<List.Item key={index}>
							<List.Item.Meta
								avatar={<Avatar size={64} src={item.avatar} />}
								title={item.title}
								description={item.description}
							/>
						</List.Item>
					)}
				/>
			</Space>
		</>
	)
}

export default TeamMembers
