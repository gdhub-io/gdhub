import { useMemo, useState } from 'react'
import ProjectModal from '@/components/modals/ProjectModal'
import { SeasonData } from '@/components/SeasonContent'
import { UserSeasonProjectsList } from '@/components/UserSeasonProjectsList'
import { hasRole } from '@/helpers/user'
import { ProjectStatus, UserRole } from '@prisma/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Grid, Space, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './style.module.scss'

const SearchingStageContent = ({ season }: { season: SeasonData }) => {
	const screens = Grid.useBreakpoint()
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
			<Spin spinning={!season}>
				<p>
					<strong>Стань геймдизайнером/автором нового проекта!</strong> Исследуй тренды, генерируй идеи, анализируй
					существующие игры. Лучшие свои идеи игр регистрируй нажав кнопку &quot;Добавить идею игры&quot;
				</p>
				<p>
					Полезный материал:{' '}
					<Link href="/hub/docs/work-with-ideas" target="_blank">
						Работа с идеями
					</Link>
					,{' '}
					<Link
						href="https://docs.google.com/document/d/1O99XaTb__f3rL8biPGDEf4H6U7xKQKQag5oWCp3ljhk/edit?usp=sharing"
						target="_blank"
					>
						Шаблон документа для описания идеи
					</Link>
				</p>
				<Space wrap>
					{!isStageExpired() && (
						<Button type="primary" onClick={handleAddIdeaClick}>
							Добавить идею игры
						</Button>
					)}

					{hasRole(UserRole.Mentor, session) && (
						<Link href={`/${season.slug}/projects`}>
							<Button>Список идей</Button>
						</Link>
					)}

					{seasonProjects?.data && seasonProjects?.data.count > 3 && (
						<span className="additional-info">Всего участники предложили {seasonProjects.data.count} идей</span>
					)}

					{isStageExpired() && (
						<Alert
							type="success"
							message="На данный момент прием идей завершен. Менторы по геймдизайну обсуждают поданные идеи, общаются с их авторами. По окончании
							обсуждений будет определен список проектов, которые пойдут далее на этап подготовки проекта"
						/>
					)}
				</Space>

				{!isStageExpired() && <UserSeasonProjectsList seasonId={season.id} status={ProjectStatus.Registered} />}

				<ProjectModal
					seasonId={season.id}
					open={showProjectModal}
					onOk={handleSaveProjectIdea}
					onCancel={() => setShowProjectModal(false)}
				/>
			</Spin>
		</div>
	)
}

export default SearchingStageContent
