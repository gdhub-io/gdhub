import { useMemo, useState } from 'react'
import { UserSeasonProjectsList } from '@/components/UserSeasonProjectsList'
import { SeasonData } from '@/components/WorkflowContent'
import { hasRole } from '@/helpers/user'
import { Render } from '@9gustin/react-notion-render'
import { ProjectStatus, UserRole } from '@prisma/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Alert, Button, Skeleton, Space, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const SearchingStageContent = ({ season }: { season: SeasonData }) => {
	const router = useRouter()
	const queryClient = useQueryClient()
	const session: any = useSession()
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])
	const [showProjectModal, setShowProjectModal] = useState(false)

	const { data: seasonProjects } = useQuery(
		['season-projects-count', stage?.id],
		() =>
			axios.get<{ count: number }>('/api/season/stage/projects', {
				params: { stageId: stage?.id, status: ProjectStatus.Registered, onlyCount: true },
			}),
		{ enabled: !!stage }
	)

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-searching-content'],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', locale: router.locale, pageSlug: stage?.name }),
		{
			enabled: !!stage,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	const handleAddIdeaClick = () => {
		setShowProjectModal(true)
	}

	const isStageExpired = () => dayjs(stage?.finishedAt).diff() <= 0

	const handleSaveProjectIdea = async () => {
		setShowProjectModal(false)
		queryClient.invalidateQueries(['user-season-projects', season.id])
	}

	return (
		<div className={styles.container}>
			<Spin spinning={!season || isLoading}>
				<Skeleton active title={false} paragraph={{ rows: 4 }} loading={isLoading}>
					<Render blocks={stageContent?.data} classNames useStyles simpleTitles />
				</Skeleton>
				<Space wrap>
					{!isStageExpired() && (
						<Button type="primary" onClick={handleAddIdeaClick}>
							<T keyName="add-new-concept" />
						</Button>
					)}

					{hasRole(UserRole.Mentor, session) && (
						<Link href={`/${season.slug}/projects`}>
							<Button>
								<T keyName="concept-list" />
							</Button>
						</Link>
					)}

					{seasonProjects?.data && seasonProjects?.data.count > 0 && (
						<span className="additional-info">
							<T keyName="users-proposed-concepts-total" params={{ total: seasonProjects.data.count }} />
						</span>
					)}
				</Space>

				{isStageExpired() && (
					<Alert
						type="success"
						message={
							<T keyName="stage-expired">
								At the moment, the reception of ideas is completed.Mentors on the game design are discussing the
								presented ideas, communicate with their authors.At the end of the discussion, a list of projects that
								will go further to the stage will be determined Project preparation
							</T>
						}
					/>
				)}

				{!isStageExpired() && <UserSeasonProjectsList seasonId={season.id} status={ProjectStatus.Registered} />}
			</Spin>
		</div>
	)
}

export default SearchingStageContent
