import { useMemo } from 'react'
import { StageProjectsSection } from '@/components/StageProjectsSection'
import { SeasonData } from '@/components/WorkflowContent'
import { Render } from '@9gustin/react-notion-render'
import { ProjectStatus, SeasonStreamReport } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Skeleton, Spin, Typography } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import styles from './style.module.scss'

const PrototypingStageContent = ({ season }: { season: SeasonData }) => {
	const { getLanguage } = useTolgee()
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	const { data: reportsDates } = useQuery(
		['season-reports', stage?.id],
		() => axios.get<SeasonStreamReport[]>('/api/season/stream-reports', { params: { stageId: stage?.id } }),
		{ enabled: !!stage, refetchOnWindowFocus: false, staleTime: Infinity }
	)

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-recruiting-content'],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', locale: getLanguage(), pageSlug: stage?.name }),
		{
			enabled: !!stage,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	return (
		<div className={styles.container}>
			<Spin spinning={!season}>
				<Skeleton active title={false} paragraph={{ rows: 4 }} loading={isLoading}>
					<Render blocks={stageContent?.data} classNames useStyles simpleTitles />
				</Skeleton>

				{!!reportsDates?.data.length && (
					<>
						<h3>
							<T>Reporting days</T>
						</h3>
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
					</>
				)}

				{!!stage && <StageProjectsSection stageId={stage.id} status={ProjectStatus.Approved} />}
			</Spin>
		</div>
	)
}

export default PrototypingStageContent
