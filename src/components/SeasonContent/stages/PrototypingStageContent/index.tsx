import { useMemo } from 'react'
import { SeasonData } from '@/components/SeasonContent'
import { SeasonProjectsSection } from '@/components/SeasonProjectsSection'
import { ProjectStatus, SeasonStreamReport } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Space, Spin, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import styles from './style.module.scss'

const PrototypingStageContent = ({ season }: { season: SeasonData }) => {
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	const { data: reportsDates } = useQuery(
		['season-reports', stage?.id],
		() => axios.get<SeasonStreamReport[]>('/api/season/stream-reports', { params: { stageId: stage?.id } }),
		{ enabled: !!stage, refetchOnWindowFocus: false, staleTime: Infinity }
	)

	// const { data: projects, isValidating: isLoadingProjecIdeas } = useSWR(
	// 	{ url: '/api/season/projects', data: { seasonName: season.name } },
	// 	fetcher
	// )
	// const { data: reportsDates } = useSWR(
	// 	{ url: '/api/season/reports-dates', data: { seasonName: season.Name, stage: stage.Name } },
	// 	fetcher
	// )

	// const { data: seasonReports, isFetching: isLoading } = useQuery(
	// 	['season-reports', season.id],
	// 	() => axios.get<any[]>('/api/season/reports/dates'),
	// 	{
	// 		staleTime: Infinity,
	// 	}
	// )

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<p>
					Ура! У нас сформированы команды. Пора приступать к разработке игр. А именно начнем мы с разрабокти:
					<ul>
						<li>Прототипов игровых механик</li>
						<li>Поиска визуального решения для игры и отрисовка фейкового скриншота (фейкшота)</li>
					</ul>
				</p>
				<p>
					Так же на этом этапе команды начнут рассказывать о своем прогрессе в виде онлайн-отчетов. Информация о
					видеоотчетах будет публиковаться в чате сообщества.
					<ul>
						{reportsDates?.data.map((reportDate, index) => (
							<li key={`report-date-${index}`}>
								{dayjs(reportDate.date).format('LLL')}
								<Typography.Text type="secondary">
									<small>{' ' + dayjs(reportDate.date).format('Z')}</small>
								</Typography.Text>
							</li>
						))}
					</ul>
				</p>
				<p>
					Полезный материал:{' '}
					<Space wrap>
						<Link className="text-link" href="/hub/docs/prototyping-start" target="_blank">
							Разработка прототипа игры
						</Link>
						<Link className="text-link" href="/hub/docs/art-direction-start" target="_blank">
							Разработка визуального решения
						</Link>
						<Link className="text-link" href="/hub/docs/spring-reporting" target="_blank">
							Как готовиться к отчету
						</Link>
					</Space>
				</p>

				<h3>Проекты в разработке</h3>
				{!!stage && <SeasonProjectsSection stageId={stage.id} status={ProjectStatus.Approved} />}
			</Spin>
		</div>
	)
}

export default PrototypingStageContent
