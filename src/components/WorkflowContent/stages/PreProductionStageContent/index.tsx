import { useMemo } from 'react'
import { StageProjectsSection } from '@/components/StageProjectsSection'
import { UserSeasonProjectsList } from '@/components/UserSeasonProjectsList'
import { SeasonData } from '@/components/WorkflowContent'
import { Render } from '@9gustin/react-notion-render'
import { ProjectStatus } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Alert, Skeleton } from 'antd'
import axios from 'axios'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const PreProductionStageContent = ({ season }: { season: SeasonData }) => {
	const router = useRouter()
	const stage = useMemo(() => {
		return season?.stages.find((s) => s.isCurrent)
	}, [season])

	const { data: stageContent, isLoading } = useQuery(
		['gamelab-preproduction-content'],
		() => axios.post(`/api/notion/page`, { table: 'gamelab-pipeline', locale: router.locale, pageSlug: stage?.name }),
		{
			enabled: !!stage,
			refetchInterval: false,
			refetchOnWindowFocus: false,
		}
	)

	return (
		<div className={styles.container}>
			<Skeleton active title={false} paragraph={{ rows: 4 }} loading={isLoading}>
				<Render blocks={stageContent?.data} classNames useStyles simpleTitles />
			</Skeleton>

			<UserSeasonProjectsList seasonId={season.id} status={ProjectStatus.Registered} />

			{!!stage && <StageProjectsSection stageId={stage.id} status={ProjectStatus.Approved} />}

			{stage?.isCompleted && (
				<Alert style={{ marginTop: 16 }} type="success" message={<T keyName="projects-currently-being-assessed" />} />
			)}
		</div>
	)
}

export default PreProductionStageContent
