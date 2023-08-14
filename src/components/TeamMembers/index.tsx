import { useMemo } from 'react'
import { ProjectTeam, TeamMember, User } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Avatar, List, Space, Typography } from 'antd'
import axios from 'axios'

const { Title } = Typography

interface TeamMembersArgs {
	teamId: string
}

const TeamMembers = ({ teamId }: TeamMembersArgs) => {
	const { data: team } = useQuery(
		['team-members', teamId],
		() =>
			axios.get<ProjectTeam & { members: (TeamMember & { user: User })[] }>('/api/project/team', {
				params: { teamId },
			}),
		{
			enabled: !!teamId,
			refetchOnWindowFocus: false,
		}
	)

	const data: { title: string | null; description: string; avatar: string | null }[] | undefined = useMemo(() => {
		if (!team?.data) return []

		return team.data.members.map((member: TeamMember & { user: User }) => ({
			title: member.user.name,
			description: member.position,
			avatar: member.user.image,
		}))
	}, [team])

	if (team && team?.data.members.length == 0) return null

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
